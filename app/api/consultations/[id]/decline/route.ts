import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// POST /api/consultations/[id]/decline
// Marks the consultation as declined and triggers a Stripe refund if the
// consultation was paid. Consumer Rights Act 2022 requires automatic refund
// when a service cannot be delivered.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Verify the caller is an active GP
  const admin = createAdminSupabaseClient();
  const { data: gp } = await admin
    .from("partner_doctors")
    .select("id, is_active")
    .eq("id", user.id)
    .single();

  if (!gp?.is_active) {
    return NextResponse.json({ error: "Forbidden — GP account inactive" }, { status: 403 });
  }

  const { declineReason, gpNotes } = await req.json() as {
    declineReason: string;
    gpNotes?: string;
  };

  if (!declineReason?.trim()) {
    return NextResponse.json({ error: "declineReason is required" }, { status: 400 });
  }

  // Fetch the consultation to get payment details
  const { data: consultation, error: fetchError } = await admin
    .from("consultations")
    .select("id, status, payment_status, stripe_payment_id, patient_id")
    .eq("id", id)
    .single();

  if (fetchError || !consultation) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  }

  if (!["pending", "under_review", "more_info_required"].includes(consultation.status)) {
    return NextResponse.json({ error: "Consultation cannot be declined in its current state" }, { status: 409 });
  }

  // ── Update consultation status ──────────────────────────────────────────
  const { error: updateError } = await admin
    .from("consultations")
    .update({
      status:         "declined",
      decline_reason: declineReason.trim(),
      doctor_notes:   gpNotes ?? null,
      partner_doctor_id: user.id,
      ...(consultation.payment_status === "paid" ? { stripe_refund_required: true } : {}),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // ── Stripe refund — Consumer Rights Act 2022 ────────────────────────────
  let refundIssued = false;
  let refundId: string | null = null;

  if (
    consultation.payment_status === "paid" &&
    consultation.stripe_payment_id
  ) {
    try {
      // Dynamically import Stripe so the route tree-shakes cleanly if Stripe
      // is not yet configured (STRIPE_SECRET_KEY missing in dev).
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey) {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });

        const refund = await stripe.refunds.create({
          payment_intent: consultation.stripe_payment_id,
          reason: "requested_by_customer",
          metadata: {
            consultation_id: id,
            decline_reason:  declineReason.trim(),
            declined_by_gp:  user.id,
          },
        });

        refundIssued = true;
        refundId = refund.id;

        // Record the refund timestamp
        await admin
          .from("consultations")
          .update({ stripe_refund_issued_at: new Date().toISOString() })
          .eq("id", id);
      }
    } catch (err) {
      // Log but do not block — the decline has already been committed.
      // A background job or admin can chase the refund manually.
      console.error("[decline/refund] Stripe refund failed:", err);
    }
  }

  // ── Audit log ───────────────────────────────────────────────────────────
  await admin.from("audit_logs").insert({
    actor_id:   user.id,
    actor_type: "partner_doctor",
    action:     "consultation_declined",
    table_name: "consultations",
    record_id:  id,
    new_value: {
      decline_reason:   declineReason.trim(),
      refund_issued:    refundIssued,
      refund_id:        refundId,
      payment_status:   consultation.payment_status,
      legal_basis:      "Consumer Rights Act 2022 — automatic refund on service non-delivery",
    },
  });

  return NextResponse.json({
    ok:           true,
    refundIssued,
    refundId,
  });
}
