"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { ConsultationDetail } from "@/lib/queries";
import type { Document, Message, Prescription } from "@/types";

type CaseMeta = { created_at: string; service_type: string | null };
type SiblingConsultation = { id: string; status: string; created_at: string; service_type: string | null };
type ClinicalRxRow = Prescription & { caseCreatedAt: string; caseServiceType: string | null; isThisCase: boolean };
type ClinicalDocRow = Document & { caseCreatedAt: string; caseServiceType: string | null; isThisCase: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string) {
  return new Date(d).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
}
function fmtFull(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + dt.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });
}
function relTime(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function calcAge(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}
function todayStr() { return new Date().toISOString().split("T")[0]; }
function plusDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// ─── Service config ───────────────────────────────────────────────────────────

type DocIssueType = "prescription" | "sick_note" | "medical_cert" | "referral" | "insurance_report" | "none";

const SERVICE_ACTION: Record<string, { label: string; docType: DocIssueType; healthmail: boolean }> = {
  prescription:     { label: "Issue Prescription",  docType: "prescription",     healthmail: true  },
  glp1:             { label: "Issue GLP-1 Script",   docType: "prescription",     healthmail: true  },
  sick_note:        { label: "Issue Sick Note",       docType: "sick_note",        healthmail: false },
  medical_cert:     { label: "Issue Medical Cert",    docType: "medical_cert",     healthmail: false },
  fit_to_fly:       { label: "Issue Fit to Fly Cert", docType: "medical_cert",     healthmail: false },
  fit_to_work:      { label: "Issue Fit to Work Cert",docType: "medical_cert",     healthmail: false },
  referral:         { label: "Issue Referral Letter", docType: "referral",         healthmail: false },
  insurance_report: { label: "Issue Report",          docType: "insurance_report", healthmail: false },
  gp_consultation:  { label: "Approve Consultation",  docType: "none",             healthmail: false },
  corporate:        { label: "Approve",               docType: "none",             healthmail: false },
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  pending:            "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  under_review:       "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/30",
  approved:           "bg-[#22c55e]/15 text-[#bbf7d0] ring-1 ring-[#22c55e]/30",
  declined:           "bg-red-500/15 text-red-200 ring-1 ring-red-500/30",
  more_info_required: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  cancelled:          "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
};

// ─── Small UI components ──────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/35">{label}</span>
      <span className="text-sm text-white/85">{children}</span>
    </div>
  );
}

