"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { ConsultationDetail } from "@/lib/queries";
import type { Message } from "@/types";

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
  const supabase = createClient();

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

  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const msgEndRef = useRef<HTMLDivElement>(null);

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

      // Auto-claim if still pending — use .eq guard so two GPs can't both claim
      if (data.status === "pending") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("consultations")
            .update({ status: "under_review", partner_doctor_id: user.id })
            .eq("id", id)
            .eq("status", "pending");
          setStatus("under_review");
        }
      }

      setLoading(false);
    }
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }

  // ── GP notes auto-save (on blur) ──────────────────────────────────────────

  async function saveNotes() {
    await supabase.from("consultations").update({ doctor_notes: gpNotes }).eq("id", id);
  }

  // ── Decline ───────────────────────────────────────────────────────────────

  async function handleDecline() {
    if (!declineReason.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("consultations").update({
      status: "declined",
      decline_reason: declineReason,
      doctor_notes: gpNotes,
      partner_doctor_id: user?.id,
    }).eq("id", id);
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
      if (docType === "prescription") {
        await supabase.from("prescriptions").insert({
          consultation_id: id,
          medication: rx.drug,
          dosage: rx.dose,
          frequency: rx.frequency,
          duration: rx.duration,
          pharmacy_name: rx.pharmacy,
          issued_at: new Date().toISOString(),
        });
      } else if (docType === "referral") {
        await supabase.from("documents").insert({
          consultation_id: id,
          type: "referral_letter",
          content: JSON.stringify({ specialty: ref.specialty, urgency: ref.urgency, clinical_info: ref.info }),
          issued_at: new Date().toISOString(),
        });
      } else if (["sick_note", "medical_cert", "insurance_report"].includes(docType)) {
        const typeMap: Record<string, string> = {
          sick_note: "sick_note", medical_cert: "medical_cert", insurance_report: "insurance_report",
        };
        await supabase.from("documents").insert({
          consultation_id: id,
          type: typeMap[docType] ?? "other",
          content: JSON.stringify({ reason: cert.reason, from: cert.from, to: cert.to, notes: cert.notes }),
          issued_at: new Date().toISOString(),
        });
      }

      await supabase.from("consultations").update({
        status: "approved",
        doctor_notes: gpNotes,
      }).eq("id", id);

      // Notify patient
      await sendMsg("Your consultation has been reviewed and approved. Please check your dashboard for your document.");

      setStatus("approved");
      setStep("done");
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
            <span className={`hidden rounded-full px-2.5 py-1 text-xs font-medium capitalize sm:inline-flex ${STATUS_BADGE[status] ?? STATUS_BADGE.pending}`}>
              {status.replace(/_/g, " ")}
            </span>
            <span className="hidden text-xs text-white/40 sm:block">Submitted {fmtFull(consult.created_at)}</span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mx-auto max-w-7xl gap-5 px-5 py-6 lg:grid lg:grid-cols-[1fr_390px]">

        {/* LEFT */}
        <div className="min-w-0 space-y-5">

          {/* Patient details */}
          <Card title="Patient details">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              <Field label="Full name">{patientName}</Field>
              <Field label="Date of birth">{consult.patient.dob ?? "—"}</Field>
              <Field label="Age / Sex">{age ?? "—"} · {consult.patient.gender ?? "—"}</Field>
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
              )}

              {/* ── IDLE state — main action buttons ── */}
              {step === "idle" && !isFinalised && (
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
