"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  getServiceConfig,
  type ServiceConfig,
} from "@/lib/config/services";
import type { ServiceType, ConsultationStatus } from "@/types";

type Params = { id: string };

type Consultation = {
  service_type: ServiceType;
  service_subtype: string | null;
  created_at: string;
  status: ConsultationStatus;
};

// DB status → patient-facing label + dot colour.
const statusDisplay: Record<
  ConsultationStatus,
  { label: string; dot: string }
> = {
  pending: { label: "Pending GP review", dot: "#F59E0B" },
  under_review: { label: "Under GP review", dot: "#2F6FB6" },
  more_info_required: { label: "More information needed", dot: "#F97316" },
  approved: { label: "Approved", dot: "#28A863" },
  declined: { label: "Declined", dot: "#DC2626" },
  cancelled: { label: "Cancelled", dot: "#6B7280" },
};

function findSubtypeLabel(
  config: ServiceConfig | undefined,
  value: string | null,
): string | null {
  if (!config || !value) return null;
  return config.subtypes.find((s) => s.value === value)?.label ?? null;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConsultationConfirmedPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error: fetchError } = await supabase
        .from("consultations")
        .select("service_type, service_subtype, created_at, status")
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (fetchError || !data) {
        setError(fetchError?.message ?? "Could not load this consultation.");
      } else {
        setConsultation(data as Consultation);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const config = consultation
    ? getServiceConfig(consultation.service_type)
    : undefined;
  const subtypeLabel = consultation
    ? findSubtypeLabel(config, consultation.service_subtype)
    : null;
  const status = consultation ? statusDisplay[consultation.status] : null;
  const serviceLabel = config?.label ?? consultation?.service_type ?? "";

  return (
    <div className="flex flex-1 flex-col bg-[#F9FAFB]">
      <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-20">
        {loading ? (
          <p className="text-center text-sm text-[#6B7280]">Loading…</p>
        ) : error || !consultation || !status ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-red-700">
              {error ?? "Consultation not found."}
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block text-sm font-medium text-[#2F6FB6] hover:text-[#2FB36F]"
            >
              ← Back to dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Big green check */}
            <div className="flex justify-center">
              <span
                aria-hidden
                className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#F0FDF4]"
              >
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#28A863"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="8 12 11 15 16 9" />
                </svg>
              </span>
            </div>

            <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-[#0F2744] sm:text-4xl">
              Request submitted
            </h1>
            <p className="mt-3 text-center text-base text-[#6B7280]">
              Your GP will review your case and respond today.
            </p>

            {/* Summary card */}
            <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <dl className="space-y-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[#6B7280]">Service</dt>
                  <dd className="text-right font-medium text-[#0F2744]">
                    {serviceLabel}
                  </dd>
                </div>
                {subtypeLabel && (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-[#6B7280]">Type</dt>
                    <dd className="text-right font-medium text-[#0F2744]">
                      {subtypeLabel}
                    </dd>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[#6B7280]">Status</dt>
                  <dd className="flex items-center gap-2 text-right font-medium text-[#0F2744]">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: status.dot }}
                    />
                    {status.label}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3 border-t border-gray-100 pt-4">
                  <dt className="text-[#6B7280]">Submitted</dt>
                  <dd className="text-right font-medium text-[#0F2744]">
                    {formatDateTime(consultation.created_at)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-[#28A863] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                View my consultations →
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-[#0F2744] transition hover:border-[#2FB36F] hover:text-[#2FB36F]"
              >
                Submit another request
              </Link>
            </div>

            <p className="mt-8 text-center text-xs text-[#9CA3AF]">
              🔒 Your information is encrypted and confidential
            </p>
          </>
        )}
      </main>
    </div>
  );
}
