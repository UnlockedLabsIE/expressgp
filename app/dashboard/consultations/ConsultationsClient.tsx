"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ConsultationRow } from "@/lib/queries";

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(Math.max(0, diffMs) / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

const STATUS_BADGE: Record<string, string> = {
  pending:        "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25",
  under_review:   "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/25",
  approved:       "bg-[#22c55e]/15 text-[#bbf7d0] ring-1 ring-[#22c55e]/25",
  declined:       "bg-red-500/15 text-red-200 ring-1 ring-red-500/25",
  more_info_required: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25",
  cancelled:          "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/25",
};

export default function ConsultationsClient({ consultations }: { consultations: ConsultationRow[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter]     = useState<string>("all");
  const [query, setQuery]               = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return consultations.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.service_type !== typeFilter) return false;
      if (q) {
        const name = `${c.patient.first_name} ${c.patient.last_name}`.toLowerCase();
        if (!name.includes(q) && !c.id.toLowerCase().includes(q) && !c.service_type.includes(q)) return false;
      }
      return true;
    });
  }, [consultations, statusFilter, typeFilter, query]);

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
          <h1 className="text-2xl font-semibold tracking-tight text-white">Consultations</h1>
          <p className="mt-1 text-sm text-white/60">All cases. Click a patient to open the full consultation.</p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <label className="text-xs font-medium text-white/60">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-sm text-white outline-none">
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under review</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="more_info_required">More info required</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <label className="text-xs font-medium text-white/60">Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-transparent text-sm text-white outline-none">
              <option value="all">All</option>
              <option value="gp_consultation">GP consult</option>
              <option value="prescription">Prescription</option>
              <option value="sick_note">Sick note</option>
              <option value="medical_cert">Medical cert</option>
              <option value="referral">Referral</option>
              <option value="glp1">GLP-1</option>
            </select>
          </div>
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <label className="text-xs font-medium text-white/60">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Patient, ID, keyword…"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
            />
          </div>
          <span className="ml-auto text-xs text-white/45">{filtered.length} of {consultations.length}</span>
        </div>

        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
          <div className="hidden grid-cols-12 gap-3 border-b border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/45 sm:grid">
            <div className="col-span-3">Patient</div>
            <div className="col-span-5">Service</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Submitted</div>
          </div>

          <div className="divide-y divide-white/[0.07]">
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-white/40">
                {consultations.length === 0
                  ? "No consultations yet — they will appear here once patients submit."
                  : "No cases match your filters."}
              </div>
            ) : (
              filtered.filter((c) => !!c.patient).map((c) => {
                const isRedFlag = c.triage_session?.red_flag_triggered ?? false;
                const name = `${c.patient.first_name} ${c.patient.last_name}`;
                const age = c.patient.dob
                  ? Math.floor((Date.now() - new Date(c.patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
                  : null;
                const gender = c.patient.gender?.charAt(0).toUpperCase() ?? "";
                return (
                  <Link
                    key={c.id}
                    href={`/dashboard/consultations/${c.id}`}
                    className={`grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm transition-colors ${isRedFlag ? "border-l-4 border-l-red-500 bg-red-500/[0.06] hover:bg-red-500/[0.10]" : "hover:bg-white/5"}`}
                  >
                    <div className="col-span-12 sm:col-span-3">
                      <div className="flex items-center gap-2">
                        {isRedFlag && (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/25 text-[8px] font-bold text-red-300">!</span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{name}</p>
                          <p className="text-xs text-white/45">{age !== null ? `${age}${gender} · ` : ""}{c.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-5 hidden sm:block">
                      <p className="truncate capitalize text-white/75">{c.service_type.replace(/_/g, " ")}{c.service_subtype ? ` — ${c.service_subtype}` : ""}</p>
                    </div>
                    <div className="col-span-5 sm:col-span-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[c.status] ?? STATUS_BADGE.pending}`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="col-span-7 sm:col-span-2 text-right">
                      <span className="text-xs text-white/45">{formatRelativeTime(c.created_at)}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-white/40">
          ExpressGP clinician tools — keep patient data secure and decisions documented.
        </footer>
      </main>
    </>
  );
}
