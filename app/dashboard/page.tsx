"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

type ServiceTypeKey = "Prescription" | "Certificate" | "Referral" | "GP consult";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  return "Just now";
}

function ServiceTypeIcon({ type }: { type: ServiceTypeKey }) {
  const className = "h-4 w-4 shrink-0 text-white/70";
  switch (type) {
    case "Prescription":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <title>Prescription</title>
          <rect x="5" y="9" width="14" height="6" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <line x1="12" y1="11" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "Certificate":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <title>Document</title>
          <path
            d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="17" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "Referral":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <title>Referral</title>
          <path
            d="M5 12h12m0 0-4-4m4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "GP consult":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <title>Consultation</title>
          <path
            d="M4 10c0-2 3-4 6-4s6 2 6 4v2a4 4 0 0 1-4 4h-1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="18" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M20.5 11.5 22 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

type StatTone = "approved" | "pending" | "declined" | "active" | "neutral";

function toneClasses(tone: StatTone) {
  switch (tone) {
    case "approved":
      return {
        accent: "border-l-[#22c55e]",
        badge: "bg-[#22c55e]/15 text-[#bbf7d0] ring-1 ring-[#22c55e]/25",
      };
    case "pending":
      return {
        accent: "border-l-amber-500",
        badge: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25",
      };
    case "declined":
      return {
        accent: "border-l-red-500",
        badge: "bg-red-500/15 text-red-200 ring-1 ring-red-500/25",
      };
    case "active":
      return {
        accent: "border-l-blue-500",
        badge: "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/25",
      };
    default:
      return {
        accent: "border-l-white/15",
        badge: "bg-white/10 text-white/80 ring-1 ring-white/15",
      };
  }
}

function StatCard(props: {
  label: string;
  value: string;
  tone: StatTone;
  hint: string;
}) {
  const c = toneClasses(props.tone);
  return (
    <div
      className={`h-full rounded-2xl bg-white/5 p-5 border-l-4 ${c.accent} ring-1 ring-white/10`}
      role="group"
      aria-label={props.label}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/70">{props.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {props.value}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${c.badge}`}
          >
            {props.hint}
          </span>
          <span className="text-xs text-white/55">Today</span>
        </div>
      </div>
    </div>
  );
}

function ConsultationRow(props: {
  id: string;
  patient: string;
  service: string;
  serviceType: ServiceTypeKey;
  status: "approved" | "pending" | "declined";
  createdAt: Date;
  red_flag_triggered: boolean;
}) {
  const statusTone: StatTone =
    props.status === "approved"
      ? "approved"
      : props.status === "pending"
        ? "pending"
        : "declined";
  const c = toneClasses(statusTone);

  const statusLabel =
    props.status === "approved"
      ? "Approved"
      : props.status === "pending"
        ? "Pending"
        : "Declined";

  const relativeSubmitted = formatRelativeTime(props.createdAt);

  return (
    <div className="grid grid-cols-12 items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/5">
      <div className="col-span-12 sm:col-span-3">
        <p className="text-sm font-semibold text-white">{props.patient}</p>
        <p className="mt-0.5 text-xs text-white/55">{props.id}</p>
      </div>
      <div className="col-span-7 sm:col-span-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
            <ServiceTypeIcon type={props.serviceType} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/85">{props.service}</p>
            {props.red_flag_triggered ? (
              <span className="mt-1 inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300 ring-1 ring-red-500/40">
                Red flag
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="col-span-5 sm:col-span-2">
        <span
          className={`inline-flex w-full items-center justify-center rounded-full px-2.5 py-1 text-xs font-medium ${c.badge}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="col-span-12 sm:col-span-2 sm:text-right">
        <p className="text-xs text-white/55">{relativeSubmitted}</p>
      </div>
    </div>
  );
}

type ConsultationRecord = {
  id: string;
  patient: string;
  service: string;
  type: "Referral" | "Prescription" | "Certificate" | "GP consult";
  serviceType: ServiceTypeKey;
  status: "approved" | "pending" | "declined";
  createdAt: Date;
  red_flag_triggered: boolean;
};

function buildDemoConsultations(): ConsultationRecord[] {
  const now = Date.now();
  return [
    {
      id: "CONS-1031",
      patient: "Niamh Walsh",
      service: "Referral letter — orthopaedics",
      type: "Referral",
      serviceType: "Referral",
      status: "declined",
      createdAt: new Date(now - 5 * 60 * 60 * 1000),
      red_flag_triggered: false,
    },
    {
      id: "CONS-1038",
      patient: "Seán O’Neill",
      service: "Prescription renewal — asthma inhaler",
      type: "Prescription",
      serviceType: "Prescription",
      status: "approved",
      createdAt: new Date(now - 3 * 60 * 60 * 1000),
      red_flag_triggered: false,
    },
    {
      id: "CONS-1042",
      patient: "Aoife Murphy",
      service: "Sick note — flu symptoms",
      type: "Certificate",
      serviceType: "Certificate",
      status: "pending",
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
      red_flag_triggered: true,
    },
    {
      id: "CONS-1044",
      patient: "Cian Byrne",
      service: "GP consultation — persistent cough",
      type: "GP consult",
      serviceType: "GP consult",
      status: "pending",
      createdAt: new Date(now - 45 * 60 * 1000),
      red_flag_triggered: false,
    },
  ];
}

export default function DashboardPage() {
  const consultations = useMemo(() => buildDemoConsultations(), []);
  const unreadMessages = 3;

  const [queueStatus, setQueueStatus] = useState<
    "awaiting_decision" | "all" | "pending" | "approved" | "declined"
  >("awaiting_decision");
  const [caseType, setCaseType] = useState<"all" | string>("all");
  const [query, setQuery] = useState("");

  const filteredConsultations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const desiredStatus =
      queueStatus === "awaiting_decision"
        ? "pending"
        : queueStatus === "all"
          ? null
          : queueStatus;

    return consultations
      .filter((c) => {
        if (desiredStatus && c.status !== desiredStatus) return false;
        if (caseType !== "all" && c.type !== caseType) return false;
        if (!normalizedQuery) return true;
        return (
          c.patient.toLowerCase().includes(normalizedQuery) ||
          c.id.toLowerCase().includes(normalizedQuery) ||
          c.service.toLowerCase().includes(normalizedQuery)
        );
      })
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); // oldest first
  }, [caseType, consultations, query, queueStatus]);

  const navItems: NavItem[] = [
    { label: "Overview", href: "/dashboard" },
    { label: "Consultations", href: "/dashboard/consultations" },
    { label: "Messages", href: "/dashboard/messages" },
    { label: "Prescriptions", href: "/dashboard/prescriptions" },
    { label: "Documents", href: "/dashboard/documents" },
    { label: "Patients", href: "/dashboard/patients" },
    { label: "Settings", href: "/dashboard/settings" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1729] text-slate-100">
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 px-5 py-6 md:block">
          <div className="relative h-12 w-full overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
            <Image
              src="/logo.png"
              alt="ExpressGP"
              fill
              priority
              sizes="232px"
              className="object-cover opacity-95"
              style={{ objectPosition: "50% 45%" }}
            />
          </div>

          <div className="mt-5 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#22c55e]/15 text-xs font-semibold tracking-tight text-[#86efac] ring-1 ring-[#22c55e]/35"
                aria-hidden
              >
                JO
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {"Dr. John O'Donovan"}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/55">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e] shadow-[0_0_0_2px_rgba(34,197,94,0.25)]"
                    aria-hidden
                  />
                  Partner GP · Signed in
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === "/dashboard";
              const isMessages = item.href === "/dashboard/messages";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/10 text-white ring-1 ring-white/15"
                      : "text-white/75 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {isMessages && unreadMessages > 0 ? (
                    <span
                      className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full border border-red-400/35 bg-red-500/15 px-1.5 text-[11px] font-semibold tabular-nums leading-none text-red-200"
                      aria-label={`${unreadMessages} unread messages`}
                    >
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  ) : null}
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center"
                    aria-hidden
                  >
                    {isActive ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-sm font-semibold text-white">Quick actions</p>
            <p className="mt-1 text-xs leading-5 text-white/60">
              Jump to your queue and resolve pending items quickly.
            </p>
            <div className="mt-4 grid gap-2">
              <button className="w-full rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white/90">
                Open pending queue
              </button>
              <button className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15">
                Start video consult
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="hidden sm:block">
                  <p className="text-lg font-semibold tracking-tight text-white">
                    Doctor Dashboard
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10 sm:flex">
                  <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                  Service healthy
                </div>
                <button className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15">
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <main className="px-5 py-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  Overview
                </h1>
                <p className="mt-1 text-sm text-white/65">
                  A fast scan of today’s workload and your current queue.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15">
                  View all
                </button>
              </div>
            </div>

            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Pending reviews"
                  value="12"
                  tone="pending"
                  hint="Needs clinician action"
                />
                <StatCard
                  label="Approved today"
                  value="28"
                  tone="approved"
                  hint="Completed decisions"
                />
                <StatCard
                  label="Declined today"
                  value="3"
                  tone="declined"
                  hint="Requires follow-up"
                />
                <StatCard
                  label="Active consultations"
                  value="7"
                  tone="active"
                  hint="In progress"
                />
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 lg:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Recent consultations
                    </h2>
                    <p className="mt-1 text-sm text-white/60">
                      Awaiting decision by default. Oldest items are shown first.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/consultations"
                    className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white/90"
                  >
                    Open queue
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                    <label className="text-xs font-medium text-white/70">
                      Queue
                    </label>
                    <select
                      value={queueStatus}
                      onChange={(e) =>
                        setQueueStatus(
                          e.target.value as
                            | "awaiting_decision"
                            | "all"
                            | "pending"
                            | "approved"
                            | "declined",
                        )
                      }
                      className="bg-transparent text-sm text-white outline-none"
                    >
                      <option value="awaiting_decision">Awaiting decision</option>
                      <option value="all">All cases</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                    <label className="text-xs font-medium text-white/70">
                      Type
                    </label>
                    <select
                      value={caseType}
                      onChange={(e) => setCaseType(e.target.value)}
                      className="bg-transparent text-sm text-white outline-none"
                    >
                      <option value="all">All</option>
                      <option value="GP consult">GP consult</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Certificate">Certificate</option>
                      <option value="Referral">Referral</option>
                    </select>
                  </div>

                  <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                    <label className="text-xs font-medium text-white/70">
                      Search
                    </label>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Patient, ID, keyword…"
                      className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
                    />
                  </div>

                  <div className="ml-auto text-xs text-white/55">
                    {filteredConsultations.length} shown
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-[#0f1729]/35 ring-1 ring-white/10">
                  <div className="hidden grid-cols-12 gap-3 border-b border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 sm:grid">
                    <div className="col-span-3">Patient</div>
                    <div className="col-span-5">Service</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Submitted</div>
                  </div>
                  <div className="divide-y divide-white/10">
                    {filteredConsultations.map((c) => (
                      <ConsultationRow
                        key={c.id}
                        id={c.id}
                        patient={c.patient}
                        service={c.service}
                        serviceType={c.serviceType}
                        status={c.status}
                        createdAt={c.createdAt}
                        red_flag_triggered={c.red_flag_triggered}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <h2 className="text-base font-semibold text-white">
                  Status breakdown
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Your queue health at a glance.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white/85">Approved</span>
                      <span className="font-semibold text-[#22c55e]">64%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div className="h-2 w-[64%] rounded-full bg-[#22c55e]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white/85">Pending</span>
                      <span className="font-semibold text-amber-600">28%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div className="h-2 w-[28%] rounded-full bg-amber-500" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white/85">Declined</span>
                      <span className="font-semibold text-red-600">8%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div className="h-2 w-[8%] rounded-full bg-red-500" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
              ExpressGP clinician tools — keep patient data secure and decisions documented.
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

