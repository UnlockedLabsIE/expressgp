"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

// GDPR data minimisation: list view carries only what's shown on screen.
// DOB, gender, phone, email, address, and consultation counts remain on the
// patient detail page (`/dashboard/patients/[id]`), which runs its own fetch
// and its own audit log entry.
type PatientRow = {
  id: string;
  first_name: string;
  last_name: string;
  // Derived from the most recent consultation assigned to this GP.
  lastConsultation: string | null;
  lastStatus: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function irishDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", { day: "2-digit", month: "short", year: "numeric" });
}

function relDate(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return irishDate(iso);
}

// ─── GDPR retention notice ────────────────────────────────────────────────────

function RetentionNotice() {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
      <div className="flex gap-3">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div>
          <p className="text-xs font-semibold text-amber-300">Medical Records Retention — Irish Law</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-200/70">
            Under Irish Medical Council guidelines and GDPR Article 17(3)(b), medical records must be retained
            for a minimum of <strong className="text-amber-200">8 years</strong> from the date of last treatment
            (or until age 25 for patients who were minors, whichever is later). Patient records <strong className="text-amber-200">cannot
            be permanently deleted</strong> on request during this period — anonymisation is the appropriate
            response to an erasure request. Always consult your Data Protection Officer before processing
            any Subject Access Request or erasure request.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Patient row ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  pending:            "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  under_review:       "bg-blue-500/15 text-blue-200 ring-blue-500/25",
  approved:           "bg-green-500/15 text-green-300 ring-green-500/25",
  declined:           "bg-red-500/15 text-red-300 ring-red-500/25",
  more_info_required: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  cancelled:          "bg-slate-500/15 text-slate-300 ring-slate-500/25",
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span className="text-xs text-white/35">—</span>;
  }
  const klass = STATUS_BADGE[status] ?? "bg-white/8 text-white/50 ring-white/15";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${klass}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PatientRowItem({ patient }: { patient: PatientRow }) {
  const name = `${patient.first_name} ${patient.last_name}`;

  return (
    <div className="grid grid-cols-12 items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors">
      {/* Name */}
      <div className="col-span-12 sm:col-span-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-xs font-semibold text-white/60">
            {patient.first_name[0]}{patient.last_name[0]}
          </div>
          <Link
            href={`/dashboard/patients/${patient.id}`}
            className="group inline-flex items-center gap-1 text-sm font-semibold text-white underline decoration-white/30 underline-offset-2 hover:decoration-white"
          >
            {name}
            <svg className="h-3 w-3 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Last consult */}
      <div className="col-span-6 sm:col-span-3">
        <p className="text-xs text-white/60">
          {patient.lastConsultation ? relDate(patient.lastConsultation) : "—"}
        </p>
      </div>

      {/* Status */}
      <div className="col-span-6 sm:col-span-3 text-right sm:text-left">
        <StatusBadge status={patient.lastStatus} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PatientsClient() {
  const supabase = createClient();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [sort, setSort]         = useState<"name" | "last_consult">("last_consult");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // GDPR Art.5(1)(c) — fetch only what the list displays.
      // Full patient profile (DOB, gender, contact, address) lives on the
      // patient detail page and is fetched by that page.
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          id, created_at, status,
          patient:patients ( id, first_name, last_name )
        `)
        .eq("partner_doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }

      type PatientLite = Pick<PatientRow, "id" | "first_name" | "last_name">;
      type ConsultRow = {
        id: string;
        created_at: string;
        status: string | null;
        patient: PatientLite | PatientLite[] | null;
      };

      // Aggregate by patient; keep only the most recent consultation's
      // timestamp + status since the list just shows "last activity".
      const map = new Map<string, PatientRow>();
      for (const c of (data ?? []) as unknown as ConsultRow[]) {
        const raw = c.patient;
        const p = Array.isArray(raw) ? raw[0] : raw;
        if (!p) continue;
        const existing = map.get(p.id);
        if (!existing) {
          map.set(p.id, {
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            lastConsultation: c.created_at,
            lastStatus: c.status,
          });
        } else if (new Date(c.created_at) > new Date(existing.lastConsultation ?? "")) {
          existing.lastConsultation = c.created_at;
          existing.lastStatus = c.status;
        }
      }

      setPatients(Array.from(map.values()));
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    // Email/phone search removed — those fields are no longer fetched
    // into the list (GDPR minimisation). Full contact search remains
    // available on the patient detail page.
    const list = q
      ? patients.filter(p =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q),
        )
      : patients;

    return [...list].sort((a, b) => {
      if (sort === "name") return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      // last_consult
      return new Date(b.lastConsultation ?? 0).getTime() - new Date(a.lastConsultation ?? 0).getTime();
    });
  }, [patients, search, sort]);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-4 pt-6 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-xl font-light tracking-[0.04em] text-white">Patients</p>
          <p className="text-xs text-white/40">{patients.length} patient{patients.length !== 1 ? "s" : ""} on record</p>
        </div>
      </header>

      <main className="px-5 py-6 space-y-5">
        <RetentionNotice />

        <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Search */}
            <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <svg className="h-3.5 w-3.5 shrink-0 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <label className="text-xs font-medium text-white/50">Sort</label>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as typeof sort)}
                className="bg-transparent text-sm text-white outline-none"
              >
                <option value="last_consult">Last consultation</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>

            <span className="ml-auto text-xs text-white/40">{filtered.length} shown</span>
          </div>

          {/* Table */}
          <div className="rounded-xl ring-1 ring-white/10 overflow-hidden">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-12 gap-3 border-b border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              <div className="col-span-6">Patient</div>
              <div className="col-span-3">Last consultation</div>
              <div className="col-span-3">Status</div>
            </div>

            <div className="divide-y divide-white/8">
              {loading && (
                <div className="space-y-1 p-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl bg-white/4 animate-pulse" />)}
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="px-4 py-12 text-center text-sm text-white/35">
                  {patients.length === 0
                    ? "No patients yet — they appear here once you claim a case."
                    : "No patients match your search."}
                </div>
              )}
              {filtered.map(p => <PatientRowItem key={p.id} patient={p} />)}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
