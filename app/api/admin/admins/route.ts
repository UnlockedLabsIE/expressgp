import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// POST /api/admin/admins — invite a new admin user
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, full_name } = await request.json() as {
    email: string;
    full_name: string;
  };

  if (!email?.trim() || !full_name?.trim()) {
    return NextResponse.json({ error: "email and full_name are required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  // Invite the user via Supabase Auth (sends an email invite)
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
  });

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  const newUserId = inviteData.user.id;

  // Insert into admin_users table
  const { error: insertError } = await admin.from("admin_users").insert({
    id: newUserId,
    email: email.toLowerCase().trim(),
    full_name: full_name.trim(),
    is_active: true,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await admin.from("audit_logs").insert({
    action: "admin_invited",
    table_name: "admin_users",
    record_id: newUserId,
    actor_id: user.id,
    actor_type: "admin",
    new_value: { email, full_name },
  });

  return NextResponse.json({ ok: true, id: newUserId });
}
