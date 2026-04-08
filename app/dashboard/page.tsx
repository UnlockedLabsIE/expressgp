import Image from "next/image";
import Link from "next/link";

type NavItem = {
  label: string;
  href: string;
};

type StatTone = "approved" | "pending" | "declined" | "active" | "neutral";

function toneClasses(tone: StatTone) {
  switch (tone) {
    case "approved":
      return {
        ring: "ring-1 ring-[#22c55e]/25",
        accent: "border-l-[#22c55e]",
        badge: "bg-[#22c55e]/12 text-[#166534] ring-1 ring-[#22c55e]/25",
      };
    case "pending":
      return {
        ring: "ring-1 ring-amber-500/20",
        accent: "border-l-amber-500",
        badge: "bg-amber-500/12 text-amber-800 ring-1 ring-amber-500/25",
      };
    case "declined":
      return {
        ring: "ring-1 ring-red-500/20",
        accent: "border-l-red-500",
        badge: "bg-red-500/12 text-red-800 ring-1 ring-red-500/25",
      };
    case "active":
      return {
        ring: "ring-1 ring-blue-500/20",
        accent: "border-l-blue-500",
        badge: "bg-blue-500/12 text-blue-800 ring-1 ring-blue-500/25",
      };
    default:
      return {
        ring: "ring-1 ring-slate-200",
        accent: "border-l-slate-200",
        badge: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
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
      className={`h-full rounded-2xl bg-slate-50 p-5 border-l-4 ${c.accent} ring-1 ring-slate-200/70`}
      role="group"
      aria-label={props.label}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{props.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {props.value}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${c.badge}`}
          >
            {props.hint}
          </span>
          <span className="text-xs text-slate-500">Today</span>
        </div>
      </div>
    </div>
  );
}

function ConsultationRow(props: {
  id: string;
  patient: string;
  service: string;
  status: "approved" | "pending" | "declined";
  submittedAt: string;
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

  return (
    <div className="grid grid-cols-12 items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-50">
      <div className="col-span-12 sm:col-span-3">
        <p className="text-sm font-semibold text-slate-900">{props.patient}</p>
        <p className="mt-0.5 text-xs text-slate-500">{props.id}</p>
      </div>
      <div className="col-span-7 sm:col-span-5">
        <p className="text-sm text-slate-800">{props.service}</p>
      </div>
      <div className="col-span-5 sm:col-span-2">
        <span
          className={`inline-flex w-full items-center justify-center rounded-full px-2.5 py-1 text-xs font-medium ${c.badge}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="col-span-12 sm:col-span-2 sm:text-right">
        <p className="text-xs text-slate-500">{props.submittedAt}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
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
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <span className="text-xs font-semibold tracking-wide text-white/90">
                GP
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                GP Dashboard
              </p>
              <p className="truncate text-xs text-white/60">
                ExpressGP clinician workspace
              </p>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === "/dashboard";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/10 text-white ring-1 ring-white/15"
                      : "text-white/75 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <span>{item.label}</span>
                  {isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                  ) : null}
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
                <div className="relative h-6 w-[112px] overflow-hidden rounded-md">
                  <Image
                    src="/logo.png"
                    alt="ExpressGP"
                    fill
                    priority
                    sizes="112px"
                    className="object-cover opacity-90"
                    style={{ objectPosition: "50% 45%" }}
                  />
                </div>
                <span className="hidden h-6 w-px bg-white/15 sm:inline" />
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-white">
                    Clinical dashboard
                  </p>
                  <p className="text-xs text-white/60">
                    Focused triage and consultation management
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
                <button className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white/90">
                  New consultation
                </button>
                <button className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15">
                  View all
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-slate-100 p-5 ring-1 ring-white/10">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200/70 lg:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Recent consultations
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Quickly review what’s new and what needs attention.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/consultations"
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Open queue
                  </Link>
                </div>

                <div className="mt-4 rounded-xl ring-1 ring-slate-200">
                  <div className="hidden grid-cols-12 gap-3 border-b border-slate-200/70 bg-white/60 px-3 py-2 text-xs font-semibold text-slate-600 sm:grid">
                    <div className="col-span-3">Patient</div>
                    <div className="col-span-5">Service</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Submitted</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <ConsultationRow
                      id="CONS-1042"
                      patient="Aoife Murphy"
                      service="Sick note — flu symptoms"
                      status="pending"
                      submittedAt="09:14"
                    />
                    <ConsultationRow
                      id="CONS-1038"
                      patient="Seán O’Neill"
                      service="Prescription renewal — asthma inhaler"
                      status="approved"
                      submittedAt="08:46"
                    />
                    <ConsultationRow
                      id="CONS-1031"
                      patient="Niamh Walsh"
                      service="Referral letter — orthopaedics"
                      status="declined"
                      submittedAt="07:58"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200/70">
                <h2 className="text-base font-semibold text-slate-900">
                  Status breakdown
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Your queue health at a glance.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">Approved</span>
                      <span className="font-semibold text-[#22c55e]">64%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-2 w-[64%] rounded-full bg-[#22c55e]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">Pending</span>
                      <span className="font-semibold text-amber-600">28%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-2 w-[28%] rounded-full bg-amber-500" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">Declined</span>
                      <span className="font-semibold text-red-600">8%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-2 w-[8%] rounded-full bg-red-500" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">
                    Scan-friendly tips
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" />
                      Prioritise amber items to keep queue time low.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      Use templates for repeat prescription renewals.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      Declines should include a clear next step for patients.
                    </li>
                  </ul>
                </div>
              </div>
              </section>
            </div>

            <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
              ExpressGP clinician tools — keep patient data secure and decisions documented.
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

