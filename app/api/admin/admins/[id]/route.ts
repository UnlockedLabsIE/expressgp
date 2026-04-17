import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// PATCH /api/admin/admins/[id] — toggle is_active on an admin user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Cannot deactivate yourself
  if (id === user.id) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
  }

  const { is_active } = await request.json() as { is_active: boolean };

  const admin = createAdminSupabaseClient();

  const { error } = await admin
    .from("admin_users")
    .update({ is_active })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    action: is_active ? "admin_activated" : "admin_deactivated",
    table_name: "admin_users",
    record_id: id,
    actor_id: user.id,
    actor_type: "admin",
    new_value: { is_active },
  });

  return NextResponse.json({ ok: true });
}
