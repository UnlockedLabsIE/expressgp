import type { SupabaseClient } from "@supabase/supabase-js";

/** Best-effort audit row for GP-initiated actions (RLS: actor_id must be current user). */
export async function logGpAudit(
  supabase: SupabaseClient,
  params: {
    doctorId: string;
    action: string;
    tableName: string;
    recordId: string;
    newValue?: Record<string, unknown> | null;
  }
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: params.doctorId,
    actor_type: "partner_doctor",
    action: params.action,
    table_name: params.tableName,
    record_id: params.recordId,
    new_value: params.newValue ?? null,
  });
  if (error) console.error("[audit]", error.message);
}
