"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getServiceConfig } from "@/lib/config/services";
import type { ServiceType, ConsultationStatus } from "@/types";

type RecentConsultation = {
  id: string;
  service_type: ServiceType;
  service_subtype: string | null;
  status: ConsultationStatus;
  created_at: string;
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

export default function DashboardPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recent, setRecent] = useState<RecentConsultation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        if (!cancelled) {
          setError(sessionError.message);
          setLoading(false);
        }
        return;
      }

      const userId = sessionData.session?.user.id;
      if (!userId) {
        router.push("/login");
        return;
      }

      // Fire all queries in parallel.
      const [patientRes, recentRes, totalRes, pendingRes, approvedRes] =
        await Promise.all([
          supabase
            .from("patients")
            .select("first_name")
            .eq("id", userId)
            .single(),
          supabase
            .from("consultations")
            .select(
              "id, service_type, service_subtype, status, created_at",
            )
            .eq("patient_id", userId)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("consultations")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", userId),
          supabase
            .from("consultations")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", userId)
            .eq("status", "pending"),
          supabase
            .from("consultations")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", userId)
            .eq("status", "approved"),
        ]);

      if (cancelled) return;

      if (patientRes.error) {
        setError(patientRes.error.message);
      } else {
        setFirstName(patientRes.data?.first_name ?? null);
      }

      if (!recentRes.error) {
        setRecent((recentRes.data ?? []) as RecentConsultation[]);
      }
      setTotalCount(totalRes.count ?? 0);
      setPendingCount(pendingRes.count ?? 0);
      setApprovedCount(approvedRes.count ?? 0);

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex flex-1 flex-col bg-[#F9FAFB]">
      <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
        {/* Welcome + sign out */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#28A863]">
              Patient dashboard
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0F2744] sm:text-4xl">
              {loading
                ? "Welcome back…"
                : firstName
                  ? `Welcome back, ${firstName}`
                  : "Welcome back"}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0F2744] transition hover:border-[#2FB36F] hover:text-[#2FB36F]"
          >
            Sign out
          </button>
        </div>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Stat cards */}
        <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard
            label="Total Requests"
            value={loading ? "—" : String(totalCount)}
            colour="#0F2744"
          />
          <StatCard
            label="Pending Review"
            value={loading ? "—" : String(pendingCount)}
            colour="#F59E0B"
          />
          <StatCard
            label="Approved"
            value={loading ? "—" : String(approvedCount)}
            colour="#28A863"
          />
        </ul>

        {/* Recent consultations */}
        <div className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0F2744]">
              Recent Consultations
            </h2>
            {recent.length > 0 && (
              <Link
                href="/consultations"
                className="text-sm font-medium text-[#2F6FB6] hover:text-[#2FB36F]"
              >
                View all →
              </Link>
            )}
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-[#6B7280]">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
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
            <ul className="mt-6 space-y-4">
              {recent.map((c) => {
                const config = getServiceConfig(c.service_type);
                const serviceLabel = config?.label ?? c.service_type;
                const subtypeLabel =
                  config?.subtypes.find(
                    (s) => s.value === c.service_subtype,
                  )?.label ?? null;
                const status = statusDisplay[c.status];

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
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F9FAFB] px-3 py-1 text-xs font-medium text-[#0F2744]">
                          <span
                            aria-hidden
                            className="h-2 w-2 rounded-full"
                            style={{ background: status.dot }}
                          />
                          {status.label}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Action cards */}
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <li>
            <Link
              href="/"
              className="group flex h-full flex-col rounded-2xl border border-gray-100 border-l-4 border-l-[#28A863] bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-[#0F2744]">
                New Consultation
              </h3>
              <p className="mt-2 text-sm text-[#6B7280]">
                Start a new request — prescription, sick note, referral or
                more.
              </p>
              <span className="mt-6 text-sm font-medium text-[#2F6FB6] opacity-0 transition group-hover:opacity-100">
                Start →
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/documents"
              className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-[#0F2744]">
                My Documents
              </h3>
              <p className="mt-2 text-sm text-[#6B7280]">
                View your approved sick notes, prescriptions and referrals.
              </p>
              <span className="mt-6 text-sm font-medium text-[#2F6FB6] opacity-0 transition group-hover:opacity-100">
                View →
              </span>
            </Link>
          </li>
        </ul>
      </main>
    </div>
  );
}

function StatCard(props: {
  label: string;
  value: string;
  colour: string;
}) {
  return (
    <li className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="text-sm text-[#6B7280]">{props.label}</p>
      <p
        className="mt-2 text-3xl font-bold"
        style={{ color: props.colour }}
      >
        {props.value}
      </p>
    </li>
  );
}
