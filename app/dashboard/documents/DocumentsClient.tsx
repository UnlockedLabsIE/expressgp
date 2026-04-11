"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { DocumentType, PartnerDoctor } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocPatient = { id: string; first_name: string; last_name: string; dob: string | null } | null;
type DocDoctor  = { first_name: string; last_name: string; imc_number: string } | null;
type DocConsultation = {
  id: string;
  service_type: string;
  service_subtype: string | null;
  status: string;
  patient: DocPatient;
  doctor:  DocDoctor;
} | null;

export type DocumentRow = {
  id: string;
  consultation_id: string;
  type: DocumentType;
  content: string;
  issued_at: string | null;
  created_at: string;
  consultation: DocConsultation;
};

type ExpiryStatus = "valid" | "expiring" | "expired" | "none";
type FilterState = {
  search:   string;
  docType:  DocumentType | "all";
  dateFrom: string;
  dateTo:   string;
  expiry:   ExpiryStatus | "all";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_META: Record<DocumentType, { label: string; ring: string; text: string; bg: string }> = {
  sick_note:        { label: "Sick Note",        ring: "ring-blue-500/30",    text: "text-blue-300",    bg: "bg-blue-500/15"    },
  referral_letter:  { label: "Referral Letter",  ring: "ring-purple-500/30",  text: "text-purple-300",  bg: "bg-purple-500/15"  },
  medical_cert:     { label: "Medical Cert",     ring: "ring-green-500/30",   text: "text-green-300",   bg: "bg-green-500/15"   },
  insurance_report: { label: "Insurance Report", ring: "ring-amber-500/30",   text: "text-amber-300",   bg: "bg-amber-500/15"   },
  fit_to_fly:       { label: "Fit to Fly",       ring: "ring-sky-500/30",     text: "text-sky-300",     bg: "bg-sky-500/15"     },
  fit_to_work:      { label: "Fit to Work",      ring: "ring-emerald-500/30", text: "text-emerald-300", bg: "bg-emerald-500/15" },
  other:            { label: "Other",            ring: "ring-slate-500/30",   text: "text-slate-300",   bg: "bg-slate-500/15"   },
};

// Documents with natural expiry windows (days from issued_at)
const EXPIRY_DAYS: Partial<Record<DocumentType, number>> = {
  fit_to_fly:       14,
  insurance_report: 30,
  medical_cert:     60,
  referral_letter:  90,
  fit_to_work:      90,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docRef(id: string) {
  return `DOC-${id.slice(0, 8).toUpperCase()}`;
}

function irishDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IE", { day: "2-digit", month: "short", year: "numeric" });
}

function patientName(p: DocPatient) {
  if (!p) return "Unknown Patient";
  return `${p.first_name} ${p.last_name}`;
}

function gpName(d: DocDoctor) {
  if (!d) return "—";
  return `Dr. ${d.first_name} ${d.last_name}`;
}

function getExpiry(doc: DocumentRow): { status: ExpiryStatus; daysLeft: number | null } {
  const days = EXPIRY_DAYS[doc.type];
  if (!days || !doc.issued_at) return { status: "none", daysLeft: null };
  const expiry = new Date(doc.issued_at);
  expiry.setDate(expiry.getDate() + days);
  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0)  return { status: "expired",  daysLeft };
  if (daysLeft <= 7) return { status: "expiring", daysLeft };
  return { status: "valid", daysLeft };
}

function isDuplicate(doc: DocumentRow, all: DocumentRow[]): boolean {
  const patId   = doc.consultation?.patient?.id;
  const issued  = doc.issued_at ? new Date(doc.issued_at).getTime() : null;
  if (!patId || !issued) return false;
  const window = 30 * 86_400_000;
  return all.some(other => {
    if (other.id === doc.id) return false;
    if (other.type !== doc.type) return false;
    if (other.consultation?.patient?.id !== patId) return false;
    const t = other.issued_at ? new Date(other.issued_at).getTime() : null;
    return t !== null && Math.abs(t - issued) < window;
  });
}

