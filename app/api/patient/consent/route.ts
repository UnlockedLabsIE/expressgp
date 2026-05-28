import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { PATIENT_CONSENT_TEXT, PATIENT_CONSENT_VERSION } from "@/lib/patient-consent-text";

/**
 * POST /api/patient/consent — record immutable consent before consultation (GDPR / Medical Council).
 * Body: { agree: true } — server supplies canonical text and version.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { agree?: boolean } | null;
  if (!body?.agree) {
    return NextResponse.json({ error: "You must accept the consent wording (agree: true)." }, { status: 400 });
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const { data: inserted, error } = await supabase
    .from("patient_consents")
    .insert({
      patient_id: user.id,
      consent_version: PATIENT_CONSENT_VERSION,
      consent_text: PATIENT_CONSENT_TEXT,
      ip_address: ip,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[patient/consent]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const admin = createAdminSupabaseClient();
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    actor_type: "patient",
    action: "patient_consent_recorded",
    table_name: "patient_consents",
    record_id: inserted?.id ?? null,
    new_value: {
      consent_version: PATIENT_CONSENT_VERSION,
      patient_id: user.id,
    },
  });

  return NextResponse.json({ ok: true, id: inserted?.id });
}
