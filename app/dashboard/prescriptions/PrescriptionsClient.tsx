"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type RxDoctor = { first_name: string; last_name: string; imc_number: string } | null;
type RxPatient = { first_name: string; last_name: string; dob: string | null } | null;
type RxConsultation = {
  id: string;
  service_type: string;
  partner_doctor_id: string | null;
  patient: RxPatient;
  doctor: RxDoctor;
} | null;

export type PrescriptionRow = {
  id: string;
  consultation_id: string;
  medication: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  pharmacy_name: string | null;
  pharmacy_address: string | null;
  healthmail_reference: string | null;
  issued_at: string | null;
  created_at: string;
  consultation: RxConsultation;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function irishDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function rxRef(id: string) {
  return `RX-${id.slice(0, 8).toUpperCase()}`;
}

function deriveStatus(rx: PrescriptionRow): "draft" | "issued" | "dispensed" | "expired" {
  if (!rx.issued_at) return "draft";
  if (rx.healthmail_reference) return "dispensed";
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  if (new Date(rx.issued_at) < sixMonthsAgo) return "expired";
  return "issued";
}

function deriveType(serviceType: string | undefined): "standard" | "glp1" | "repeat" {
  if (serviceType === "glp1") return "glp1";
  return "standard";
}

function patientName(p: RxPatient) {
  if (!p) return "Unknown";
  return `${p.first_name} ${p.last_name}`;
}

function gpName(d: RxDoctor) {
  if (!d) return "—";
  return `Dr. ${d.first_name} ${d.last_name}`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-white/8 text-white/50 ring-1 ring-white/10",
  issued:    "bg-[#22c55e]/15 text-[#bbf7d0] ring-1 ring-[#22c55e]/30",
  dispensed: "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/30",
  expired:   "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  if (type === "glp1") {
    return (
      <span className="inline-flex items-center rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] font-semibold text-purple-200 ring-1 ring-purple-500/30">
        GLP-1
      </span>
    );
  }
  return null;
}

// ─── Reusable prescription list ───────────────────────────────────────────────
// Exported so it can be embedded in patient detail and consultation pages.

