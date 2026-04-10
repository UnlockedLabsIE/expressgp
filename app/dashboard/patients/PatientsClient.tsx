"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type PatientRow = {
  id: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  gender: string | null;
  phone: string | null;
  email: string;
  address: string | null;
  created_at: string;
  // Derived from consultations
  totalConsultations: number;
  lastConsultation: string | null;
  hasPendingSAR: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}

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
            Under Irish Medical Council guidelines and GDPR Article 17(3)(c), medical records must be retained
            for a minimum of <strong className="text-amber-200">7 years</strong> from the date of last treatment
            (or until age 25 for patients who were minors). Patient records <strong className="text-amber-200">cannot
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

function PatientRowItem({ patient }: { patient: PatientRow }) {
  const age = calcAge(patient.dob);
  const name = `${patient.first_name} ${patient.last_name}`;
  const gender = patient.gender
    ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
    : "—";

  return (
    <div className="grid grid-cols-12 items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors">
      {/* Name + ID */}
      <div className="col-span-12 sm:col-span-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-xs font-semibold text-white/60">
            {patient.first_name[0]}{patient.last_name[0]}
          </div>
          <div className="min-w-0">
            <Link
              href={`/dashboard/patients/${patient.id}`}
              className="group inline-flex items-center gap-1 text-sm font-semibold text-white underline decoration-white/30 underline-offset-2 hover:decoration-white"
            >
              {name}
              <svg className="h-3 w-3 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <p className="text-[10px] text-white/35 font-mono">{patient.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* DOB / Age */}
      <div className="col-span-6 sm:col-span-2">
        <p className="text-xs text-white/70">{patient.dob ? irishDate(patient.dob) : "—"}</p>
        <p className="text-[10px] text-white/35">{age !== null ? `${age} yrs` : ""}</p>
      </div>

      {/* Gender */}
      <div className="col-span-6 sm:col-span-1">
        <p className="text-xs text-white/70">{gender}</p>
      </div>

      {/* Contact */}
      <div className="col-span-12 sm:col-span-3 min-w-0">
        <p className="truncate text-xs text-white/70">{patient.email}</p>
        <p className="text-[10px] text-white/35">{patient.phone ?? "—"}</p>
      </div>

      {/* Consultations */}
      <div className="col-span-6 sm:col-span-1 text-center">
        <span className="inline-flex items-center justify-center rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-200">
          {patient.totalConsultations}
        </span>
      </div>

      {/* Last consult */}
      <div className="col-span-6 sm:col-span-2 text-right">
        <p className="text-xs text-white/55">
          {patient.lastConsultation ? relDate(patient.lastConsultation) : "—"}
        </p>
        {patient.hasPendingSAR && (
          <span className="mt-0.5 inline-flex items-center rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300 ring-1 ring-red-500/25">
            SAR pending
          </span>
        )}
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
  const [sort, setSort]         = useState<"name" | "last_consult" | "total">("last_consult");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Fetch consultations assigned to this GP, joining patient data
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          id, created_at, updated_at, status,
          patient:patients ( id, first_name, last_name, dob, gender, phone, email, address, created_at )
        `)
        .eq("partner_doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }

      // Aggregate by patient
      const map = new Map<string, PatientRow>();
      for (const c of (data ?? [])) {
        const p = c.patient as PatientRow | null;
        if (!p) continue;
        const existing = map.get(p.id);
        if (!existing) {
          map.set(p.id, {
            ...p,
            totalConsultations: 1,
            lastConsultation: c.created_at,
            hasPendingSAR: false,
          });
        } else {
          existing.totalConsultations += 1;
          if (new Date(c.created_at) > new Date(existing.lastConsultation ?? "")) {
            existing.lastConsultation = c.created_at;
          }
        }
      }

      setPatients(Array.from(map.values()));
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q
      ? patients.filter(p =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.phone ?? "").includes(q)
        )
      : patients;

    return [...list].sort((a, b) => {
      if (sort === "name") return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      if (sort === "total") return b.totalConsultations - a.totalConsultations;
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
                placeholder="Search by name, email or phone…"
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
                <option value="total">Most consultations</option>
              </select>
            </div>

            <span className="ml-auto text-xs text-white/40">{filtered.length} shown</span>
          </div>

          {/* Table */}
          <div className="rounded-xl ring-1 ring-white/10 overflow-hidden">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-12 gap-3 border-b border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              <div className="col-span-3">Patient</div>
              <div className="col-span-2">Date of birth</div>
              <div className="col-span-1">Sex</div>
              <div className="col-span-3">Contact</div>
              <div className="col-span-1 text-center">Consults</div>
              <div className="col-span-2 text-right">Last seen</div>
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
