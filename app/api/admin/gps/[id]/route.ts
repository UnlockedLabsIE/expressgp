import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

type Employment = "employed" | "contracted";

function parseEmployment(v: unknown): Employment | null {
  if (v === "employed" || v === "contracted") return v;
  return null;
}

// PATCH /api/admin/gps/[id] — update GP identity / governance (service role; bypasses GP self-service trigger limits)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: gpId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    first_name?: string;
    last_name?: string;
    email?: string;
    imc_number?: string;
    employment_type?: string;
    is_active?: boolean;
  };

  const admin = createAdminSupabaseClient();

  const { data: current, error: fetchErr } = await admin
    .from("partner_doctors")
    .select("id, first_name, last_name, email, imc_number, employment_type, is_active")
    .eq("id", gpId)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "GP not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.first_name === "string") {
    const v = body.first_name.trim();
    if (!v) return NextResponse.json({ error: "first_name cannot be empty" }, { status: 400 });
    patch.first_name = v;
  }
  if (typeof body.last_name === "string") {
    const v = body.last_name.trim();
    if (!v) return NextResponse.json({ error: "last_name cannot be empty" }, { status: 400 });
    patch.last_name = v;
  }
  if (typeof body.imc_number === "string") {
    const v = body.imc_number.trim();
    if (!v) return NextResponse.json({ error: "imc_number cannot be empty" }, { status: 400 });
    patch.imc_number = v;
  }
  if (typeof body.email === "string") {
    const v = body.email.trim().toLowerCase();
    if (!v) return NextResponse.json({ error: "email cannot be empty" }, { status: 400 });
    patch.email = v;
  }
  if (typeof body.employment_type === "string") {
    const emp = parseEmployment(body.employment_type);
    if (!emp) return NextResponse.json({ error: "employment_type must be employed or contracted" }, { status: 400 });
    patch.employment_type = emp;
  }
  // partner_doctors.is_active: admin-controlled account access. GPs control accepting cases separately (is_accepting_cases).
  if (typeof body.is_active === "boolean") {
    patch.is_active = body.is_active;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const newEmail = typeof patch.email === "string" ? (patch.email as string) : null;
  if (newEmail && newEmail !== current.email) {
    const { data: emailClash } = await admin
      .from("partner_doctors")
      .select("id")
      .eq("email", newEmail)
      .neq("id", gpId)
      .maybeSingle();
    if (emailClash) {
      return NextResponse.json({ error: "Another GP already uses this email." }, { status: 400 });
    }
  }

  if (typeof patch.imc_number === "string") {
    const imc = patch.imc_number as string;
    if (imc !== current.imc_number) {
      const { data: imcClash } = await admin
        .from("partner_doctors")
        .select("id")
        .eq("imc_number", imc)
        .neq("id", gpId)
        .maybeSingle();
      if (imcClash) {
        return NextResponse.json({ error: "Another GP already uses this IMC number." }, { status: 400 });
      }
    }
  }

  const nextEmail = (newEmail ?? current.email) as string;
  if (nextEmail !== current.email) {
    const { error: authEmailErr } = await admin.auth.admin.updateUserById(gpId, { email: nextEmail });
    if (authEmailErr) {
      return NextResponse.json(
        { error: `Auth email update failed: ${authEmailErr.message}. No database changes were saved.` },
        { status: 400 },
      );
    }
  }

  const { error: updateErr } = await admin.from("partner_doctors").update(patch).eq("id", gpId);
  if (updateErr) {
    if (nextEmail !== current.email) {
      await admin.auth.admin.updateUserById(gpId, { email: current.email });
    }
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    action: "gp_record_updated_by_admin",
    table_name: "partner_doctors",
    record_id: gpId,
    actor_id: user.id,
    actor_type: "admin",
    old_value: {
      first_name: current.first_name,
      last_name: current.last_name,
      email: current.email,
      imc_number: current.imc_number,
      employment_type: current.employment_type,
      is_active: current.is_active,
    },
    new_value: patch,
  });

  return NextResponse.json({ ok: true });
}
