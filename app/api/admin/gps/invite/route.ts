import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

type Employment = "employed" | "contracted";

function parseEmployment(v: unknown): Employment {
  return v === "employed" || v === "contracted" ? v : "contracted";
}

// POST /api/admin/gps/invite — create Auth user (email invite) + partner_doctors row (id = auth user id)
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    email?: string;
    first_name?: string;
    last_name?: string;
    imc_number?: string;
    employment_type?: string;
  };

  const email = body.email?.trim().toLowerCase() ?? "";
  const first_name = body.first_name?.trim() ?? "";
  const last_name = body.last_name?.trim() ?? "";
  const imc_number = body.imc_number?.trim() ?? "";
  const employment_type = parseEmployment(body.employment_type);

  if (!email || !first_name || !last_name || !imc_number) {
    return NextResponse.json(
      { error: "email, first_name, last_name, and imc_number are required" },
      { status: 400 },
    );
  }

  const admin = createAdminSupabaseClient();

  const { data: emailDup } = await admin.from("partner_doctors").select("id").eq("email", email).maybeSingle();
  if (emailDup) {
    return NextResponse.json({ error: "A GP with this email is already registered." }, { status: 400 });
  }

  const { data: imcDup } = await admin.from("partner_doctors").select("id").eq("imc_number", imc_number).maybeSingle();
  if (imcDup) {
    return NextResponse.json({ error: "This IMC number is already assigned to a GP." }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const redirectTo = site ? `${site}/dashboard` : undefined;

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { first_name, last_name },
    ...(redirectTo ? { redirectTo } : {}),
  });

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  const newUserId = inviteData.user.id;

  const { error: insertError } = await admin.from("partner_doctors").insert({
    id: newUserId,
    first_name,
    last_name,
    email,
    imc_number,
    employment_type,
    is_active: true, // partner_doctors: valid account / dashboard access (admin); not is_accepting_cases
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    action: "gp_invited",
    table_name: "partner_doctors",
    record_id: newUserId,
    actor_id: user.id,
    actor_type: "admin",
    new_value: { email, first_name, last_name, imc_number, employment_type },
  });
  if (auditError) console.error("[gp invite audit]", auditError.message);

  return NextResponse.json({ ok: true, id: newUserId });
}
