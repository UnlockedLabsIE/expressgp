import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as {
    key: "service_pricing" | "gp_revenue_share";
    value: Record<string, number>;
  };

  if (!["service_pricing", "gp_revenue_share"].includes(body.key)) {
    return NextResponse.json({ error: "Invalid config key" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  // Fetch current value and merge (preserves glp1_subtypes etc.)
  const { data: current } = await admin
    .from("platform_config")
    .select("value")
    .eq("key", body.key)
    .single();

  const merged = { ...(current?.value ?? {}), ...body.value };

  const { error } = await admin
    .from("platform_config")
    .upsert({
      key: body.key,
      value: merged,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    action: "config_update",
    table_name: "platform_config",
    record_id: body.key,
    actor_id: user.id,
    actor_type: "admin",
    new_value: merged,
  });

  return NextResponse.json({ ok: true, value: merged });
}
