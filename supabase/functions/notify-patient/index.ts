// Supabase Edge Function — notify-patient
//
// Triggered by a database webhook on consultations UPDATE.
// Sends an email via Resend when status changes to 'approved' or 'declined'.
//
// Runtime: Deno (Supabase Edge Functions)
// Env var required: RESEND_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY env var");
    }

    const payload = await req.json();

    // Supabase database webhooks send { type, table, record, old_record, ... }
    const record = payload.record;
    const oldRecord = payload.old_record;

    if (!record || !oldRecord) {
      return new Response(
        JSON.stringify({ message: "No record in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const newStatus: string = record.status;
    const oldStatus: string = oldRecord.status;

    // Only fire on status transitions to approved or declined.
    if (newStatus === oldStatus) {
      return new Response(
        JSON.stringify({ message: "Status unchanged, skipping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (newStatus !== "approved" && newStatus !== "declined") {
      return new Response(
        JSON.stringify({ message: `Status '${newStatus}' does not trigger email` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const patientId: string = record.patient_id;
    const serviceType: string = (record.service_type ?? "").replace(/_/g, " ");

    // Fetch patient email using the service role key (bypasses RLS).
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("email, first_name")
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      throw new Error(`Could not fetch patient: ${patientError?.message ?? "not found"}`);
    }

    const firstName: string = patient.first_name ?? "there";
    const toEmail: string = patient.email;

    // Build email content based on new status.
    const isApproved = newStatus === "approved";

    const subject = isApproved
      ? "Your ExpressGP request has been approved"
      : "Update on your ExpressGP request";

    const html = isApproved
      ? approvedEmailHtml(firstName, serviceType)
      : declinedEmailHtml(firstName, serviceType);

    // Send via Resend.
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ExpressGP <hello@expressgp.ie>",
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const body = await resendRes.text();
      throw new Error(`Resend API error (${resendRes.status}): ${body}`);
    }

    const resendData = await resendRes.json();

    return new Response(
      JSON.stringify({ message: "Email sent", id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("notify-patient error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function approvedEmailHtml(firstName: string, serviceType: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 20px;border-bottom:3px solid #28A863;">
            <span style="font-size:22px;font-weight:700;color:#2F6FB6;">EXPRESS</span><span style="font-size:22px;font-weight:700;color:#2FB36F;">GP</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#0F2744;">Hi ${escapeHtml(firstName)},</p>
            <p style="margin:0 0 16px;font-size:16px;color:#0F2744;">Good news — your <strong>${escapeHtml(serviceType)}</strong> request has been approved by your GP.</p>
            <p style="margin:0 0 24px;font-size:16px;color:#6B7280;">Your document is now available in your ExpressGP dashboard.</p>
            <a href="https://expressgp.ie/documents" style="display:inline-block;padding:14px 28px;background:#28A863;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:999px;">View my documents</a>
            <p style="margin:24px 0 0;font-size:14px;color:#6B7280;">If you have any questions, reply to this email.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #E5E7EB;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;">ExpressGP · <a href="https://expressgp.ie" style="color:#9CA3AF;">expressgp.ie</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function declinedEmailHtml(firstName: string, serviceType: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 20px;border-bottom:3px solid #2F6FB6;">
            <span style="font-size:22px;font-weight:700;color:#2F6FB6;">EXPRESS</span><span style="font-size:22px;font-weight:700;color:#2FB36F;">GP</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#0F2744;">Hi ${escapeHtml(firstName)},</p>
            <p style="margin:0 0 16px;font-size:16px;color:#0F2744;">Your <strong>${escapeHtml(serviceType)}</strong> request has been reviewed by your GP.</p>
            <p style="margin:0 0 24px;font-size:16px;color:#6B7280;">Unfortunately your GP was unable to approve this request. If you have questions, please contact us at <a href="mailto:hello@expressgp.ie" style="color:#2F6FB6;">hello@expressgp.ie</a>.</p>
            <a href="https://expressgp.ie" style="display:inline-block;padding:14px 28px;background:#2F6FB6;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:999px;">Submit a new request</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #E5E7EB;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;">ExpressGP · <a href="https://expressgp.ie" style="color:#9CA3AF;">expressgp.ie</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