// Derive "version" of a document: how many docs of same type on same consultation exist before it?
function getVersion(doc: DocumentRow, all: DocumentRow[]): number {
  const siblings = all
    .filter(d => d.consultation_id === doc.consultation_id && d.type === doc.type)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return siblings.findIndex(d => d.id === doc.id) + 1;
}

async function logAudit(
  supabase: ReturnType<typeof createClient>,
  actorId: string,
  action: "download" | "reissue",
  docId: string,
) {
  await supabase.from("audit_logs").insert({
    actor_id:   actorId,
    actor_type: "partner_doctor",
    action,
    table_name: "documents",
    record_id:  docId,
  });
}

// ─── Small components ─────────────────────────────────────────────────────────

function DocTypeBadge({ type }: { type: DocumentType }) {
  const m = DOC_META[type];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${m.bg} ${m.text} ${m.ring}`}>
      {m.label}
    </span>
  );
}

function ExpiryBadge({ status, daysLeft }: { status: ExpiryStatus; daysLeft: number | null }) {
  if (status === "none") return <span className="text-white/25 text-xs">—</span>;
  if (status === "valid") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-[11px] font-semibold text-[#86efac] ring-1 ring-[#22c55e]/25">
      <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" /> Valid
    </span>
  );
  if (status === "expiring") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/25">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> {daysLeft}d left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-300 ring-1 ring-red-500/25">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Expired
    </span>
  );
}

function DuplicateIcon() {
  return (
    <span title="Same document type issued to this patient within 30 days — possible duplicate">
      <svg className="h-3.5 w-3.5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// ─── Reissue dialog ───────────────────────────────────────────────────────────

function ReissueDialog({
  doc,
  doctor,
  onClose,
  onComplete,
}: {
  doc: DocumentRow;
  doctor: PartnerDoctor | null;
  onClose: () => void;
  onComplete: (newDoc: DocumentRow) => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleReissue() {
    if (!doctor) return;
    setLoading(true);
    setError(null);

    const { data, error: insertErr } = await supabase
      .from("documents")
      .insert({
        consultation_id: doc.consultation_id,
        type:            doc.type,
        content:         doc.content,
        issued_at:       new Date().toISOString(),
      })
      .select(`
        *,
        consultation:consultations (
          id, service_type, service_subtype, status,
          patient:patients ( id, first_name, last_name, dob ),
          doctor:partner_doctors ( first_name, last_name, imc_number )
        )
      `)
      .single();

    if (insertErr || !data) {
      setError("Failed to reissue document. Please try again.");
      setLoading(false);
      return;
    }

    await logAudit(supabase, doctor.id, "reissue", data.id);
    onComplete(data as DocumentRow);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal role="dialog">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#131c35] p-6 ring-1 ring-white/10 shadow-2xl">
        <h3 className="text-base font-semibold text-white">Reissue document?</h3>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">
          This will create a new version of{" "}
          <span className="font-medium text-white">{DOC_META[doc.type].label}</span>{" "}
          for{" "}
          <span className="font-medium text-white">{patientName(doc.consultation?.patient ?? null)}</span>.
          The original document (<span className="font-mono text-xs text-white/50">{docRef(doc.id)}</span>) will
          be permanently preserved and will not be altered.
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        )}

        <div className="mt-5 flex gap-3 justify-end">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleReissue}
            disabled={loading}
            className="rounded-xl bg-[#22c55e]/15 px-5 py-2 text-sm font-semibold text-[#86efac] ring-1 ring-[#22c55e]/30 hover:bg-[#22c55e]/25 disabled:opacity-50 transition-colors"
          >
            {loading ? "Reissuing…" : "Confirm reissue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Document detail slide-over ───────────────────────────────────────────────

function DocumentDetail({
  doc,
  allDocs,
  doctor,
  onClose,
  onReissued,
}: {
  doc: DocumentRow;
  allDocs: DocumentRow[];
  doctor: PartnerDoctor | null;
  onClose: () => void;
  onReissued: (newDoc: DocumentRow) => void;
}) {
  const supabase     = createClient();
  const [downloading, setDownloading] = useState(false);
  const [showReissue, setShowReissue] = useState(false);

  const ref     = docRef(doc.id);
  const version = getVersion(doc, allDocs);
  const { status: expiryStatus, daysLeft } = getExpiry(doc);
  const patient = doc.consultation?.patient ?? null;
  const gp      = doc.consultation?.doctor ?? null;

  // All versions of this document (same consultation + type)
  const allVersions = useMemo(() =>
    allDocs
      .filter(d => d.consultation_id === doc.consultation_id && d.type === doc.type)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [allDocs, doc],
  );

  async function handleDownload() {
    setDownloading(true);
    try {
      const { downloadDocument } = await import("@/lib/pdf/generate");
      await downloadDocument({
        ref,
        typeLabel:   DOC_META[doc.type].label,
        content:     doc.content,
        patientName: patientName(patient),
        dob:         patient?.dob ?? "",
        gpName:      gp ? `${gp.first_name} ${gp.last_name}` : "ExpressGP GP",
        imcNumber:   gp?.imc_number ?? "",
        issuedAt:    doc.issued_at ?? doc.created_at,
        version,
      });
      if (doctor) await logAudit(supabase, doctor.id, "download", doc.id);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 z-40 flex w-[520px] flex-col bg-[#0d1526] shadow-2xl ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <DocTypeBadge type={doc.type} />
            <h2 className="mt-2 text-base font-semibold text-white">{DOC_META[doc.type].label}</h2>
            <p className="mt-0.5 font-mono text-xs text-white/40">{ref}</p>
            {version > 1 && (
              <span className="mt-1.5 inline-block rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-amber-500/20">
                Version {version}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-white/35 hover:text-white transition-colors mt-0.5">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Patient */}
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">Patient</p>
            <div className="rounded-xl bg-white/[0.04] px-4 py-3.5 ring-1 ring-white/8 space-y-1">
              <p className="text-sm font-medium text-white">{patientName(patient)}</p>
              <p className="text-xs text-white/50">DOB: {irishDate(patient?.dob ?? null)}</p>
            </div>
          </section>

          {/* Issuance */}
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">Issuance</p>
            <div className="rounded-xl bg-white/[0.04] px-4 py-3.5 ring-1 ring-white/8 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Issued</span>
                <span className="text-white">{irishDate(doc.issued_at)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">GP</span>
                <span className="text-white">{gpName(gp)}</span>
              </div>
              {gp?.imc_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">IMC No.</span>
                  <span className="text-white/75">{gp.imc_number}</span>
                </div>
              )}
              <div className="flex justify-between text-sm items-center">
                <span className="text-white/50">Expiry</span>
                <ExpiryBadge status={expiryStatus} daysLeft={daysLeft} />
              </div>
              {doc.consultation && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Consultation</span>
                  <Link
                    href={`/dashboard/consultations/${doc.consultation.id}`}
                    className="font-mono text-xs text-[#86efac] hover:underline"
                  >
                    {doc.consultation.id.slice(0, 8).toUpperCase()} →
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Document content */}
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">Document Content</p>
            <div className="rounded-xl bg-white/[0.02] px-4 py-4 ring-1 ring-white/8">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-white/70 font-sans">
                {doc.content || "No content stored."}
              </pre>
            </div>
            <p className="mt-2 text-[10px] text-white/25 text-center">
              Read-only · Documents cannot be edited once issued
            </p>
          </section>

          {/* Version history */}
          {allVersions.length > 1 && (
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                Version History ({allVersions.length})
              </p>
              <div className="space-y-1.5">
                {allVersions.map((v, i) => (
                  <div
                    key={v.id}
                    className={[
                      "flex items-center justify-between rounded-xl px-4 py-3 ring-1 text-sm",
                      v.id === doc.id
                        ? "bg-white/[0.06] ring-white/15 text-white"
                        : "bg-white/[0.02] ring-white/8 text-white/50",
                    ].join(" ")}
                  >
                    <span className="font-mono text-xs">{docRef(v.id)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{irishDate(v.issued_at)}</span>
                      <span className="text-[10px] text-white/35">v{i + 1}</span>
                      {v.id === doc.id && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#86efac]">Current</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Legal notice */}
          <section className="rounded-xl bg-blue-500/[0.06] px-4 py-3.5 ring-1 ring-blue-500/15">
            <p className="text-[11px] leading-relaxed text-white/45">
              This document is part of a permanent clinical record retained for a minimum of 8 years in accordance with
              Irish medical record retention requirements (Medical Council of Ireland). It cannot be deleted or altered.
            </p>
          </section>
        </div>

        {/* Footer actions */}
        <div className="border-t border-white/10 px-6 py-4 flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#22c55e]/15 px-4 py-2.5 text-sm font-semibold text-[#86efac] ring-1 ring-[#22c55e]/30 hover:bg-[#22c55e]/25 disabled:opacity-50 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            {downloading ? "Generating…" : "Download PDF"}
          </button>
          <button
            onClick={() => setShowReissue(true)}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white/60 ring-1 ring-white/10 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4-4.64 4.36A9 9 0 013.51 15" />
            </svg>
            Reissue
          </button>
        </div>
      </aside>

      {showReissue && (
        <ReissueDialog
          doc={doc}
          doctor={doctor}
          onClose={() => setShowReissue(false)}
          onComplete={(newDoc) => {
            setShowReissue(false);
            onReissued(newDoc);
          }}
        />
      )}
    </>
  );
}

// ─── Reusable DocumentList ────────────────────────────────────────────────────
// Exported for use inside patient profile pages.

export function DocumentList({
  documents,
  onSelect,
}: {
  documents: DocumentRow[];
  onSelect: (doc: DocumentRow) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyRef = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const ref = docRef(id);
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="h-10 w-10 text-white/15 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-white/40">No documents found</p>
        <p className="mt-1 text-xs text-white/25">Documents are issued from within a consultation</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-sm">
        <thead>
          <tr className="border-b border-white/8">
            {["Reference", "Patient", "DOB", "Type", "Subtype", "Issued", "Expiry", "GP", "Actions"].map(h => (
              <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-white/35 first:pl-5 last:pr-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {documents.map(doc => {
            const { status: expiryStatus, daysLeft } = getExpiry(doc);
            const dup = isDuplicate(doc, documents);
            return (
              <tr
                key={doc.id}
                onClick={() => onSelect(doc)}
                className="group cursor-pointer transition-colors hover:bg-white/[0.03]"
              >
                {/* Reference */}
                <td className="pl-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-white/60">{docRef(doc.id)}</span>
                    {dup && <DuplicateIcon />}
                  </div>
                </td>

                {/* Patient */}
                <td className="px-3 py-3.5">
                  <span className="font-medium text-white">{patientName(doc.consultation?.patient ?? null)}</span>
                </td>

                {/* DOB */}
                <td className="px-3 py-3.5 text-white/50 whitespace-nowrap text-xs">
                  {irishDate(doc.consultation?.patient?.dob ?? null)}
                </td>

                {/* Type */}
                <td className="px-3 py-3.5">
                  <DocTypeBadge type={doc.type} />
                </td>

                {/* Subtype */}
                <td className="px-3 py-3.5 text-white/45 text-xs">
                  {doc.consultation?.service_subtype ?? "—"}
                </td>

                {/* Issued */}
                <td className="px-3 py-3.5 text-white/60 whitespace-nowrap text-xs">
                  {irishDate(doc.issued_at)}
                </td>

                {/* Expiry */}
                <td className="px-3 py-3.5">
                  <ExpiryBadge status={expiryStatus} daysLeft={daysLeft} />
                </td>

                {/* GP */}
                <td className="px-3 py-3.5 text-white/50 text-xs whitespace-nowrap">
                  {gpName(doc.consultation?.doctor ?? null)}
                </td>

                {/* Actions */}
                <td className="pr-5 py-3.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Copy ref */}
                    <button
                      onClick={(e) => copyRef(e, doc.id)}
                      title="Copy reference number"
                      className="rounded-lg p-1.5 text-white/40 hover:bg-white/8 hover:text-white transition-colors"
                    >
                      {copied === doc.id ? (
                        <svg className="h-3.5 w-3.5 text-[#22c55e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      )}
                    </button>
                    {/* Open detail */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelect(doc); }}
                      title="View document"
                      className="rounded-lg p-1.5 text-white/40 hover:bg-white/8 hover:text-white transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  onChange,
  total,
  filtered,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  total: number;
  filtered: number;
}) {
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    onChange({ ...filters, [k]: v });

  const hasActive = filters.search || filters.docType !== "all" || filters.dateFrom || filters.dateTo || filters.expiry !== "all";

  return (
    <div className="border-b border-white/10 bg-[#0f1729]/85 px-5 py-4 space-y-3 backdrop-blur">
      {/* Search + count */}
      <div className="flex items-center gap-3">
        {/* Search — flex layout avoids purged pl-* classes */}
        <div className="flex items-center gap-2 flex-1 max-w-sm rounded-lg bg-white/[0.06] px-3 py-2 ring-1 ring-white/10 focus-within:ring-[#22c55e]/40 transition-shadow">
          <svg className="h-3.5 w-3.5 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={e => set("search", e.target.value)}
            placeholder="Patient name, ref, or document content…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none min-w-0"
          />
          {filters.search && (
            <button onClick={() => set("search", "")} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <p className="ml-auto text-xs text-white/35 shrink-0 tabular-nums">
          {filtered === total ? `${total} document${total !== 1 ? "s" : ""}` : `${filtered} of ${total}`}
        </p>

        {hasActive && (
          <button
            onClick={() => onChange({ search: "", docType: "all", dateFrom: "", dateTo: "", expiry: "all" })}
            className="text-xs text-white/40 hover:text-white transition-colors shrink-0"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Document type */}
        <select
          value={filters.docType}
          onChange={e => set("docType", e.target.value as DocumentType | "all")}
          className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-white ring-1 ring-white/10 outline-none focus:ring-[#22c55e]/40 transition-shadow appearance-none"
        >
          <option value="all" className="bg-[#0f1729]">All types</option>
          {(Object.entries(DOC_META) as [DocumentType, typeof DOC_META[DocumentType]][]).map(([k, m]) => (
            <option key={k} value={k} className="bg-[#0f1729]">{m.label}</option>
          ))}
        </select>

        {/* Date range — labeled to avoid browser showing today as placeholder */}
        <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 ring-1 ring-white/10 focus-within:ring-[#22c55e]/40 transition-shadow">
          <span className="text-[10px] font-medium text-white/35 uppercase tracking-wide shrink-0">From</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => set("dateFrom", e.target.value)}
            className="bg-transparent text-xs text-white outline-none [color-scheme:dark] w-28"
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 ring-1 ring-white/10 focus-within:ring-[#22c55e]/40 transition-shadow">
          <span className="text-[10px] font-medium text-white/35 uppercase tracking-wide shrink-0">To</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => set("dateTo", e.target.value)}
            className="bg-transparent text-xs text-white outline-none [color-scheme:dark] w-28"
          />
        </div>

        {/* Expiry status */}
        <select
          value={filters.expiry}
          onChange={e => set("expiry", e.target.value as ExpiryStatus | "all")}
          className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs text-white ring-1 ring-white/10 outline-none focus:ring-[#22c55e]/40 transition-shadow appearance-none"
        >
          <option value="all"      className="bg-[#0f1729]">All expiry</option>
          <option value="valid"    className="bg-[#0f1729]">Valid</option>
          <option value="expiring" className="bg-[#0f1729]">Expiring soon</option>
          <option value="expired"  className="bg-[#0f1729]">Expired</option>
          <option value="none"     className="bg-[#0f1729]">No expiry</option>
        </select>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DocumentsClient({
  documents: initialDocs,
  doctor,
}: {
  documents: DocumentRow[];
  doctor: PartnerDoctor | null;
}) {
  const [docs,      setDocs]      = useState<DocumentRow[]>(initialDocs);
  const [selected,  setSelected]  = useState<DocumentRow | null>(null);
  const [filters,   setFilters]   = useState<FilterState>({
    search: "", docType: "all", dateFrom: "", dateTo: "", expiry: "all",
  });

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return docs.filter(doc => {
      // Text search: patient name, ref, content
      if (q) {
        const name = patientName(doc.consultation?.patient ?? null).toLowerCase();
        const ref  = docRef(doc.id).toLowerCase();
        const body = doc.content.toLowerCase();
        if (!name.includes(q) && !ref.includes(q) && !body.includes(q)) return false;
      }
      // Type
      if (filters.docType !== "all" && doc.type !== filters.docType) return false;
      // Date range
      if (filters.dateFrom && doc.issued_at && doc.issued_at < filters.dateFrom) return false;
      if (filters.dateTo   && doc.issued_at && doc.issued_at.slice(0, 10) > filters.dateTo) return false;
      // Expiry
      if (filters.expiry !== "all") {
        const { status } = getExpiry(doc);
        if (status !== filters.expiry) return false;
      }
      return true;
    });
  }, [docs, filters]);

  // Alerts: expiring docs (within 7 days, not already expired)
  const expiryAlerts = useMemo(() =>
    docs.filter(d => getExpiry(d).status === "expiring"),
    [docs],
  );

  function handleReissued(newDoc: DocumentRow) {
    setDocs(prev => [newDoc, ...prev]);
    setSelected(newDoc);
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 py-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-light tracking-[0.04em] text-white">Documents</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/40">Clinical document registry</span>
              <span className="text-white/15">·</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/30 ring-1 ring-white/10">
                Read-only
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300/70 ring-1 ring-blue-500/20">
                GDPR compliant
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/30 ring-1 ring-white/10">
                8-yr retention
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expiryAlerts.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-500/25">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {expiryAlerts.length} expiring soon
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Expiry alert banner */}
      {expiryAlerts.length > 0 && (
        <div className="border-b border-amber-500/20 bg-amber-500/[0.04] px-5 py-3">
          <p className="text-xs text-amber-300/80">
            <span className="font-semibold">{expiryAlerts.length} document{expiryAlerts.length !== 1 ? "s" : ""}</span>{" "}
            {expiryAlerts.length === 1 ? "is" : "are"} expiring within 7 days —{" "}
            {expiryAlerts.map(d => `${DOC_META[d.type].label} for ${patientName(d.consultation?.patient ?? null)}`).join(", ")}.
            {" "}Consider reissuing if the patient still requires the document.
          </p>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        total={docs.length}
        filtered={filtered.length}
      />

      {/* Table */}
      <main className="flex-1">
        <DocumentList documents={filtered} onSelect={setSelected} />
      </main>

      {/* Data retention footer */}
      <footer className="border-t border-white/8 px-5 py-4">
        <div className="flex items-center gap-2 text-[11px] text-white/25">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v4m0 4h.01" />
          </svg>
          <span>
            All documents are retained for a minimum of <strong className="text-white/40">8 years</strong> in accordance
            with Irish medical record retention requirements (Medical Council of Ireland guidance, 2015).
            Documents cannot be deleted or altered once issued. Reissuing creates a new version; all versions are permanently preserved.
            For GDPR data subject access requests, contact <span className="text-white/40">dpo@expressgp.ie</span>.
          </span>
        </div>
      </footer>

      {/* Detail slide-over */}
      {selected && (
        <DocumentDetail
          doc={selected}
          allDocs={docs}
          doctor={doctor}
          onClose={() => setSelected(null)}
          onReissued={handleReissued}
        />
      )}
    </div>
  );
}
