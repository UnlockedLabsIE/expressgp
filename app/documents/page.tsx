"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getServiceConfig } from "@/lib/config/services";
import type { ServiceType, DocumentType } from "@/types";

type DocumentRow = {
  id: string;
  type: DocumentType;
  content: string;
  issued_at: string | null;
  service_type: ServiceType;
  service_subtype: string | null;
};

const typeBadge: Record<DocumentType, { label: string; bg: string; text: string }> = {
  sick_note:        { label: "Sick Note",         bg: "bg-[#F0FDF4]", text: "text-[#28A863]" },
  fit_to_work:      { label: "Fit to Work",       bg: "bg-[#F0FDF4]", text: "text-[#28A863]" },
  fit_to_fly:       { label: "Fit to Fly",        bg: "bg-[#EFF6FF]", text: "text-[#2F6FB6]" },
  medical_cert:     { label: "Medical Cert",      bg: "bg-[#EFF6FF]", text: "text-[#2F6FB6]" },
  referral_letter:  { label: "Referral Letter",   bg: "bg-[#F5F3FF]", text: "text-[#7C3AED]" },
  insurance_report: { label: "Insurance Report",  bg: "bg-amber-50",  text: "text-amber-700" },
  other:            { label: "Other",             bg: "bg-gray-100",  text: "text-[#6B7280]" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function findSubtypeLabel(
  serviceType: ServiceType,
  value: string | null,
): string | null {
  if (!value) return null;
  const config = getServiceConfig(serviceType);
  return config?.subtypes.find((s) => s.value === value)?.label ?? null;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [viewing, setViewing] = useState<DocumentRow | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (cancelled) return;
      const userId = sessionData.session?.user.id;
      if (!userId) {
        router.push("/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("documents")
        .select(
          "id, type, content, issued_at, consultations!inner(service_type, service_subtype, patient_id)",
        )
        .eq("consultations.patient_id", userId)
        .order("issued_at", { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        // Flatten the joined row — Supabase returns the joined table as a
        // nested object (or array with a single element for !inner).
        const rows: DocumentRow[] = ((data ?? []) as unknown[]).map(
          (raw: unknown) => {
            const r = raw as {
              id: string;
              type: DocumentType;
              content: string;
              issued_at: string | null;
              consultations: {
                service_type: ServiceType;
                service_subtype: string | null;
              };
            };
            return {
              id: r.id,
              type: r.type,
              content: r.content,
              issued_at: r.issued_at,
              service_type: r.consultations.service_type,
              service_subtype: r.consultations.service_subtype,
            };
          },
        );
        setDocuments(rows);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be blocked — fall back silently.
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-[#F9FAFB]">
      <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:py-16">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#2F6FB6] hover:text-[#2FB36F]"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#0F2744] sm:text-4xl">
          My Documents
        </h1>
        <p className="mt-2 text-base text-[#6B7280]">
          Your approved sick notes, prescriptions and referrals.
        </p>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-10 text-sm text-[#6B7280]">Loading…</p>
        ) : documents.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-base font-medium text-[#0F2744]">
              No documents yet
            </p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Documents appear here once your GP approves your request.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#28A863] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Start a new request →
            </Link>
          </div>
        ) : (
          <ul className="mt-10 space-y-4">
            {documents.map((doc) => {
              const badge = typeBadge[doc.type] ?? typeBadge.other;
              const subtypeLabel = findSubtypeLabel(
                doc.service_type,
                doc.service_subtype,
              );

              return (
                <li
                  key={doc.id}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                      {subtypeLabel && (
                        <p className="mt-2 text-sm text-[#6B7280]">
                          {subtypeLabel}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[#9CA3AF]">
                        Issued {formatDate(doc.issued_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {doc.content && (
                        <button
                          type="button"
                          onClick={() => setViewing(doc)}
                          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0F2744] transition hover:border-[#2FB36F] hover:text-[#2FB36F]"
                        >
                          View Document
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleCopy(doc.content)}
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0F2744] transition hover:border-[#2FB36F] hover:text-[#2FB36F]"
                      >
                        {copied ? "Copied!" : "Download"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Document modal */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#0F2744]">
                  {(typeBadge[viewing.type] ?? typeBadge.other).label}
                </h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Issued {formatDate(viewing.issued_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[#6B7280] transition hover:bg-gray-100 hover:text-[#0F2744]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-6 max-h-[60vh] overflow-y-auto rounded-lg bg-gray-50 p-4 font-mono text-sm leading-6 text-[#0F2744] whitespace-pre-wrap">
              {viewing.content}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-[#0F2744] transition hover:border-[#2FB36F] hover:text-[#2FB36F]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