export function PrescriptionList({
  prescriptions,
  onSelect,
}: {
  prescriptions: PrescriptionRow[];
  onSelect: (rx: PrescriptionRow) => void;
}) {
  if (prescriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="h-10 w-10 text-white/15 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-white/40">No prescriptions found</p>
        <p className="mt-1 text-xs text-white/25">Prescriptions are issued from within a consultation</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-white/8">
            {["Patient", "DOB", "Medication", "Dosage", "Frequency", "Duration", "Pharmacy", "Issued", "GP", "Status"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/35 first:pl-5 last:pr-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {prescriptions.map(rx => {
            const status = deriveStatus(rx);
            const type   = deriveType(rx.consultation?.service_type);
            return (
              <tr
                key={rx.id}
                onClick={() => onSelect(rx)}
                className="group cursor-pointer transition-colors hover:bg-white/[0.03]"
              >
                <td className="pl-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{patientName(rx.consultation?.patient ?? null)}</span>
                    {type !== "standard" && <TypeBadge type={type} />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-white/35">{rxRef(rx.id)}</p>
                </td>
                <td className="px-4 py-3.5 text-white/60">{irishDate(rx.consultation?.patient?.dob ?? null)}</td>
                <td className="px-4 py-3.5 font-medium text-white/90">{rx.medication}</td>
                <td className="px-4 py-3.5 text-white/60">{rx.dosage ?? "—"}</td>
                <td className="px-4 py-3.5 text-white/60">{rx.frequency ?? "—"}</td>
                <td className="px-4 py-3.5 text-white/60">{rx.duration ?? "—"}</td>
                <td className="px-4 py-3.5 text-white/60">{rx.pharmacy_name ?? "—"}</td>
                <td className="px-4 py-3.5 text-white/60 whitespace-nowrap">{irishDate(rx.issued_at)}</td>
                <td className="px-4 py-3.5 text-white/60 whitespace-nowrap">{gpName(rx.consultation?.doctor ?? null)}</td>
                <td className="pr-5 py-3.5">
                  <StatusBadge status={status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail slide-over ────────────────────────────────────────────────────────

function PrescriptionDetail({
  rx,
  onClose,
}: {
  rx: PrescriptionRow;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const status = deriveStatus(rx);
  const type   = deriveType(rx.consultation?.service_type);
  const ref    = rxRef(rx.id);
  const doctor = rx.consultation?.doctor;
  const patient = rx.consultation?.patient;

  async function handleDownload() {
    setDownloading(true);
    try {
      const { downloadPrescription } = await import("@/lib/pdf/generate");
      await downloadPrescription({
        patientName: patientName(patient ?? null),
        dob: patient?.dob ?? "",
        drug:      rx.medication,
        dose:      rx.dosage ?? "",
        frequency: rx.frequency ?? "",
        duration:  rx.duration ?? "",
        pharmacy:  rx.pharmacy_name ?? "",
        gpName:    doctor ? `${doctor.first_name} ${doctor.last_name}` : "ExpressGP GP",
        imcNumber: doctor?.imc_number ?? "",
        consultationId: rx.consultation_id,
        issuedAt:  rx.issued_at ?? rx.created_at,
      });
    } finally {
      setDownloading(false);
    }
  }

  function handleHealthmail() {
    // Stub — Healthmail credentials TBC
    console.log("[Healthmail] Would send prescription", ref, "to pharmacy:", rx.pharmacy_name);
    alert("Healthmail integration coming soon. Credentials TBC with HSE.");
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-[#0f1729] shadow-2xl ring-1 ring-white/10">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Prescription</p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">{ref}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-white/40 hover:bg-white/8 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-5 px-6 py-5">

          {/* Status + type row */}
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {type !== "standard" && <TypeBadge type={type} />}
            {type === "glp1" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-500/30">
                ⚠ Monthly review required
              </span>
            )}
          </div>

          {/* Controlled drug block notice */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
            <p className="text-xs font-semibold text-red-300">Controlled Drug Policy</p>
            <p className="mt-0.5 text-xs text-red-200/60">
              Opioids, benzodiazepines, and sedatives cannot be prescribed via this platform. Any prescription containing a controlled substance must be issued in person only.
            </p>
          </div>

          {/* Patient */}
          <Section title="Patient">
            <Field label="Name">{patientName(patient ?? null)}</Field>
            <Field label="Date of Birth">{irishDate(patient?.dob ?? null)}</Field>
          </Section>

          {/* Medication */}
          <Section title="Medication">
            <Field label="Drug name">{rx.medication}</Field>
            <Field label="Dosage">{rx.dosage ?? "—"}</Field>
            <Field label="Frequency / Directions">{rx.frequency ?? "—"}</Field>
            <Field label="Duration / Supply">{rx.duration ?? "—"}</Field>
          </Section>

          {/* Pharmacy */}
          <Section title="Pharmacy">
            <Field label="Name">{rx.pharmacy_name ?? "Not specified"}</Field>
            <Field label="Address">{rx.pharmacy_address ?? "—"}</Field>
            {rx.healthmail_reference && (
              <Field label="Healthmail Ref">{rx.healthmail_reference}</Field>
            )}
          </Section>

          {/* Prescriber */}
          <Section title="Prescribing GP">
            <Field label="Name">{gpName(doctor ?? null)}</Field>
            <Field label="IMC Number">{doctor?.imc_number ?? "—"}</Field>
          </Section>

          {/* Meta */}
          <Section title="Record">
            <Field label="Consultation">
              <Link
                href={`/dashboard/consultations/${rx.consultation_id}`}
                className="text-[#22c55e] hover:underline"
              >
                View consultation →
              </Link>
            </Field>
            <Field label="Issued">{irishDate(rx.issued_at)}</Field>
            <Field label="Created">{irishDate(rx.created_at)}</Field>
          </Section>
        </div>

        {/* Actions footer */}
        <div className="sticky bottom-0 border-t border-white/10 bg-[#0f1729] px-6 py-4 space-y-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Actions</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 rounded-xl bg-white/8 px-4 py-2.5 text-sm font-medium text-white/80 ring-1 ring-white/10 transition-all hover:bg-white/12 hover:text-white disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloading ? "Generating…" : "Download PDF"}
            </button>

            <button
              onClick={handleHealthmail}
              className="flex items-center gap-2 rounded-xl bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-200 ring-1 ring-blue-500/25 transition-all hover:bg-blue-500/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send via Healthmail
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/25">
            Prescriptions are read-only once issued. Issue a new prescription from the consultation if a correction is needed.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Section / Field helpers ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-white/30">{title}</p>
      <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/8 divide-y divide-white/6">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-xs text-white/40">{label}</span>
      <span className="text-right text-xs font-medium text-white/80">{children}</span>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ prescriptions }: { prescriptions: PrescriptionRow[] }) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const issuedThisMonth = prescriptions.filter(rx =>
    rx.issued_at && new Date(rx.issued_at) >= startOfMonth
  ).length;

  const glp1Count = prescriptions.filter(rx =>
    rx.consultation?.service_type === "glp1"
  ).length;

  const pendingReview = prescriptions.filter(rx =>
    rx.consultation?.service_type === "glp1" && rx.issued_at &&
    (() => {
      const issued = new Date(rx.issued_at!);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return issued < thirtyDaysAgo;
    })()
  ).length;

  const stats = [
    { label: "Total Prescriptions", value: prescriptions.length },
    { label: "Issued This Month",   value: issuedThisMonth },
    { label: "GLP-1 Scripts",       value: glp1Count },
    { label: "GLP-1 Review Due",    value: pendingReview, warn: pendingReview > 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(s => (
        <div
          key={s.label}
          className={`rounded-2xl px-4 py-3.5 ring-1 ${s.warn ? "bg-amber-500/[0.08] ring-amber-500/25" : "bg-white/[0.04] ring-white/8"}`}
        >
          <p className="text-2xl font-bold text-white">{s.value}</p>
          <p className={`mt-0.5 text-xs ${s.warn ? "text-amber-300" : "text-white/45"}`}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function PrescriptionsClient() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<PrescriptionRow | null>(null);

  // Filters
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<string>("all");
  const [typeFilter, setType]       = useState<string>("all");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("prescriptions")
      .select(`
        *,
        consultation:consultations (
          id,
          service_type,
          partner_doctor_id,
          patient:patients ( first_name, last_name, dob ),
          doctor:partner_doctors ( first_name, last_name, imc_number )
        )
      `)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[prescriptions]", error.message);
        setPrescriptions((data ?? []) as PrescriptionRow[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return prescriptions.filter(rx => {
      const name = patientName(rx.consultation?.patient ?? null).toLowerCase();
      const med  = rx.medication.toLowerCase();
      const q    = search.toLowerCase();

      if (q && !name.includes(q) && !med.includes(q) && !rxRef(rx.id).toLowerCase().includes(q)) return false;

      if (statusFilter !== "all" && deriveStatus(rx) !== statusFilter) return false;

      if (typeFilter !== "all" && deriveType(rx.consultation?.service_type) !== typeFilter) return false;

      if (dateFrom && rx.issued_at && new Date(rx.issued_at) < new Date(dateFrom)) return false;
      if (dateTo   && rx.issued_at && new Date(rx.issued_at) > new Date(dateTo))   return false;

      return true;
    });
  }, [prescriptions, search, statusFilter, typeFilter, dateFrom, dateTo]);

  return (
    <div className="min-h-screen px-6 pb-8 pt-10">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Prescriptions</h1>
          <p className="mt-1 text-sm text-white/45">
            All prescriptions issued through this platform. IMC-registered GPs only.
          </p>
        </div>
        <Link
          href="/dashboard/consultations"
          className="flex items-center gap-2 rounded-xl bg-[#22c55e]/10 px-4 py-2.5 text-sm font-semibold text-[#86efac] ring-1 ring-[#22c55e]/25 transition-all hover:bg-[#22c55e]/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Prescription
        </Link>
      </div>

      {/* Controlled drugs warning */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3.5">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <p className="text-xs text-red-200/80">
          <strong className="text-red-300">Controlled drugs are blocked on this platform.</strong>{" "}
          Opioids, benzodiazepines, Z-drugs, and sedatives cannot be prescribed remotely. Any such request must be referred for an in-person consultation.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <StatsBar prescriptions={prescriptions} />
        )}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search patient, medication, Rx ref…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/[0.05] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 outline-none ring-1 ring-white/10 focus:ring-white/20 transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
          className="rounded-xl bg-white/[0.05] px-3 py-2.5 text-sm text-white/80 outline-none ring-1 ring-white/10 focus:ring-white/20"
        >
          <option value="all">All statuses</option>
          <option value="issued">Issued</option>
          <option value="dispensed">Dispensed</option>
          <option value="expired">Expired</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={typeFilter}
          onChange={e => setType(e.target.value)}
          className="rounded-xl bg-white/[0.05] px-3 py-2.5 text-sm text-white/80 outline-none ring-1 ring-white/10 focus:ring-white/20"
        >
          <option value="all">All types</option>
          <option value="standard">Standard</option>
          <option value="glp1">GLP-1 / Weight loss</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-xl bg-white/[0.05] px-3 py-2.5 text-sm text-white/80 outline-none ring-1 ring-white/10 focus:ring-white/20"
          />
          <span className="text-white/30 text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-xl bg-white/[0.05] px-3 py-2.5 text-sm text-white/80 outline-none ring-1 ring-white/10 focus:ring-white/20"
          />
        </div>

        {(search || statusFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(""); setStatus("all"); setType("all"); setDateFrom(""); setDateTo(""); }}
            className="rounded-xl px-3 py-2.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="mt-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/8 overflow-hidden">
        {loading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
              <p className="text-xs text-white/40">
                {filtered.length} prescription{filtered.length !== 1 ? "s" : ""}
                {filtered.length !== prescriptions.length && ` (filtered from ${prescriptions.length})`}
              </p>
            </div>
            <PrescriptionList prescriptions={filtered} onSelect={setSelected} />
          </>
        )}
      </div>

      {/* Retention notice */}
      <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-4">
        <div className="flex gap-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-amber-300">Prescription Records Retention — Irish Law</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/70">
              Under Irish Medical Council guidelines, prescription records must be retained for a minimum of{" "}
              <strong className="text-amber-200">8 years</strong> from the date of issue (or until the patient reaches age 25 if they were a minor at time of prescribing).
              Records cannot be permanently deleted during this period. All prescription data is stored securely in compliance with GDPR and the Health (Miscellaneous Provisions) Act 2024.
            </p>
          </div>
        </div>
      </div>

      {/* Detail slide-over */}
      {selected && (
        <PrescriptionDetail rx={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
