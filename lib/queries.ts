import type { Consultation, Message, Patient, Prescription, Document, TriageSession } from "@/types";
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

const CONSULTATION_SELECT = `
  *,
  patient:patients ( id, first_name, last_name, dob, gender, phone, email, address ),
  triage_session:triage_sessions ( ai_recommendation, ai_confidence_score, red_flag_triggered, structured_summary, transcript )
`;

// ─── Pending queue — unclaimed cases (status = pending) ───────────────────────
export async function getConsultations(): Promise<ConsultationRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("consultations")
    .select(CONSULTATION_SELECT)
    .eq("status", "pending")
    .order("created_at", { ascending: true }); // oldest first

  if (error) {
    console.error("[getConsultations]", error.message);
    return [];
  }
  return (data ?? []) as ConsultationRow[];
}

// ─── Active cases — claimed by the current GP (under_review / more_info_required)
export async function getActiveCases(): Promise<ConsultationRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  console.log("[getActiveCases] user:", user?.id ?? "NO USER");
  if (!user) return [];

  const { data, error } = await supabase
    .from("consultations")
    .select(CONSULTATION_SELECT)
    .in("status", ["under_review", "more_info_required"])
    .eq("partner_doctor_id", user.id)
    .order("updated_at", { ascending: false });

  console.log("[getActiveCases] rows:", data?.length ?? 0, "error:", error?.message ?? "none");
  if (error) {
    console.error("[getActiveCases]", error.message);
    return [];
  }
  return (data ?? []) as ConsultationRow[];
}

// ─── Fetch a single consultation with all related data ────────────────────────
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
    console.error("[getConsultationById]", error.message);
    return null;
  }
  return data as ConsultationDetail;
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
