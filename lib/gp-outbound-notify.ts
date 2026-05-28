/**
 * Outbound clinical notifications to partner GPs (red flag, new consultation).
 * Each channel attempt is written to notification_delivery_log via service role.
 */
import { Resend } from "resend";
import { recordGpNotificationDelivery } from "@/lib/gp-notification-delivery";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { sendWhatsApp } from "@/lib/whatsapp";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");
const FROM = process.env.RESEND_FROM ?? "ExpressGP <notifications@expressgp.ie>";

async function tryEmailToGp(opts: {
  doctorId: string;
  to: string;
  subject: string;
  html: string;
  notificationType: string;
  consultationId: string | null;
}): Promise<void> {
  const hasKey = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "YOUR_RESEND_API_KEY");
  if (!hasKey) {
    await recordGpNotificationDelivery({
      doctorId: opts.doctorId,
      notificationType: opts.notificationType,
      channel: "email",
      status: "failed",
      consultationId: opts.consultationId,
      errorMessage: "RESEND_API_KEY not configured",
    });
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      await recordGpNotificationDelivery({
        doctorId: opts.doctorId,
        notificationType: opts.notificationType,
        channel: "email",
        status: "failed",
        consultationId: opts.consultationId,
        errorMessage: error.message,
      });
      return;
    }
    await recordGpNotificationDelivery({
      doctorId: opts.doctorId,
      notificationType: opts.notificationType,
      channel: "email",
      status: "sent",
      consultationId: opts.consultationId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordGpNotificationDelivery({
      doctorId: opts.doctorId,
      notificationType: opts.notificationType,
      channel: "email",
      status: "failed",
      consultationId: opts.consultationId,
      errorMessage: msg,
    });
  }
}

async function tryWhatsAppToGp(opts: {
  doctorId: string;
  phone: string | null;
  body: string;
  notificationType: string;
  consultationId: string | null;
}): Promise<void> {
  if (!opts.phone?.trim()) {
    await recordGpNotificationDelivery({
      doctorId: opts.doctorId,
      notificationType: opts.notificationType,
      channel: "sms",
      status: "failed",
      consultationId: opts.consultationId,
      errorMessage: "No phone on GP profile for WhatsApp alert",
    });
    return;
  }
  try {
    await sendWhatsApp(opts.phone, opts.body);
    await recordGpNotificationDelivery({
      doctorId: opts.doctorId,
      notificationType: opts.notificationType,
      channel: "sms",
      status: "sent",
      consultationId: opts.consultationId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordGpNotificationDelivery({
      doctorId: opts.doctorId,
      notificationType: opts.notificationType,
      channel: "sms",
      status: "failed",
      consultationId: opts.consultationId,
      errorMessage: msg,
    });
  }
}

/**
 * Notify all active, accepting GPs about a pending red-flag consultation.
 * Call from admin API or automation when a consultation enters the queue with red_flag_triggered.
 */
export async function broadcastRedFlagPendingConsultation(consultationId: string): Promise<{ notified: number }> {
  const admin = createAdminSupabaseClient();

  const { data: consult, error: cErr } = await admin
    .from("consultations")
    .select("id, status, patient_id, triage_session:triage_sessions ( red_flag_triggered )")
    .eq("id", consultationId)
    .single();

  if (cErr || !consult) return { notified: 0 };
  const triage = consult.triage_session as { red_flag_triggered?: boolean } | null;
  if (consult.status !== "pending" || !triage?.red_flag_triggered) return { notified: 0 };

  // is_active = admin-valid account; is_accepting_cases = GP chose to take new queue items. Both required to broadcast.
  const { data: doctors } = await admin
    .from("partner_doctors")
    .select("id, email, is_active, is_accepting_cases")
    .eq("is_active", true)
    .eq("is_accepting_cases", true);

  const list = doctors ?? [];
  let notified = 0;

  for (const d of list) {
    const doctorId = String(d.id);
    const email = String(d.email ?? "");
    const subject = "URGENT: Red-flag triage — ExpressGP";
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h2 style="color:#b91c1c">Red flag triage</h2>
        <p>A pending consultation requires urgent clinical review.</p>
        <p><strong>Open the GP dashboard</strong> and review the queue.</p>
        <p style="font-size:12px;color:#666">Consultation ID: ${consultationId}</p>
      </div>`;
    await tryEmailToGp({
      doctorId,
      to: email,
      subject,
      html,
      notificationType: "red_flag",
      consultationId,
    });
    const phone = (d as Record<string, unknown>).phone as string | null | undefined;
    await tryWhatsAppToGp({
      doctorId,
      phone: phone?.trim() ? phone.trim() : null,
      body: `ExpressGP URGENT: Red-flag case in queue. Open your GP dashboard now. Ref: ${consultationId.slice(0, 8)}`,
      notificationType: "red_flag",
      consultationId,
    });
    notified += 1;
  }

  await admin.from("audit_logs").insert({
    action: "gp_red_flag_broadcast",
    table_name: "consultations",
    record_id: consultationId,
    actor_type: "system",
    actor_id: null,
    new_value: { consultation_id: consultationId, gp_targets: list.length },
  });

  return { notified };
}
