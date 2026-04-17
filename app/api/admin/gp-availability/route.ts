import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function PATCH(req: NextRequest) {
  // Verify the caller is an authenticated admin
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { gpId, isAccepting } = await req.json();
  if (!gpId || typeof isAccepting !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  const { error } = await admin
    .from("partner_doctors")
    .update({ is_accepting_cases: isAccepting })
    .eq("id", gpId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log the override
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_type: "admin",
    action: "availability_override",
    table_name: "partner_doctors",
    record_id: gpId,
    new_value: { is_accepting_cases: isAccepting },
  });

  return NextResponse.json({ ok: true });
}
