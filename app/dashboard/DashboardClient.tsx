"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ConsultationRow } from "@/lib/queries";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceTypeKey = "prescription" | "sick_note" | "referral" | "medical_cert" | "gp_consultation" | "glp1" | "insurance_report" | "corporate";
type StatTone = "approved" | "pending" | "declined" | "active" | "neutral";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(Math.max(0, diffMs) / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (hrs > 0) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  if (mins > 0) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  return "Just now";
}

function isOverTwoHours(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() > 2 * 60 * 60 * 1000;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ServiceTypeIcon({ type }: { type: ServiceTypeKey }) {
  const cls = "h-4 w-4 shrink-0 text-white/70";
  switch (type) {
    case "prescription":
    case "glp1":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="5" y="9" width="14" height="6" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <line x1="12" y1="11" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "sick_note":
    case "medical_cert":
    case "insurance_report":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "referral":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 12h12m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 10c0-2 3-4 6-4s6 2 6 4v2a4 4 0 0 1-4 4h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="18" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
}

function toneClasses(tone: StatTone) {
  switch (tone) {
    case "approved": return { accent: "border-l-[#22c55e]", badge: "bg-[#22c55e]/15 text-[#bbf7d0] ring-1 ring-[#22c55e]/25" };
    case "pending":  return { accent: "border-l-amber-500",  badge: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25" };
    case "declined": return { accent: "border-l-red-500",    badge: "bg-red-500/15 text-red-200 ring-1 ring-red-500/25" };
    case "active":   return { accent: "border-l-blue-500",   badge: "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/25" };
    default:         return { accent: "border-l-white/15",   badge: "bg-white/10 text-white/80 ring-1 ring-white/15" };
  }
}

function StatCard({ label, value, tone, hint }: { label: string; value: string; tone: StatTone; hint: string }) {
  const c = toneClasses(tone);
  return (
    <div className={`h-full rounded-2xl bg-white/5 p-5 border-l-4 ${c.accent} ring-1 ring-white/10`} role="group" aria-label={label}>
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/70">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${c.badge}`}>{hint}</span>
          <span className="text-xs text-white/55">Today</span>
        </div>
      </div>
    </div>
  );
}

// ─── Consultation row ─────────────────────────────────────────────────────────

function ConsultationRow({ consult, position }: { consult: ConsultationRow; position: number }) {
  if (!consult.patient) return null;
  const isRedFlag = consult.triage_session?.red_flag_triggered ?? false;
  const isPending = consult.status === "pending";
  const overdue = isPending && isOverTwoHours(consult.created_at);
  const patientName = `${consult.patient.first_name} ${consult.patient.last_name}`;
  const age = consult.patient.dob
    ? Math.floor((Date.now() - new Date(consult.patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  const gender = consult.patient.gender?.charAt(0).toUpperCase() ?? "";
  const aiSummary = consult.triage_session?.ai_recommendation ?? "";

  const tone: StatTone =
    consult.status === "approved" ? "approved" :
    consult.status === "pending" ? "pending" :
    consult.status === "declined" ? "declined" :
    "active";
  const c = toneClasses(tone);
  const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    declined: "Declined",
    under_review: "Under Review",
    more_info_required: "More Info Needed",
    cancelled: "Cancelled",
  };
  const statusLabel = STATUS_LABEL[consult.status] ?? consult.status;

  const rowBase = isRedFlag
    ? "border-l-4 border-l-red-500 bg-red-500/[0.07] hover:bg-red-500/[0.11]"
    : "hover:bg-white/5";

  return (
    <div className={`grid grid-cols-12 items-start gap-x-3 gap-y-1 px-3 py-3.5 ${rowBase}`}>
      <div className="col-span-12 sm:col-span-3">
        <div className="flex items-start gap-2.5">
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums ${isRedFlag ? "bg-red-500/25 text-red-300" : "bg-white/10 text-white/50"}`}>
            {position}
          </span>
          <div className="min-w-0">
            <Link
              href={`/dashboard/consultations/${consult.id}`}
              className="group inline-flex items-center gap-1 text-sm font-semibold text-white underline decoration-white/30 underline-offset-2 hover:decoration-white"
            >
              {patientName}
              <svg className="h-3 w-3 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <p className="text-xs text-white/55">
              {age !== null ? `${age}${gender} · ` : ""}{consult.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="col-span-7 sm:col-span-5">
        <div className="flex items-start gap-2">
          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10 ${isRedFlag ? "bg-red-500/15" : "bg-white/10"}`}>
            <ServiceTypeIcon type={consult.service_type as ServiceTypeKey} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/85">{consult.service_type.replace(/_/g, " ")}{consult.service_subtype ? ` — ${consult.service_subtype}` : ""}</p>
            {aiSummary && <p className="mt-1 text-xs leading-relaxed text-white/45 italic">{aiSummary}</p>}
            {isRedFlag && (
              <span className="mt-1.5 inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300 ring-1 ring-red-500/40">
                Red flag
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-5 sm:col-span-2">
        <span className={`inline-flex w-full items-center justify-center rounded-full px-2.5 py-1 text-xs font-medium ${c.badge}`}>
          {statusLabel}
        </span>
      </div>

      <div className="col-span-12 sm:col-span-2 sm:text-right">
        <div className="flex items-center justify-end gap-1.5">
          {overdue && (
            <svg className="h-3.5 w-3.5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" aria-label="Waiting over 2 hours">
              <title>Waiting over 2 hours</title>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <p className={`text-xs ${overdue ? "text-amber-400" : "text-white/55"}`}>{formatRelativeTime(consult.created_at)}</p>
        </div>
        {consult.payment_status === "unpaid" && (
          <span className="mt-1 inline-flex items-center rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/20">
            Unpaid
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage({ consultations, activeCases }: { consultations: ConsultationRow[]; activeCases: ConsultationRow[] }) {
  const [queueStatus, setQueueStatus] = useState<"awaiting_decision" | "all" | "pending" | "approved" | "declined">("awaiting_decision");
  const [caseType, setCaseType] = useState<"all" | string>("all");
  const [query, setQuery] = useState("");

  const pendingCount  = consultations.length;
  const approvedCount = useMemo(() => activeCases.filter(c => c.status === "approved").length, [activeCases]);
  const declinedCount = useMemo(() => activeCases.filter(c => c.status === "declined").length, [activeCases]);
  const moreInfoCount = useMemo(() => activeCases.filter(c => c.status === "more_info_required").length, [activeCases]);

  const filteredConsultations = useMemo(() => {
    const q = query.trim().toLowerCase();
    const desiredStatus = queueStatus === "awaiting_decision" ? "pending" : queueStatus === "all" ? null : queueStatus;

    return consultations
      .filter((c) => {
        if (!c.patient) return false;
        if (desiredStatus && c.status !== desiredStatus) return false;
        if (caseType !== "all" && c.service_type !== caseType) return false;
        if (!q) return true;
        const name = `${c.patient.first_name} ${c.patient.last_name}`.toLowerCase();
        return name.includes(q) || c.id.toLowerCase().includes(q) || c.service_type.toLowerCase().includes(q);
      })
      .slice()
      .sort((a, b) => {
        const aFlag = a.triage_session?.red_flag_triggered ?? false;
        const bFlag = b.triage_session?.red_flag_triggered ?? false;
        if (aFlag !== bFlag) return aFlag ? -1 : 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [caseType, consultations, query, queueStatus]);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-4 pt-6 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="hidden text-xl font-light tracking-[0.04em] text-white sm:block">Clinical Dashboard</p>
          <div className="hidden items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10 sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            Service healthy
          </div>
        </div>
      </header>

      <main className="px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Overview</h1>
          <p className="mt-1 text-sm text-white/65">A fast scan of today&apos;s workload and your current queue.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Pending queue"        value={String(pendingCount)}  tone="pending"  hint="Awaiting claim" />
          <StatCard label="My active cases"      value={String(activeCases.length)} tone="active" hint="Under review" />
          <StatCard label="Awaiting more info"   value={String(moreInfoCount)} tone="pending"  hint="Patient to respond" />
          <StatCard label="Approved today"       value={String(approvedCount)} tone="approved" hint="Completed" />
        </section>

        <section className="mt-6">
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div>
              <h2 className="text-base font-semibold text-white">Case queue</h2>
              <p className="mt-1 text-sm text-white/60">Red flags first, then oldest. Use filters to narrow by type or status.</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <label className="text-xs font-medium text-white/70">Queue</label>
                <select value={queueStatus} onChange={(e) => setQueueStatus(e.target.value as typeof queueStatus)} className="bg-transparent text-sm text-white outline-none">
                  <option value="awaiting_decision">Awaiting decision</option>
                  <option value="all">All cases</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <label className="text-xs font-medium text-white/70">Type</label>
                <select value={caseType} onChange={(e) => setCaseType(e.target.value)} className="bg-transparent text-sm text-white outline-none">
                  <option value="all">All</option>
                  <option value="gp_consultation">GP consult</option>
                  <option value="prescription">Prescription</option>
                  <option value="sick_note">Sick note</option>
                  <option value="medical_cert">Medical cert</option>
                  <option value="referral">Referral</option>
                </select>
              </div>

              <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <label className="text-xs font-medium text-white/70">Search</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Patient name, ID, keyword…"
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
                />
              </div>

              <span className="ml-auto text-xs text-white/55">{filteredConsultations.length} shown</span>
            </div>

            <div className="mt-4 rounded-xl bg-[#0f1729]/35 ring-1 ring-white/10">
              <div className="hidden grid-cols-12 gap-3 border-b border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 sm:grid">
                <div className="col-span-3">Patient</div>
                <div className="col-span-5">Service</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Submitted</div>
              </div>
              <div className="divide-y divide-white/10">
                {filteredConsultations.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-white/40">
                    {consultations.length === 0 ? "No consultations yet — they will appear here once patients submit." : "No cases match your filters."}
                  </div>
                ) : (
                  filteredConsultations.map((c, i) => (
                    <ConsultationRow key={c.id} consult={c} position={i + 1} />
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* My Active Cases */}
        {activeCases.length > 0 && (
          <section className="mt-6">
            <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">My active cases</h2>
                  <p className="mt-1 text-sm text-white/60">Cases you&apos;ve opened — under review or awaiting patient reply.</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-[#0f1729]/35 ring-1 ring-white/10">
                <div className="divide-y divide-white/10">
                  {activeCases.map((c, i) => (
                    <ConsultationRow key={c.id} consult={c} position={i + 1} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
          ExpressGP clinician tools — keep patient data secure and decisions documented.
        </footer>
      </main>
    </>
  );
}
