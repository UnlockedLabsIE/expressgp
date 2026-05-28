import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { broadcastRedFlagPendingConsultation } from "@/lib/gp-outbound-notify";

/**
 * POST — notify all active, accepting GPs of a pending red-flag case (clinical governance).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: consultationId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await broadcastRedFlagPendingConsultation(consultationId);

  const admin = createAdminSupabaseClient();
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_type: "admin",
    action: "red_flag_dispatch_requested",
    table_name: "consultations",
    record_id: consultationId,
    new_value: { notified: result.notified },
  });

  return NextResponse.json({ ok: true, ...result });
}
