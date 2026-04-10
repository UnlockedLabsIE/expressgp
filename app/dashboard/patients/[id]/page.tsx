"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  gender: string | null;
  phone: string | null;
  email: string;
  address: string | null;
  created_at: string;
};

type Consultation = {
  id: string;
  service_type: string;
  service_subtype: string | null;
  status: string;
  symptoms: string | null;
  doctor_notes: string | null;
  created_at: string;
};

type Prescription = {
  id: string;
  medication: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  issued_at: string | null;
  created_at: string;
};

type Document = {
  id: string;
  type: string;
  issued_at: string | null;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}

function irishDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IE", { day: "2-digit", month: "short", year: "numeric" });
}

function retentionDeadline(lastConsult: string | null, dob: string | null): string {
  const dates: Date[] = [];
  if (lastConsult) {
    const d = new Date(lastConsult);
    d.setFullYear(d.getFullYear() + 7);
    dates.push(d);
  }
  if (dob) {
    const age25 = new Date(dob);
    age25.setFullYear(age25.getFullYear() + 25);
    dates.push(age25);
  }
  if (!dates.length) return "Unknown";
  const deadline = new Date(Math.max(...dates.map(d => d.getTime())));
  return irishDate(deadline.toISOString());
}

const STATUS_BADGE: Record<string, string> = {
  pending:            "bg-amber-500/15 text-amber-300",
  under_review:       "bg-blue-500/15 text-blue-300",
  approved:           "bg-green-500/15 text-green-300",
  declined:           "bg-red-500/15 text-red-300",
  more_info_required: "bg-amber-500/15 text-amber-300",
  cancelled:          "bg-slate-500/15 text-slate-300",
};

const SVC_LABEL: Record<string, string> = {
  prescription: "Prescription", sick_note: "Sick Note", referral: "Referral",
  medical_cert: "Medical Cert", gp_consultation: "GP Consultation", glp1: "GLP-1",
  insurance_report: "Insurance Report", corporate: "Corporate",
};

// ─── Field component ──────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">{label}</p>
      <p className="mt-0.5 text-sm text-white/85">{value}</p>
    </div>
  );
}

// ─── Export patient data (SAR) ────────────────────────────────────────────────