function Card({ title, children, flags }: { title: string; children: React.ReactNode; flags?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {flags}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function FieldInput({ label, placeholder, value, onChange, type = "text" }: {
  label: string; placeholder?: string; value: string;
  onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none ring-1 ring-white/10 focus:ring-white/25 transition-all [color-scheme:dark]" />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#0f1729] text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-6 animate-pulse">
        <div className="mb-6 h-10 w-64 rounded-xl bg-white/5" />
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">{[1,2,3,4].map(i=><div key={i} className="h-36 rounded-2xl bg-white/5"/>)}</div>
          <div className="space-y-5">{[1,2].map(i=><div key={i} className="h-48 rounded-2xl bg-white/5"/>)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = useMemo(() => createClient(), []);

  const [consult, setConsult]       = useState<ConsultationDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [status, setStatus]         = useState<string>("pending");
  const [gpNotes, setGpNotes]       = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [step, setStep]             = useState<"idle" | "decline" | "more_info" | "issuing" | "done">("idle");
  const [docType, setDocType]       = useState<DocIssueType>("none");
  const [issuing, setIssuing]       = useState(false);
  const [healthmailSent, setHealthmailSent] = useState(false);
  const [moreInfoMsg, setMoreInfoMsg] = useState("");

  const [rx, setRx] = useState({ drug: "", dose: "", frequency: "", duration: "", pharmacy: "" });
  const [cert, setCert] = useState({ type: "sick_note", reason: "", from: todayStr(), to: plusDays(7), notes: "" });
  const [ref, setRef] = useState({ specialty: "", urgency: "routine", info: "" });

  // GP identity (for PDFs) and active status
  const [gpName, setGpName] = useState("Dr. —");
  const [gpImc,  setGpImc]  = useState("IMC-XXXXXX");
  const [gpActive, setGpActive] = useState(true);
  // Re-download callback stored after issue
  const [redownload, setRedownload] = useState<(() => Promise<void>) | null>(null);

  // Video call
  const [videoLoading, setVideoLoading]     = useState(false);
  const [hostRoomUrl, setHostRoomUrl]       = useState<string | null>(null);
  const [patientRoomUrl, setPatientRoomUrl] = useState<string | null>(null);
  const [offerVideo, setOfferVideo]         = useState(false);
  const [upliftAmount, setUpliftAmount]     = useState("20");
  const [videoNote, setVideoNote]           = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const msgEndRef = useRef<HTMLDivElement>(null);

  const [clinicalRx, setClinicalRx] = useState<ClinicalRxRow[]>([]);
  const [clinicalDocs, setClinicalDocs] = useState<ClinicalDocRow[]>([]);
  const [siblingCases, setSiblingCases] = useState<SiblingConsultation[]>([]);

  /** All prescriptions/documents for this patient across consultations (RLS: shared in-platform record). */
  const loadSharedPatientRecord = useCallback(async (patientId: string | undefined, caseId: string) => {
    if (!patientId) {
      setClinicalRx([]);
      setClinicalDocs([]);
      setSiblingCases([]);
      return;
    }
    const { data: cases } = await supabase
      .from("consultations")
      .select("id, status, created_at, service_type")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    const caseList = (cases ?? []) as SiblingConsultation[];
    const meta = new Map<string, CaseMeta>(
      caseList.map((c) => [c.id, { created_at: c.created_at, service_type: c.service_type }]),
    );
    setSiblingCases(caseList.filter((c) => c.id !== caseId));
    const caseIds = caseList.map((c) => c.id);
    if (caseIds.length === 0) {
      setClinicalRx([]);
      setClinicalDocs([]);
      return;
    }

    const [{ data: rxs }, { data: docs }] = await Promise.all([
      supabase.from("prescriptions").select("*").in("consultation_id", caseIds).order("created_at", { ascending: false }),
      supabase.from("documents").select("*").in("consultation_id", caseIds).order("created_at", { ascending: false }),
    ]);

    const enrichRx = (rows: Prescription[] | null): ClinicalRxRow[] =>
      (rows ?? []).map((row) => {
        const m = meta.get(row.consultation_id);
        return {
          ...row,
          caseCreatedAt: m?.created_at ?? "",
          caseServiceType: m?.service_type ?? null,
          isThisCase: row.consultation_id === caseId,
        };
      });

    const enrichDoc = (rows: Document[] | null): ClinicalDocRow[] =>
      (rows ?? []).map((row) => {
        const m = meta.get(row.consultation_id);
        return {
          ...row,
          caseCreatedAt: m?.created_at ?? "",
          caseServiceType: m?.service_type ?? null,
          isThisCase: row.consultation_id === caseId,
        };
      });

    setClinicalRx(enrichRx(rxs));
    setClinicalDocs(enrichDoc(docs));
  }, [supabase]);

  // ── Fetch + auto-claim ────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
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

      if (error || !data) { setLoading(false); return; }

      setConsult(data as ConsultationDetail);
      setStatus(data.status);
      setMessages((data.messages as Message[]) ?? []);
      setGpNotes(data.doctor_notes ?? "");

      // Pre-fill document forms from patient data
      setCert((c) => ({
        ...c,
        reason: data.symptoms ?? "",
        type: data.service_subtype ?? "sick_note",
      }));
      setRef((r) => ({
        ...r,
        specialty: data.service_subtype ?? "",
        info: data.symptoms ?? "",
      }));

      // Reflect existing decision in UI
      if (["approved", "declined", "more_info_required"].includes(data.status)) {
        setStep("done");
      }

      // Do NOT auto-claim — GP must explicitly claim the case

      // Fetch GP details for PDFs and active-status gate
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: gp } = await supabase
          .from("partner_doctors")
          .select("first_name, last_name, imc_number, is_active, default_pharmacy_name, default_pharmacy_address")
          .eq("id", user.id)
          .single();
        if (gp?.first_name) setGpName(`Dr. ${gp.first_name}${gp.last_name ? ` ${gp.last_name}` : ""}`.trim());
        if (gp?.imc_number) setGpImc(gp.imc_number);
        if (gp?.is_active === false) setGpActive(false);

        const pharmacyDefault = [gp?.default_pharmacy_name, gp?.default_pharmacy_address].filter(Boolean).join(", ");
        if (pharmacyDefault) {
          setRx((r) => (r.pharmacy ? r : { ...r, pharmacy: pharmacyDefault }));
        }

        // ISO 27001 — every clinical data VIEW must be audit-logged
        void supabase.from("audit_logs").insert({
          actor_id:   user.id,
          actor_type: "partner_doctor",
          action:     "clinical_data_viewed",
          table_name: "consultations",
          record_id:  id,
          new_value:  { consultation_id: id, patient_id: data.patient_id ?? null },
        });
      }

      await loadSharedPatientRecord(data.patient_id ?? undefined, id);

      setLoading(false);
    }
    load();
  }, [id, loadSharedPatientRecord]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time messages ────────────────────────────────────────────────────

  useEffect(() => {
    const ch = supabase.channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `consultation_id=eq.${id}` },
        (payload) => {
          setMessages((p) => [...p, payload.new as Message]);
          setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send message ──────────────────────────────────────────────────────────

  async function sendMsg(text?: string) {
    const body = (text ?? msgInput).trim();
    if (!body) return;
    setMsgInput("");
    await supabase.from("messages").insert({
      consultation_id: id,
      sender_type: "partner_doctor",
      body,
      is_read: false,
    });
    // Notify patient via WhatsApp + email (fire-and-forget, non-blocking)
    notifyPatient();
  }

  /** Pings the patient via WhatsApp + email to check their dashboard.
   *  Both channels are no-ops until configured — safe to call at any time. */
  function notifyPatient() {
    if (!consult?.patient) return;
    const { phone, email, first_name } = consult.patient;
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, email, firstName: first_name }),
    }).catch((err) => console.error("[notify] failed:", err));
  }

  /** Fire-and-forget WhatsApp message to the patient with custom body
   *  (used for video call offers where the message content differs from
   *  the standard "new message" notification). */
  async function sendWhatsAppToPatient(body: string) {
    const phone = consult?.patient?.phone;
    if (!phone) return;
    try {
      await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, body }),
      });
    } catch (err) {
      console.error("[WhatsApp] failed to send:", err);
    }
  }

  // ── GP notes auto-save (on blur) ──────────────────────────────────────────

  async function saveNotes() {
    await supabase.from("consultations").update({ doctor_notes: gpNotes }).eq("id", id);
  }

  // ── Start Whereby video call ───────────────────────────────────────────────

  async function startVideoCall() {
    setVideoLoading(true);
    try {
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: id }),
      });
      const data = await res.json() as { hostRoomUrl: string; roomUrl: string };
      setHostRoomUrl(data.hostRoomUrl);
      setPatientRoomUrl(data.roomUrl);
      const videoMsg = `Your GP is ready for your video consultation. Join here: ${data.roomUrl}`;
      await sendMsg(videoMsg);
      await sendWhatsAppToPatient(`ExpressGP: Your GP is ready for your video call. Join here: ${data.roomUrl}`);
    } finally {
      setVideoLoading(false);
    }
  }

  // ── Decline — calls API route which handles Stripe refund (Consumer Rights Act 2022)

  async function handleDecline() {
    if (!declineReason.trim()) return;
    const res = await fetch(`/api/consultations/${id}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ declineReason, gpNotes }),
    });
    if (!res.ok) {
      console.error("[handleDecline] API error", await res.text());
      return;
    }
    await sendMsg(`Your consultation has been declined. Reason: ${declineReason}`);
    setStatus("declined");
    setStep("done");
  }

  // ── Request more info ─────────────────────────────────────────────────────

  async function handleMoreInfo() {
    if (!moreInfoMsg.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("consultations").update({
      status: "more_info_required",
      doctor_notes: gpNotes,
      partner_doctor_id: user?.id,
    }).eq("id", id);
    await sendMsg(moreInfoMsg);
    setStatus("more_info_required");
    setStep("done");
  }

  // ── Issue document / approve ──────────────────────────────────────────────

  async function handleIssue() {
    setIssuing(true);
    try {
      const issuedAt = new Date().toISOString();
      const patient  = consult!.patient!;
      const patientName = `${patient.first_name} ${patient.last_name}`;

      if (docType === "prescription") {
        await supabase.from("prescriptions").insert({
          consultation_id: id,
          medication: rx.drug,
          dosage: rx.dose,
          frequency: rx.frequency,
          duration: rx.duration,
          pharmacy_name: rx.pharmacy,
          issued_at: issuedAt,
        });
      } else if (docType === "referral") {
        await supabase.from("documents").insert({
          consultation_id: id,
          type: "referral_letter",
          content: JSON.stringify({ specialty: ref.specialty, urgency: ref.urgency, clinical_info: ref.info }),
          issued_at: issuedAt,
        });
      } else if (["sick_note", "medical_cert", "insurance_report"].includes(docType)) {
        const typeMap: Record<string, string> = {
          sick_note: "sick_note", medical_cert: "medical_cert", insurance_report: "insurance_report",
        };
        await supabase.from("documents").insert({
          consultation_id: id,
          type: typeMap[docType] ?? "other",
          content: JSON.stringify({ reason: cert.reason, from: cert.from, to: cert.to, notes: cert.notes }),
          issued_at: issuedAt,
        });
      }

      await supabase.from("consultations").update({
        status: "approved",
        doctor_notes: gpNotes,
      }).eq("id", id);

      await sendMsg("Your consultation has been reviewed and approved. Please check your dashboard for your document.");

      // Build PDF download function based on doc type
      const buildDownload = async () => {
        const common = { patientName, dob: patient.dob ?? "", address: patient.address ?? "", consultationId: id, gpName, imcNumber: gpImc, issuedAt };
        if (docType === "prescription") {
          const { downloadPrescription } = await import("@/lib/pdf/generate");
          await downloadPrescription({ ...common, drug: rx.drug, dose: rx.dose, frequency: rx.frequency, duration: rx.duration, pharmacy: rx.pharmacy });
        } else if (docType === "referral") {
          const { downloadReferral } = await import("@/lib/pdf/generate");
          await downloadReferral({ ...common, specialty: ref.specialty, urgency: ref.urgency as "routine"|"urgent"|"emergency", clinicalInfo: ref.info });
        } else if (docType === "sick_note") {
          const { downloadSickNote } = await import("@/lib/pdf/generate");
          await downloadSickNote({ ...common, fromDate: cert.from, toDate: cert.to });
        } else {
          const { downloadMedicalCert } = await import("@/lib/pdf/generate");
          await downloadMedicalCert({ ...common, certType: (docType as "medical_cert"|"insurance_report") ?? "medical_cert", fromDate: cert.from, toDate: cert.to, notes: cert.notes });
        }
      };

      // Trigger immediate download then store for re-download
      await buildDownload();
      setRedownload(() => buildDownload);

      setStatus("approved");
      setStep("done");
      await loadSharedPatientRecord(consult!.patient_id ?? undefined, id);
    } finally {
      setIssuing(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return <Skeleton />;
  if (!consult) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1729] text-white/50">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">Consultation not found</p>
          <p className="mt-1 text-sm">The ID <code className="font-mono">{id}</code> does not exist or you don&apos;t have access.</p>
          <Link href="/dashboard/consultations" className="mt-4 inline-block rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15">Back to queue</Link>
        </div>
      </div>
    );
  }

  if (!gpActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1729]">
        <div className="max-w-md rounded-2xl bg-red-500/10 p-8 text-center ring-1 ring-red-500/30">
          <p className="text-base font-bold text-red-300">Account suspended</p>
          <p className="mt-2 text-sm text-white/50">Your GP account is currently inactive. You cannot view or action consultations until your account is reactivated by an administrator.</p>
          <p className="mt-4 text-xs text-white/30">Contact support@expressgp.com if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  const svcConfig = SERVICE_ACTION[consult.service_type] ?? { label: "Approve", docType: "none" as DocIssueType, healthmail: false };
  const isRedFlag = consult.triage_session?.red_flag_triggered ?? false;
  const patientName = `${consult.patient.first_name} ${consult.patient.last_name}`;
  const age = calcAge(consult.patient.dob);
  const gender = consult.patient.gender?.charAt(0).toUpperCase() ?? "";
  const aiSummary = consult.triage_session?.ai_recommendation ?? "";
  const aiConfidence = consult.triage_session?.ai_confidence_score ?? null;
  const patientInitials = `${consult.patient.first_name[0] ?? ""}${consult.patient.last_name[0] ?? ""}`.toUpperCase();
  const aiFlags = (() => {
    const s = consult.triage_session?.structured_summary;
    if (!s || typeof s !== "object") return [];
    const f = (s as Record<string, unknown>).flags;
    return Array.isArray(f) ? (f as string[]) : [];
  })();

  const isFinalised = ["approved", "declined"].includes(status);
  void isFinalised; // used via step === "done"

  return (
    <div className="min-h-screen bg-[#0f1729] text-slate-100">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1120]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3">
          <Link href="/dashboard/consultations"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5 text-sm font-medium text-white/60 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Queue
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
            {isRedFlag && (
              <span className="hidden shrink-0 items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-300 ring-1 ring-red-500/40 sm:inline-flex">
                Red flag
              </span>
            )}
            <span className="truncate text-base font-semibold text-white">{patientName}</span>
            {age !== null && <span className="shrink-0 text-sm text-white/40">{age}{gender}</span>}
            <span className="hidden text-white/20 sm:block">·</span>
            <span className="hidden shrink-0 font-mono text-xs text-white/40 sm:block">{id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {/* Payment status — GPs should not action unpaid cases */}
            {consult.payment_status === "unpaid" && (
              <span className="hidden shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-500/25 sm:inline-flex">
                ⚠ Unpaid
              </span>
            )}
            {consult.payment_status === "paid" && (
              <span className="hidden shrink-0 items-center rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-300 ring-1 ring-green-500/20 sm:inline-flex">
                Paid
              </span>
            )}
            <span className={`hidden rounded-full px-2.5 py-1 text-xs font-medium capitalize sm:inline-flex ${STATUS_BADGE[status] ?? STATUS_BADGE.pending}`}>
              {status.replace(/_/g, " ")}
            </span>
            <span className="hidden text-xs text-white/40 sm:block">Submitted {fmtFull(consult.created_at)}</span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      {/* 999/112 emergency banner — IMC Rule 5 / Medical Council guidance */}
      {isRedFlag && (
        <div className="border-b border-red-500/40 bg-red-950/60 px-5 py-3">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <svg className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p className="text-sm font-bold text-red-300">Emergency indicators detected — do not delay emergency care</p>
              <p className="mt-0.5 text-xs text-red-200/70">If this patient may be in immediate danger, call <strong className="text-red-200">999 or 112</strong> now. Advise the patient to contact emergency services before completing this consultation.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl gap-5 px-5 py-6 lg:grid lg:grid-cols-[1fr_390px]">

        {/* LEFT */}
        <div className="min-w-0 space-y-5">

          {/* Patient details */}
          <Card title="Patient details">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              <Field label="Full name">{patientName}</Field>
              <Field label="Date of birth">
                {consult.patient.dob
                  ? new Date(consult.patient.dob).toLocaleDateString("en-IE", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : "—"}
              </Field>
              <Field label="Age / Sex">{age ?? "—"} · {consult.patient.gender ? consult.patient.gender.charAt(0).toUpperCase() + consult.patient.gender.slice(1) : "—"}</Field>
              <Field label="Phone">
                {consult.patient.phone
                  ? <a href={`tel:${consult.patient.phone}`} className="hover:text-white transition-colors">{consult.patient.phone}</a>
                  : "—"}
              </Field>
              <Field label="Email">
                {consult.patient.email
                  ? <a href={`mailto:${consult.patient.email}`} className="hover:text-white transition-colors">{consult.patient.email}</a>
                  : "—"}
              </Field>
              <Field label="Address">{consult.patient.address ?? "—"}</Field>
            </div>
          </Card>

          {/* AI triage */}
          <div className={`rounded-2xl ring-1 ${isRedFlag ? "bg-red-500/[0.06] ring-red-500/30" : "bg-white/[0.04] ring-white/10"}`}>
            <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 ${isRedFlag ? "border-red-500/25" : "border-white/10"}`}>
              <h2 className="text-sm font-semibold text-white">AI triage</h2>
              {aiConfidence !== null && (
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-white/40">Confidence</span>
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${aiConfidence >= 85 ? "bg-[#22c55e]" : aiConfidence >= 65 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${aiConfidence}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-white/70">{aiConfidence}%</span>
                </div>
              )}
            </div>
            <div className="space-y-4 px-5 py-4">
              {/* EU AI Act Art.14 — human oversight notice */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5">
                <p className="text-[10px] leading-relaxed text-amber-200/70">
                  <strong className="text-amber-200/90">AI advisory only.</strong> This triage summary is generated by an automated system and must not replace your clinical judgement. Per EU AI Act Article 14, a qualified GP must review and validate all AI-assisted recommendations before any clinical decision is made.
                </p>
              </div>
              {aiSummary ? (
                <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${isRedFlag ? "bg-red-500/10 ring-1 ring-red-500/20" : "bg-[#22c55e]/8 ring-1 ring-[#22c55e]/15"}`}>
                  <svg className={`mt-0.5 h-4 w-4 shrink-0 ${isRedFlag ? "text-red-400" : "text-[#22c55e]"}`} viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${isRedFlag ? "text-red-400" : "text-[#22c55e]"}`}>AI Recommendation</p>
                    <p className={`mt-0.5 text-sm font-medium ${isRedFlag ? "text-red-200" : "text-[#bbf7d0]"}`}>{aiSummary}</p>
                  </div>
                </div>
              ) : (
                <p className="italic text-sm text-white/40">No AI triage summary available.</p>
              )}
              {consult.triage_session?.transcript && (
                <p className="text-sm leading-relaxed text-white/75">{consult.triage_session.transcript}</p>
              )}
              {aiFlags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {aiFlags.map((f) => (
                    <span key={f} className="inline-flex items-center rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300 ring-1 ring-red-500/25">{f}</span>
                  ))}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 px-2.5 py-1 text-xs font-medium text-[#86efac] ring-1 ring-[#22c55e]/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]"/>No red flags detected
                </span>
              )}
            </div>
          </div>

          {consult.symptoms && (
            <Card title="Patient symptoms">
              <p className="text-sm leading-relaxed text-white/75">{consult.symptoms}</p>
            </Card>
          )}

          {consult.patient_notes && (
            <Card title="Patient notes">
              <p className="text-sm leading-relaxed text-white/75">{consult.patient_notes}</p>
            </Card>
          )}

          {/* GP clinical notes */}
          <Card title="GP clinical notes" flags={<span className="text-[10px] text-white/30 uppercase tracking-wider">Private</span>}>
            <textarea
              value={gpNotes}
              onChange={(e) => setGpNotes(e.target.value)}
              onBlur={saveNotes}
              rows={7}
              placeholder="Document clinical reasoning, differential diagnosis, plan, and safety-netting advice…"
              className="w-full resize-none rounded-xl bg-[#080e1c] px-4 py-3 text-sm leading-relaxed text-white placeholder:text-white/25 outline-none ring-1 ring-white/10 focus:ring-white/20 transition-all"
            />
          </Card>

          {(siblingCases.length > 0 || clinicalRx.length > 0 || clinicalDocs.length > 0) && (
            <Card
              title="In-platform record (this patient)"
              flags={<span className="text-[10px] text-white/30 uppercase tracking-wider">ExpressGP · RLS shared access</span>}
            >
              <p className="mb-4 text-xs leading-relaxed text-white/45">
                Prescriptions and documents issued on ExpressGP for this patient, including other consultations you are permitted to view. Messages stay in each case thread.
              </p>
              {siblingCases.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">Other consultations</p>
                  <ul className="space-y-1.5">
                    {siblingCases.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/dashboard/consultations/${c.id}`}
                          className="text-xs text-blue-300/90 underline-offset-2 hover:text-blue-200 hover:underline"
                        >
                          {fmtFull(c.created_at)} · {(c.service_type ?? "").replace(/_/g, " ") || "Case"} · {c.status.replace(/_/g, " ")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {clinicalRx.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">Prescriptions</p>
                  <ul className="space-y-2">
                    {clinicalRx.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs ring-1 ring-white/8"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${row.isThisCase ? "bg-blue-500/20 text-blue-200" : "bg-white/10 text-white/50"}`}>
                            {row.isThisCase ? "This case" : "Other case"}
                          </span>
                          <span className="text-white/55">{fmtFull(row.caseCreatedAt)}</span>
                        </div>
                        <p className="mt-1 font-medium text-white/85">{row.medication}</p>
                        <p className="mt-0.5 text-white/45">
                          {[row.dosage, row.frequency, row.duration].filter(Boolean).join(" · ") || "—"}
                          {row.pharmacy_name ? ` · ${row.pharmacy_name}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {clinicalDocs.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">Documents issued</p>
                  <ul className="space-y-2">
                    {clinicalDocs.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs ring-1 ring-white/8"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${row.isThisCase ? "bg-blue-500/20 text-blue-200" : "bg-white/10 text-white/50"}`}>
                            {row.isThisCase ? "This case" : "Other case"}
                          </span>
                          <span className="text-white/55">{fmtFull(row.caseCreatedAt)}</span>
                        </div>
                        <p className="mt-1 font-medium capitalize text-white/85">{row.type.replace(/_/g, " ")}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* RIGHT */}
        <div className="mt-5 space-y-5 lg:mt-0">

          {/* ── Decision panel ── */}
          <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
            <div className="border-b border-white/10 px-5 py-3">
              <h2 className="text-sm font-semibold text-white">GP decision</h2>
              <p className="mt-0.5 text-xs text-white/40 capitalize">{consult.service_type.replace(/_/g, " ")} · {consult.service_subtype ?? "—"}</p>
            </div>
            <div className="space-y-3 px-5 py-4">

              {/* ── DONE state ── */}
              {step === "done" && (
                <div className="space-y-3">
                  <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 ${
                    status === "approved" ? "bg-[#22c55e]/10 ring-1 ring-[#22c55e]/25" :
                    status === "declined" ? "bg-red-500/10 ring-1 ring-red-500/25" :
                    "bg-amber-500/10 ring-1 ring-amber-500/25"}`}>
                    <svg className={`h-4 w-4 shrink-0 ${status === "approved" ? "text-[#22c55e]" : status === "declined" ? "text-red-400" : "text-amber-400"}`} viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className={`text-sm font-semibold ${status === "approved" ? "text-[#bbf7d0]" : status === "declined" ? "text-red-200" : "text-amber-200"}`}>
                      {status === "approved" ? "Issued & approved" : status === "declined" ? "Declined" : "More info requested — awaiting patient"}
                    </span>
                  </div>
                  {/* Re-download PDF if available */}
                  {redownload && status === "approved" && (
                    <button
                      onClick={() => redownload()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Download PDF
                    </button>
                  )}
                  {/* Post-consultation local GP advisory — IMC / Medical Council guidance */}
                  {status === "approved" && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Remind the patient</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/45">
                        For ongoing primary care, advise the patient to register with a local GP. ExpressGP is a supplementary remote service and does not replace a long-term GP–patient relationship.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── PENDING — not yet claimed ── */}
              {step === "idle" && status === "pending" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-300">Unclaimed</p>
                    <p className="mt-0.5 text-xs text-amber-200/60">Review the case details, then claim it to take action. Claiming assigns it to you and removes it from the shared queue.</p>
                  </div>
                  <button
                    onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;
                      await supabase.from("consultations")
                        .update({ status: "under_review", partner_doctor_id: user.id })
                        .eq("id", id)
                        .eq("status", "pending");
                      setStatus("under_review");
                    }}
                    className="w-full rounded-xl bg-blue-500/15 px-4 py-3 text-sm font-bold tracking-wide text-blue-200 ring-1 ring-blue-500/30 transition-all hover:bg-blue-500/25">
                    Claim this case
                  </button>
                  <Link href="/dashboard/consultations"
                    className="block w-full rounded-xl bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-white/50 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white/80">
                    Leave in queue
                  </Link>
                </div>
              )}

              {/* ── IDLE state — claimed, main action buttons ── */}
              {step === "idle" && (status === "under_review" || status === "more_info_required") && (
                <>
                  {/* Primary: Issue / Approve */}
                  <button
                    onClick={() => { setDocType(svcConfig.docType); setStep("issuing"); }}
                    className="w-full rounded-xl bg-[#22c55e]/10 px-4 py-3 text-sm font-bold tracking-wide text-[#86efac] ring-1 ring-[#22c55e]/30 transition-all hover:bg-[#22c55e]/20">
                    ✓ {svcConfig.label}
                  </button>

                  {/* Decline */}
                  <button
                    onClick={() => setStep("decline")}
                    className="w-full rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold tracking-wide text-red-300 ring-1 ring-red-500/30 transition-all hover:bg-red-500/20">
                    ✕ Decline
                  </button>

                  {/* Request more info */}
                  <button
                    onClick={() => setStep("more_info")}
                    className="w-full rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-bold tracking-wide text-amber-300 ring-1 ring-amber-500/30 transition-all hover:bg-amber-500/20">
                    ? Request more information
                  </button>
                </>
              )}

              {/* ── DECLINE sub-panel ── */}
              {step === "decline" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Reason for declining</label>
                    <textarea
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      rows={4}
                      placeholder="Explain why this consultation cannot be approved. This will be sent to the patient."
                      className="w-full resize-none rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none ring-1 ring-white/10 focus:ring-white/25 transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep("idle")} className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60 ring-1 ring-white/10 hover:bg-white/10">
                      Back
                    </button>
                    <button onClick={handleDecline} disabled={!declineReason.trim()} className="flex-1 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/25 disabled:opacity-40">
                      Confirm decline
                    </button>
                  </div>
                </div>
              )}

              {/* ── MORE INFO sub-panel ── */}
              {step === "more_info" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Message to patient</label>
                    <textarea
                      value={moreInfoMsg}
                      onChange={(e) => setMoreInfoMsg(e.target.value)}
                      rows={4}
                      placeholder="Tell the patient exactly what additional information you need before you can proceed…"
                      className="w-full resize-none rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none ring-1 ring-white/10 focus:ring-white/25 transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep("idle")} className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60 ring-1 ring-white/10 hover:bg-white/10">
                      Back
                    </button>
                    <button onClick={handleMoreInfo} disabled={!moreInfoMsg.trim()} className="flex-1 rounded-xl bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-300 ring-1 ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-40">
                      Send & pause
                    </button>
                  </div>
                </div>
              )}

              {/* ── ISSUING sub-panel ── */}
              {step === "issuing" && (
                <div className="space-y-4">
                  <p className="text-xs text-white/40 italic">Fill in the document details below. Auto-populated from patient data — adjust as needed.</p>

                  {/* Prescription */}
                  {docType === "prescription" && (
                    <div className="space-y-3">
                      <FieldInput label="Medication" placeholder="e.g. Amlodipine 5mg" value={rx.drug} onChange={(v) => setRx((p) => ({...p, drug: v}))} />
                      <FieldInput label="Dosage" placeholder="e.g. 5mg" value={rx.dose} onChange={(v) => setRx((p) => ({...p, dose: v}))} />
                      <FieldInput label="Frequency" placeholder="e.g. Once daily" value={rx.frequency} onChange={(v) => setRx((p) => ({...p, frequency: v}))} />
                      <FieldInput label="Duration" placeholder="e.g. 3 months" value={rx.duration} onChange={(v) => setRx((p) => ({...p, duration: v}))} />
                      <FieldInput label="Dispensing pharmacy" placeholder="e.g. Boots Grafton St" value={rx.pharmacy} onChange={(v) => setRx((p) => ({...p, pharmacy: v}))} />
                      {svcConfig.healthmail && (
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 px-3.5 py-3">
                          <p className="text-xs font-semibold text-blue-300">Healthmail</p>
                          <p className="mt-0.5 text-xs text-blue-200/60">Will be sent automatically to the pharmacy via Healthmail SMTP when issued.</p>
                          <span className="mt-1.5 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/25">Pending GP Healthmail setup</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sick note / Medical cert */}
                  {["sick_note", "medical_cert", "insurance_report"].includes(docType) && (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Certificate type</label>
                        <select value={cert.type} onChange={(e) => setCert((p) => ({...p, type: e.target.value}))}
                          className="w-full rounded-xl bg-[#0f1729] px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/25">
                          <option value="sick_note">Sick Note</option>
                          <option value="medical_cert">Medical Certificate</option>
                          <option value="fit_to_fly">Fit to Fly</option>
                          <option value="fit_to_work">Fit to Work</option>
                          <option value="insurance_report">Insurance Report</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <FieldInput label="Reason" placeholder="e.g. Acute lower back pain" value={cert.reason} onChange={(v) => setCert((p) => ({...p, reason: v}))} />
                      <div className="grid grid-cols-2 gap-3">
                        <FieldInput label="From date" type="date" value={cert.from} onChange={(v) => setCert((p) => ({...p, from: v}))} />
                        <FieldInput label="To date" type="date" value={cert.to} onChange={(v) => setCert((p) => ({...p, to: v}))} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Additional notes</label>
                        <textarea rows={2} value={cert.notes} onChange={(e) => setCert((p) => ({...p, notes: e.target.value}))}
                          className="w-full resize-none rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none ring-1 ring-white/10 focus:ring-white/25" />
                      </div>
                    </div>
                  )}

                  {/* Referral */}
                  {docType === "referral" && (
                    <div className="space-y-3">
                      <FieldInput label="Specialty" placeholder="e.g. Dermatology" value={ref.specialty} onChange={(v) => setRef((p) => ({...p, specialty: v}))} />
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Urgency</label>
                        <select value={ref.urgency} onChange={(e) => setRef((p) => ({...p, urgency: e.target.value}))}
                          className="w-full rounded-xl bg-[#0f1729] px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/25">
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent (2 weeks)</option>
                          <option value="emergency">Emergency (same day)</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/40">Clinical information</label>
                        <textarea rows={4} value={ref.info} onChange={(e) => setRef((p) => ({...p, info: e.target.value}))}
                          placeholder="History, findings, reason for referral…"
                          className="w-full resize-none rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none ring-1 ring-white/10 focus:ring-white/25" />
                      </div>
                    </div>
                  )}

                  {/* Confirm + back */}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setStep("idle")} className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60 ring-1 ring-white/10 hover:bg-white/10">
                      Back
                    </button>
                    <button onClick={handleIssue} disabled={issuing} className="flex-1 rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-bold text-white shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all hover:bg-[#16a34a] disabled:opacity-60">
                      {issuing ? "Issuing…" : `Confirm — ${svcConfig.label}`}
                    </button>
                  </div>
                </div>
              )}

              {/* Healthmail send button — shown after approval of prescription */}
              {step === "done" && status === "approved" && svcConfig.healthmail && (
                <div className="mt-1 rounded-xl border border-blue-500/20 bg-blue-500/8 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold text-blue-300">Send to pharmacy via Healthmail</p>
                  {healthmailSent ? (
                    <span className="text-xs text-[#86efac]">✓ Sent to pharmacy</span>
                  ) : (
                    <button
                      onClick={() => setHealthmailSent(true)}
                      className="w-full rounded-xl bg-blue-500/15 px-3 py-2 text-sm font-semibold text-blue-200 ring-1 ring-blue-500/25 hover:bg-blue-500/25 transition-colors">
                      Send to Healthmail
                      <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">Placeholder</span>
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* ── Video consultation panel ── */}
          <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 overflow-hidden">
            <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Video consultation</h2>
                <p className="mt-0.5 text-xs text-white/40">
                  {consult.video_call_requested ? "Patient has requested a video call" : "Offer a video call uplift to this patient"}
                </p>
              </div>
              {!hostRoomUrl && (
                <div className="flex items-center gap-2">
                  {!consult.video_call_requested && !offerVideo && (
                    <button
                      onClick={() => setOfferVideo(true)}
                      disabled={status === "pending"}
                      className="shrink-0 rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-white/50 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:text-white/80 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Offer video call
                    </button>
                  )}
                  {(consult.video_call_requested || offerVideo) && (
                    <button
                      onClick={startVideoCall}
                      disabled={videoLoading || status === "pending"}
                      className="shrink-0 rounded-xl bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-200 ring-1 ring-blue-500/25 transition-all hover:bg-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {videoLoading ? "Creating room…" : "Start video call"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* GP uplift offer form */}
            {!consult.video_call_requested && offerVideo && !hostRoomUrl && (
              <div className="border-b border-white/10 px-5 py-4 space-y-3">
                <p className="text-xs text-white/50">
                  Set the fee and add a note to the patient explaining why you&apos;d like to speak.
                  This will be sent via the messages thread and emailed to them.
                </p>

                {/* Fee */}
                <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 w-fit">
                  <span className="text-sm text-white/50">€</span>
                  <input
                    type="number"
                    value={upliftAmount}
                    onChange={e => setUpliftAmount(e.target.value)}
                    className="w-16 bg-transparent text-sm text-white outline-none"
                    min="0"
                  />
                  <span className="text-xs text-white/30">video call fee</span>
                </div>

                {/* GP note */}
                <textarea
                  value={videoNote}
                  onChange={e => setVideoNote(e.target.value)}
                  placeholder="Add a note to the patient — e.g. 'I'd like to discuss your symptoms in more detail before prescribing.'"
                  rows={3}
                  className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none ring-1 ring-white/10 focus:ring-white/20 transition-all resize-none"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      const note = videoNote.trim();
                      const msg =
                        `Your GP has reviewed your case and would like to offer a video consultation to discuss further.\n\n` +
                        (note ? `${note}\n\n` : "") +
                        `There is an additional fee of €${upliftAmount} for the video call.\n\n` +
                        `To proceed, please log in to your ExpressGP dashboard to complete payment. ` +
                        `Once payment is confirmed, your booking link will be made available to schedule a time slot.`;
                      await sendMsg(msg);
                      await sendWhatsAppToPatient(
                        `ExpressGP: Your GP would like to offer a video consultation (€${upliftAmount} fee). ` +
                        `Log in to your ExpressGP dashboard to complete payment and book your slot.`
                      );
                      // Save the booking link and fee to the consultation so Fionn
                      // can unlock it on the patient dashboard post-payment
                      await supabase.from("consultations").update({
                        video_call_url: `https://cal.com/expressgp/video-gp-consultation`,
                        video_call_scheduled_at: null, // patient hasn't booked yet
                      }).eq("id", id);
                      setOfferVideo(false);
                      setVideoNote("");
                    }}
                    className="rounded-xl bg-[#22c55e]/10 px-3 py-2 text-xs font-semibold text-[#86efac] ring-1 ring-[#22c55e]/25 transition-all hover:bg-[#22c55e]/20"
                  >
                    Send offer to patient
                  </button>
                  <button onClick={() => { setOfferVideo(false); setVideoNote(""); }} className="text-xs text-white/30 hover:text-white/50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Embedded call or instructions */}
            {hostRoomUrl ? (
              <div>
                <iframe
                  src={`${hostRoomUrl}?embed&floatSelf&skipMediaPermissionPrompt`}
                  allow="camera; microphone; fullscreen; speaker-selection; display-capture"
                  className="w-full"
                  style={{ height: "420px", border: "none" }}
                  title="Video consultation"
                />
                <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                  <p className="text-xs text-white/35">Patient link sent via message</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(patientRoomUrl ?? "")}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Copy patient link
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4">
                <p className="text-xs text-white/25">
                  {consult.video_call_requested
                    ? `Click "Start video call" to open the room. The patient receives their join link via messages automatically.${status === "pending" ? " Claim this case first." : ""}`
                    : `Click "Offer video call" to send the patient an uplift offer, or "Start video call" once they've accepted.`}
                </p>
              </div>
            )}
          </div>

          {/* ── Messages ── */}
          <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
            <div className="border-b border-white/10 px-5 py-3">
              <h2 className="text-sm font-semibold text-white">Messages</h2>
              {status === "more_info_required" && (
                <p className="mt-0.5 text-xs text-amber-300">Awaiting patient reply</p>
              )}
            </div>
            <div className="px-4 py-4">
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {messages.length === 0 && (
                  <p className="py-4 text-center text-xs italic text-white/35">No messages yet.</p>
                )}
                {messages.map((msg, i) => {
                  const isGP = msg.sender_type === "partner_doctor";
                  return (
                    <div key={i} className={`flex gap-2 ${isGP ? "flex-row-reverse" : ""}`}>
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${isGP ? "bg-[#22c55e]/20 text-[#86efac]" : "bg-white/10 text-white/55"}`}>
                        {isGP ? "GP" : patientInitials}
                      </div>
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${isGP ? "rounded-tr-sm bg-[#22c55e]/10 ring-1 ring-[#22c55e]/20" : "rounded-tl-sm bg-white/[0.07] ring-1 ring-white/10"}`}>
                        <p className="leading-relaxed text-white/85">{msg.body}</p>
                        <p className="mt-1 text-[10px] text-white/30">{fmt(msg.created_at)} · {relTime(msg.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={msgEndRef} />
              </div>
              {status === "pending" ? (
                <p className="mt-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-xs text-white/35 text-center">
                  Claim this case to send messages
                </p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                    placeholder="Message patient…"
                    className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none ring-1 ring-white/10 focus:ring-white/20 transition-all"
                  />
                  <button onClick={() => sendMsg()}
                    className="rounded-xl bg-[#22c55e]/15 px-3.5 py-2 text-sm font-semibold text-[#86efac] ring-1 ring-[#22c55e]/25 transition-colors hover:bg-[#22c55e]/25">
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="mx-auto max-w-7xl border-t border-white/10 px-5 py-5">
        <p className="text-xs text-white/30">ExpressGP clinician tools — all decisions are logged and auditable.</p>
      </div>
    </div>
  );
}
