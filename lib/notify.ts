/**
 * Patient notification helper.
 *
 * Fires a WhatsApp message AND an email simultaneously to tell the patient
 * they have a new message from their GP. Both channels are fire-and-forget
 * — a failure in one does not affect the other.
 *
 * Email requires RESEND_API_KEY to be set.
 * WhatsApp requires BIRD_WHATSAPP_CHANNEL_ID + BIRD_WORKSPACE_ID to be set.
 * If either is missing the channel is skipped silently (safe placeholder behaviour).
 */

import { Resend } from "resend";
import { sendWhatsApp } from "@/lib/whatsapp";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");
const FROM   = process.env.RESEND_FROM ?? "ExpressGP <notifications@expressgp.ie>";

interface NotifyOptions {
  /** Patient's mobile in E.164 format e.g. "+353871234567" */
  phone?: string | null;
  /** Patient's email address */
  email?: string | null;
  /** Patient's first name for personalisation */
  firstName?: string | null;
}

export async function notifyPatientNewMessage(opts: NotifyOptions): Promise<void> {
  const { phone, email, firstName } = opts;
  const name = firstName ?? "there";

  const whatsappText =
    `ExpressGP: Hi ${name}, you have a new message from your GP. ` +
    `Log in to your dashboard to read it and reply: https://expressgp.ie/dashboard`;

  const emailSubject = "You have a new message from your GP — ExpressGP";
  const emailHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <img src="https://expressgp.ie/logo.png" alt="ExpressGP" width="140" style="margin-bottom:24px" />
      <h2 style="font-size:20px;margin-bottom:8px">New message from your GP</h2>
      <p style="color:#444;line-height:1.6">
        Hi ${name},<br/><br/>
        Your GP has sent you a new message on ExpressGP.
        Please log in to your dashboard to read it and reply.
      </p>
      <a href="https://expressgp.ie/dashboard"
         style="display:inline-block;margin-top:20px;padding:12px 24px;
                background:#0f4c75;color:#fff;border-radius:8px;
                text-decoration:none;font-weight:600">
        View message
      </a>
      <p style="margin-top:32px;font-size:12px;color:#999">
        ExpressGP · Online GP Service · Ireland<br/>
        Please do not reply to this email — use your dashboard to message your GP.
      </p>
    </div>
  `;

  const results = await Promise.allSettled([
    // WhatsApp (no-op if Bird not configured)
    phone
      ? sendWhatsApp(phone, whatsappText)
      : Promise.resolve(),

    // Email via Resend (no-op if key not configured)
    email && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "YOUR_RESEND_API_KEY"
      ? resend.emails.send({
          from: FROM,
          to: email,
          subject: emailSubject,
          html: emailHtml,
        })
      : Promise.resolve(),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[notify] channel failed:", result.reason);
    }
  }
}