function exportPatientData(patient: Patient, consultations: Consultation[], prescriptions: Prescription[], documents: Document[]) {
  const data = {
    exportedAt: new Date().toISOString(),
    exportedBy: "ExpressGP GP Dashboard",
    legalBasis: "GDPR Article 15 — Subject Access Request",
    patient: {
      id: patient.id,
      name: `${patient.first_name} ${patient.last_name}`,
      dateOfBirth: patient.dob,
      gender: patient.gender,
      email: patient.email,
      phone: patient.phone,
      address: patient.address,
      registeredAt: patient.created_at,
    },
    consultations: consultations.map(c => ({
      id: c.id,
      serviceType: c.service_type,
      subtype: c.service_subtype,
      status: c.status,
      symptoms: c.symptoms,
      gpNotes: c.doctor_notes,
      date: c.created_at,
    })),
    prescriptions: prescriptions.map(p => ({
      id: p.id,
      medication: p.medication,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration,
      issuedAt: p.issued_at,
    })),
    documents: documents.map(d => ({
      id: d.id,
      type: d.type,
      issuedAt: d.issued_at,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SAR_${patient.last_name}_${patient.first_name}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── GDPR panel ───────────────────────────────────────────────────────────────

function GDPRPanel({
  patient, consultations, prescriptions, documents,
}: {
  patient: Patient;
  consultations: Consultation[];
  prescriptions: Prescription[];
  documents: Document[];
}) {
  const [showAnonWarning, setShowAnonWarning] = useState(false);
  const [sarLogged, setSarLogged] = useState(false);
  const lastConsult = consultations[0]?.created_at ?? null;
  const deadline = retentionDeadline(lastConsult, patient.dob);

  return (
    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
      <div className="border-b border-white/10 px-5 py-3">
        <h2 className="text-sm font-semibold text-white">Data &amp; Privacy (GDPR)</h2>
        <p className="mt-0.5 text-xs text-white/40">Controls for Subject Access Requests and data retention</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Retention info */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
          <p className="text-xs font-semibold text-amber-300">Mandatory retention period</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-200/65">
            Irish Medical Council guidelines require this record to be retained until at least{" "}
            <strong className="text-amber-200">{deadline}</strong> (7 years from last treatment,
            or age 25, whichever is later). Records <strong className="text-amber-200">cannot
            be permanently deleted</strong> during this period, even on patient request.
          </p>
        </div>

        {/* SAR export */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/80">Subject Access Request (SAR)</p>
            <p className="mt-0.5 text-xs text-white/40">
              Export all data held on this patient as a structured JSON file.
              Required under GDPR Article 15 — must be fulfilled within 30 days of request.
            </p>
          </div>
          <button
            onClick={() => exportPatientData(patient, consultations, prescriptions, documents)}
            className="shrink-0 rounded-xl bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-200 ring-1 ring-blue-500/25 transition-all hover:bg-blue-500/25"
          >
            Export data
          </button>
        </div>

        {/* Log SAR received */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/80">Log SAR received</p>
            <p className="mt-0.5 text-xs text-white/40">
              Mark that a Subject Access Request has been received from this patient.
              Your DPO should be notified. You have 30 days to respond.
            </p>
          </div>
          <button
            onClick={() => setSarLogged(true)}
            disabled={sarLogged}
            className="shrink-0 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white/60 ring-1 ring-white/10 transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sarLogged ? "✓ Logged" : "Log SAR"}
          </button>
        </div>

        {/* Anonymisation */}
        <div className="border-t border-white/8 pt-4">
          {!showAnonWarning ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-red-300">Request anonymisation</p>
                <p className="mt-0.5 text-xs text-white/40">
                  Replaces identifying fields with anonymised values. Irreversible.
                  Only appropriate after legal/DPO review confirms the retention period has passed
                  or a valid erasure request exists. Medical records cannot be deleted outright.
                </p>
              </div>
              <button
                onClick={() => setShowAnonWarning(true)}
                className="shrink-0 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 ring-1 ring-red-500/25 transition-all hover:bg-red-500/20"
              >
                Anonymise…
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-red-500/30 bg-red-500/[0.08] px-4 py-4 space-y-3">
              <p className="text-xs font-bold text-red-300">⚠ This action is irreversible</p>
              <p className="text-xs leading-relaxed text-red-200/70">
                Anonymising this record will permanently replace the patient&apos;s name, email,
                phone, address and date of birth with anonymised placeholders. Consultation notes,
                prescriptions and documents will be retained as required by law but will no longer
                be linked to an identifiable individual.
              </p>
              <p className="text-xs text-red-200/60">
                <strong className="text-red-300">Do not proceed unless:</strong> (1) the mandatory
                retention period has passed, (2) your DPO has approved the erasure request in writing,
                and (3) there are no outstanding clinical, legal or insurance obligations on this record.
              </p>
              <p className="text-xs font-semibold text-red-200/80">
                This feature is currently disabled pending DPO integration. Contact your Data Protection Officer directly to process erasure requests.
              </p>
              <button
                onClick={() => setShowAnonWarning(false)}
                className="text-xs text-white/40 underline hover:text-white/60"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();

  const [patient, setPatient]           = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [documents, setDocuments]       = useState<Document[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch patient via a consultation join (respects RLS — GPs can only see their patients)
      const { data: consults, error } = await supabase
        .from("consultations")
        .select(`
          id, service_type, service_subtype, status, symptoms, doctor_notes, created_at,
          patient:patients ( id, first_name, last_name, dob, gender, phone, email, address, created_at ),
          prescriptions ( id, medication, dosage, frequency, duration, issued_at, created_at ),
          documents ( id, type, issued_at, created_at )
        `)
        .eq("patient_id", id)
        .order("created_at", { ascending: false });

      if (error || !consults?.length) { setLoading(false); return; }

      setPatient(consults[0].patient as unknown as Patient);
      setConsultations(consults as unknown as Consultation[]);

      // Flatten prescriptions and documents from all consultations
      const allRx: Prescription[] = [];
      const allDocs: Document[] = [];
      for (const c of consults) {
        const typed = c as unknown as { prescriptions: Prescription[]; documents: Document[] };
        allRx.push(...(typed.prescriptions ?? []));
        allDocs.push(...(typed.documents ?? []));
      }
      setPrescriptions(allRx);
      setDocuments(allDocs);
      setLoading(false);
    }
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1729] p-6 animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-xl bg-white/5" />
        <div className="h-40 rounded-2xl bg-white/5" />
        <div className="h-64 rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1729] text-white/40">
        Patient not found or you do not have access to this record.
      </div>
    );
  }

  const age = calcAge(patient.dob);
  const gender = patient.gender
    ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
    : "—";

  return (
    <div className="min-h-screen bg-[#0f1729] text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-4 pt-6 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/patients"
            className="flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Patients
          </Link>
          <span className="text-white/20">/</span>
          <h1 className="text-base font-semibold text-white">
            {patient.first_name} {patient.last_name}
          </h1>
          {age !== null && (
            <span className="text-sm text-white/40">{age}{gender !== "—" ? gender[0] : ""}</span>
          )}
        </div>
      </header>

      <main className="px-5 py-6 space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

          {/* Left column */}
          <div className="space-y-5">

            {/* Patient details */}
            <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
              <div className="border-b border-white/10 px-5 py-3">
                <h2 className="text-sm font-semibold text-white">Patient details</h2>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-3">
                <Field label="Full name" value={`${patient.first_name} ${patient.last_name}`} />
                <Field label="Date of birth" value={irishDate(patient.dob)} />
                <Field label="Age / Sex" value={age !== null ? `${age} · ${gender}` : gender} />
                <Field label="Phone" value={patient.phone ?? "—"} />
                <Field label="Email" value={patient.email} />
                <Field label="Address" value={patient.address ?? "—"} />
                <Field label="Patient since" value={irishDate(patient.created_at)} />
                <Field label="Patient ID" value={patient.id.slice(0, 8).toUpperCase()} />
              </div>
            </div>

            {/* Consultation history */}
            <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
              <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Consultation history</h2>
                <span className="text-xs text-white/35">{consultations.length} total</span>
              </div>
              <div className="divide-y divide-white/8">
                {consultations.length === 0 && (
                  <p className="px-5 py-6 text-sm text-white/35">No consultations on record.</p>
                )}
                {consultations.map(c => (
                  <div key={c.id} className="flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-white/4 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white/85">
                          {SVC_LABEL[c.service_type] ?? c.service_type}
                          {c.service_subtype ? ` — ${c.service_subtype}` : ""}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[c.status] ?? "bg-white/8 text-white/40"}`}>
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      {c.symptoms && (
                        <p className="mt-1 text-xs text-white/40 line-clamp-1">{c.symptoms}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-white/40">{irishDate(c.created_at)}</p>
                      <Link
                        href={`/dashboard/consultations/${c.id}`}
                        className="mt-0.5 text-[10px] text-blue-400 hover:text-blue-300"
                      >
                        Open →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prescriptions */}
            {prescriptions.length > 0 && (
              <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Prescriptions issued</h2>
                  <span className="text-xs text-white/35">{prescriptions.length}</span>
                </div>
                <div className="divide-y divide-white/8">
                  {prescriptions.map(rx => (
                    <div key={rx.id} className="px-5 py-3.5">
                      <p className="text-sm font-medium text-white/85">{rx.medication}</p>
                      <p className="mt-0.5 text-xs text-white/40">
                        {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/30">Issued {irishDate(rx.issued_at ?? rx.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {documents.length > 0 && (
              <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Documents issued</h2>
                  <span className="text-xs text-white/35">{documents.length}</span>
                </div>
                <div className="divide-y divide-white/8">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between px-5 py-3">
                      <p className="text-sm text-white/80 capitalize">{doc.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-white/35">{irishDate(doc.issued_at ?? doc.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — GDPR */}
          <div>
            <GDPRPanel
              patient={patient}
              consultations={consultations}
              prescriptions={prescriptions}
              documents={documents}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
