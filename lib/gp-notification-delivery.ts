/**
 * Inserts a row into notification_delivery_log using the service role.
 * All GP-targeted notification attempts (success or failure) must go through this.
 */
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

/** Matches notification_delivery_log.channel (DB check: email | sms). WhatsApp alerts are logged as sms. */
export type GpNotificationDeliveryChannel = "email" | "sms";
export type GpNotificationDeliveryStatus = "sent" | "failed" | "pending";

export async function recordGpNotificationDelivery(params: {
  doctorId: string;
  notificationType: string;
  channel: GpNotificationDeliveryChannel;
  status: GpNotificationDeliveryStatus;
  consultationId?: string | null;
  errorMessage?: string | null;
  deliveredAt?: string | null;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("notification_delivery_log").insert({
    doctor_id: params.doctorId,
    notification_type: params.notificationType,
    channel: params.channel,
    triggered_at: new Date().toISOString(),
    delivered_at: params.deliveredAt ?? (params.status === "sent" ? new Date().toISOString() : null),
    status: params.status,
    consultation_id: params.consultationId ?? null,
    error_message: params.errorMessage ?? null,
  });
  if (error) console.error("[recordGpNotificationDelivery]", error.message);
}
