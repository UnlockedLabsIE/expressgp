import type {
  Consultation,
  DoctorNotificationPreferences,
  Message,
  NotificationDeliveryLog,
  PartnerDoctor,
  Patient,
  PatientConsent,
  Prescription,
  Document,
  TriageSession,
} from "@/types";
import { createServerSupabaseClient } from "./supabase-server";

// ─── Types returned by queries (joined rows) ─────────────────────────────────

export type ConsultationRow = Consultation & {
  patient: Pick<Patient, "id" | "first_name" | "last_name" | "dob" | "gender" | "phone" | "email" | "address">;
  triage_session: Pick<TriageSession, "ai_recommendation" | "ai_confidence_score" | "red_flag_triggered" | "structured_summary" | "transcript"> | null;
};

export type ConsultationDetail = ConsultationRow & {
  messages: Message[];
  prescriptions: Prescription[];
  documents: Document[];
};

// Pending queue — data minimisation: no patient PII until GP claims the case.
// GDPR Art.5(1)(c) — only the minimum data necessary for triage is shown.
const PENDING_SELECT = `
  id, service_type, service_subtype, status, created_at, symptoms, payment_status,
  triage_session:triage_sessions ( ai_recommendation, ai_confidence_score, red_flag_triggered, structured_summary )
`;

// Assigned cases — full PII visible to the GP who owns the case.
// Also fetches doctor join: is_active = admin account access (not whether they accept new cases).
const ASSIGNED_SELECT = `
  *,
  patient:patients ( id, first_name, last_name, dob, gender, phone, email, address ),
  triage_session:triage_sessions ( ai_recommendation, ai_confidence_score, red_flag_triggered, structured_summary, transcript ),
  doctor:partner_doctors ( id, first_name, last_name, imc_number, is_active )
`;

// ─── Dev-only logger — never emits in production ───────────────────────────
// User/patient IDs must not appear in production log aggregators.
function devLog(label: string, msg: string) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${label}] ${msg}`);
  }
}

// ─── Pending queue — unclaimed cases (status = pending) ───────────────────────
export async function getConsultations(): Promise<ConsultationRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("consultations")
    .select(PENDING_SELECT)
    .eq("status", "pending")
    .order("created_at", { ascending: true }); // oldest first

  if (error) {
    devLog("getConsultations", error.message);
    return [];
  }
  return (data ?? []) as unknown as ConsultationRow[];
}

// ─── All consultations visible to this GP (pending + their own cases) ─────────
export async function getAllConsultations(): Promise<ConsultationRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Pending (unclaimed) uses minimal select — no PII.
  // Cases assigned to this GP use full select.
  const [pending, mine] = await Promise.all([
    supabase
      .from("consultations")
      .select(PENDING_SELECT)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("consultations")
      .select(ASSIGNED_SELECT)
      .eq("partner_doctor_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const combined = [...(pending.data ?? []), ...(mine.data ?? [])];
  // Deduplicate by id (a pending case assigned to this GP would appear in both)
  const seen = new Set<string>();
  const unique = combined.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  // Sort newest first
  unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return unique as unknown as ConsultationRow[];
}

// ─── Active cases — claimed by the current GP (under_review / more_info_required)
export async function getActiveCases(): Promise<ConsultationRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("consultations")
    .select(ASSIGNED_SELECT)
    .in("status", ["under_review", "more_info_required"])
    .eq("partner_doctor_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    devLog("getActiveCases", error.message);
    return [];
  }
  return (data ?? []) as unknown as ConsultationRow[];
}

// ─── Fetch a single consultation with all related data ────────────────────────
// Cross-case prescriptions/documents for the same patient are loaded on the
// consultation detail page (client) so RLS (`shared_clinical_record_rls.sql`) can scope visibility.
export async function getConsultationById(id: string): Promise<ConsultationDetail | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("consultations")
    .select(`
      *,
      patient:patients ( id, first_name, last_name, dob, gender, phone, email, address ),
      triage_session:triage_sessions ( ai_recommendation, ai_confidence_score, red_flag_triggered, structured_summary, transcript ),
      messages ( * ),
      prescriptions ( * ),
      documents ( * )
    `)
    .eq("id", id)
    .single();

  if (error) {
    devLog("getConsultationById", error.message);
    return null;
  }
  return data as unknown as ConsultationDetail;
}

// ─── Fetch the logged-in GP's partner_doctors record ─────────────────────────
// Returns null if the GP does not exist OR is inactive (suspended).
// is_active here filters to employable GPs only — unrelated to is_accepting_cases.
// Callers should treat null as "access denied".
export async function getPartnerDoctor(): Promise<PartnerDoctor | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("partner_doctors")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true) // admin-controlled account status, not "accepting cases"
    .single();

  if (error) {
    devLog("getPartnerDoctor", error.message);
    return null;
  }
  return data as PartnerDoctor;
}

// ─── Fetch notification preferences for the logged-in GP ─────────────────────
export async function getNotificationPreferences(): Promise<DoctorNotificationPreferences | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("doctor_notification_preferences")
    .select("*")
    .eq("doctor_id", user.id)
    .maybeSingle();

  if (error) {
    devLog("getNotificationPreferences", error.message);
    return null;
  }
  return data as DoctorNotificationPreferences | null;
}

/** Last N notification delivery attempts for the logged-in GP (Settings → Notifications). */
export async function getNotificationDeliveryLogForGP(limit = 20): Promise<NotificationDeliveryLog[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notification_delivery_log")
    .select("*")
    .eq("doctor_id", user.id)
    .order("triggered_at", { ascending: false })
    .limit(limit);

  if (error) {
    devLog("getNotificationDeliveryLogForGP", error.message);
    return [];
  }
  return (data ?? []) as NotificationDeliveryLog[];
}

/** True if this GP had a failed red_flag delivery attempt in the last 24 hours (dashboard warning). */
export async function getHasFailedRedFlagNotificationLast24h(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("notification_delivery_log")
    .select("id")
    .eq("doctor_id", user.id)
    .eq("notification_type", "red_flag")
    .eq("status", "failed")
    .gte("triggered_at", since)
    .limit(1);

  if (error) {
    devLog("getHasFailedRedFlagNotificationLast24h", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Latest consent row for a patient (GP dashboard badge); null if none on file. */
export async function getLatestPatientConsentForPatient(patientId: string): Promise<PatientConsent | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("patient_consents")
    .select("*")
    .eq("patient_id", patientId)
    .order("consented_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    devLog("getLatestPatientConsentForPatient", error.message);
    return null;
  }
  return data as PatientConsent | null;
}

// ─── Count unread messages for the logged-in doctor ──────────────────────────
export async function getUnreadMessageCount(): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false)
    .eq("sender_type", "patient");

  if (error) return 0;
  return count ?? 0;
}
