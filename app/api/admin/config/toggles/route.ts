import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function PATCH(request: Request) {
  // Verify the caller is an authenticated admin
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as {
    accepting_new_patients?: boolean;
    accepting_new_gps?: boolean;
    maintenance_mode?: boolean;
  };

  const admin = createAdminSupabaseClient();

  // Fetch current toggles
  const { data: current } = await admin
    .from("platform_config")
    .select("value")
    .eq("key", "platform_toggles")
    .single();

  const merged = { ...(current?.value ?? {}), ...body };

  const { error } = await admin
    .from("platform_config")
    .upsert({
      key: "platform_toggles",
      value: merged,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await admin.from("audit_logs").insert({
    action: "config_update",
    table_name: "platform_config",
    record_id: "platform_toggles",
    actor_id: user.id,
    actor_type: "admin",
    new_value: merged,
  });

  return NextResponse.json({ ok: true, value: merged });
}
