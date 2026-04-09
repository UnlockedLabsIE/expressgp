"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getServiceConfig } from "@/lib/config/services";
import type { ServiceType, ConsultationStatus, PaymentStatus } from "@/types";

type ConsultationRow = {
  id: string;
  service_type: ServiceType;
  service_subtype: string | null;
  status: ConsultationStatus;
  created_at: string;
  payment_status: PaymentStatus;
};

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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default function ConsultationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);

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
        .from("consultations")
        .select(
          "id, service_type, service_subtype, status, created_at, payment_status",
        )
        .eq("patient_id", userId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setConsultations((data ?? []) as ConsultationRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex flex-1 flex-col bg-[#F9FAFB]">
      <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:py-16">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#2F6FB6] hover:text-[#2FB36F]"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0F2744] sm:text-4xl">
              My Consultations
            </h1>
            <p className="mt-2 text-base text-[#6B7280]">
              All your past and current requests.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-[#28A863] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            New consultation →
          </Link>
        </div>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-10 text-sm text-[#6B7280]">Loading…</p>
        ) : consultations.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-base font-medium text-[#0F2744]">
              No consultations yet
            </p>
            <p className="mt-2 text-sm text-[#6B7280]">
              When you submit a request to a GP it will appear here.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#28A863] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Start your first request →
            </Link>
          </div>
        ) : (
          <ul className="mt-10 space-y-4">
            {consultations.map((c) => {
              const config = getServiceConfig(c.service_type);
              const serviceLabel = config?.label ?? c.service_type;
              const subtypeLabel = findSubtypeLabel(
                c.service_type,
                c.service_subtype,
              );
              const status = statusDisplay[c.status];
              const paid = c.payment_status === "paid";

              return (
                <li key={c.id}>
                  <Link
                    href={`/consultation/${c.id}/confirmed`}
                    className="group block rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2FB36F] hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[#0F2744]">
                          {serviceLabel}
                          {subtypeLabel && (
                            <span className="font-normal text-[#6B7280]">
                              {" "}
                              · {subtypeLabel}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-[#9CA3AF]">
                          Submitted {formatDateTime(c.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F9FAFB] px-3 py-1 text-xs font-medium text-[#0F2744]">
                          <span
                            aria-hidden
                            className="h-2 w-2 rounded-full"
                            style={{ background: status.dot }}
                          />
                          {status.label}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            paid
                              ? "bg-[#F0FDF4] text-[#28A863]"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {paid ? "Paid" : "Payment pending"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
