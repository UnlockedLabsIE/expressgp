import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export const metadata = { title: "Admin Overview — ExpressGP" };

async function getStats() {
  try {
    const admin = createAdminSupabaseClient();

    const [
      { count: totalGPs },
      { count: activeGPs },
      { count: totalPatients },
      { count: totalConsultations },
      { count: openConsultations },
      { count: totalDocuments },
      { data: recentAudit },
      { data: recentGPs },
    ] = await Promise.all([
      admin.from("partner_doctors").select("*", { count: "exact", head: true }),
      admin.from("partner_doctors").select("*", { count: "exact", head: true }).eq("is_accepting_cases", true),
      admin.from("patients").select("*", { count: "exact", head: true }),
      admin.from("consultations").select("*", { count: "exact", head: true }),
      admin.from("consultations").select("*", { count: "exact", head: true }).in("status", ["pending", "in_progress"]),
      admin.from("documents").select("*", { count: "exact", head: true }),
      admin.from("audit_logs").select("id, action, table_name, actor_type, created_at").order("created_at", { ascending: false }).limit(8),
      admin.from("partner_doctors").select("id, first_name, last_name, email, is_accepting_cases, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    return {
      totalGPs: totalGPs ?? 0,
      activeGPs: activeGPs ?? 0,
      totalPatients: totalPatients ?? 0,
      totalConsultations: totalConsultations ?? 0,
      openConsultations: openConsultations ?? 0,
      totalDocuments: totalDocuments ?? 0,
      recentAudit: recentAudit ?? [],
      recentGPs: recentGPs ?? [],
    };
  } catch {
    return { totalGPs: 0, activeGPs: 0, totalPatients: 0, totalConsultations: 0, openConsultations: 0, totalDocuments: 0, recentAudit: [], recentGPs: [] };
  }
}

function StatCard({
  label,
  value,
  sub,
  accent = "green",
  href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "green" | "blue" | "red";
  href?: string;
}) {
  const borderColor = {
    green: "border-l-[#22c55e]",
    blue:  "border-l-blue-500",
    red:   "border-l-red-500",
  }[accent];

  const valueColor = {
    green: "text-[#86efac]",
    blue:  "text-blue-300",
    red:   "text-red-300",
  }[accent];

  const card = (
    <div className={`rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 border-l-4 ${borderColor} h-full`}>
      <p className="text-xs font-medium uppercase tracking-wider text-white/55">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-white/45">{sub}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {card}
      </Link>
    );
  }
  return card;
}

function irishDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function AdminOverviewPage() {
  noStore();
  const stats = await getStats();

  return (
    <>
      {/* Sticky header — matches GP dashboard pattern */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-4 pt-6 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-xl font-light tracking-[0.04em] text-white">Admin Portal</p>
          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10">
            <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            Super admin
          </div>
        </div>
      </header>

      <main className="px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Platform Overview</h1>
          <p className="mt-1 text-sm text-white/65">Real-time view of the ExpressGP platform.</p>
        </div>

        {/* Stat grid */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Partner GPs" value={stats.totalGPs} sub={`${stats.activeGPs} currently accepting cases`} accent="green" href="/admin/gps" />
          <StatCard label="Registered Patients" value={stats.totalPatients} accent="blue" href="/admin/patients" />
          <StatCard label="Total Consultations" value={stats.totalConsultations} sub={`${stats.openConsultations} open`} accent="green" />
          <StatCard label="Open Consultations" value={stats.openConsultations} accent={stats.openConsultations > 10 ? "red" : "green"} />
          <StatCard label="Documents Issued" value={stats.totalDocuments} accent="blue" />
          <StatCard label="Audit Log" value="View →" accent="blue" href="/admin/audit" />
        </section>

        {/* Two-column sections */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">

          {/* Recent audit events */}
          <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Recent Audit Events</h2>
              <Link href="/admin/audit" className="text-xs text-[#86efac]/70 hover:text-[#86efac]">View all →</Link>
            </div>
            {stats.recentAudit.length === 0 ? (
              <p className="text-sm text-white/40">No audit events yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {stats.recentAudit.map((ev: Record<string, unknown>) => (
                  <li key={String(ev.id)} className="flex items-start gap-3 py-2.5">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white/80">
                        <span className="font-semibold capitalize text-white">{String(ev.action).replace(/_/g, " ")}</span>
                        {" on "}
                        <span className="text-white/60">{String(ev.table_name)}</span>
                        {" by "}
                        <span className="capitalize text-white/60">{String(ev.actor_type).replace(/_/g, " ")}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-white/35">{irishDate(String(ev.created_at))}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Partner GPs */}
          <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Partner GPs</h2>
              <Link href="/admin/gps" className="text-xs text-[#86efac]/70 hover:text-[#86efac]">Manage →</Link>
            </div>
            {stats.recentGPs.length === 0 ? (
              <p className="text-sm text-white/40">No GPs registered yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {stats.recentGPs.map((gp: Record<string, unknown>) => (
                  <li key={String(gp.id)}>
                    <Link href={`/admin/gps/${gp.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold text-white/70 ring-1 ring-white/10">
                        {String(gp.first_name ?? "?")[0]}{String(gp.last_name ?? "?")[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          Dr. {String(gp.first_name)} {String(gp.last_name)}
                        </p>
                        <p className="truncate text-xs text-white/45">{String(gp.email ?? "")}</p>
                      </div>
                      <span className={[
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
                        gp.is_accepting_cases
                          ? "bg-[#22c55e]/10 text-[#86efac] ring-[#22c55e]/25"
                          : "bg-red-500/10 text-red-300 ring-red-500/20",
                      ].join(" ")}>
                        {gp.is_accepting_cases ? "Active" : "Inactive"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Quick actions */}
        <section className="mt-5 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
          <h2 className="mb-4 text-base font-semibold text-white">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Manage GPs", href: "/admin/gps" },
              { label: "Patient Records", href: "/admin/patients" },
              { label: "Audit Log", href: "/admin/audit" },
              { label: "Platform Config", href: "/admin/config" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-white/35">
          ExpressGP admin tools — handle patient data and GP management with care.
        </footer>
      </main>
    </>
  );
}
