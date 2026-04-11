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
      admin
        .from("partner_doctors")
        .select("*", { count: "exact", head: true })
        .eq("is_accepting_cases", true),
      admin.from("patients").select("*", { count: "exact", head: true }),
      admin.from("consultations").select("*", { count: "exact", head: true }),
      admin
        .from("consultations")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "in_progress"]),
      admin.from("documents").select("*", { count: "exact", head: true }),
      admin
        .from("audit_logs")
        .select("id, action, table_name, actor_type, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      admin
        .from("partner_doctors")
        .select("id, first_name, last_name, email, is_accepting_cases, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
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
    return {
      totalGPs: 0,
      activeGPs: 0,
      totalPatients: 0,
      totalConsultations: 0,
      openConsultations: 0,
      totalDocuments: 0,
      recentAudit: [],
      recentGPs: [],
    };
  }
}

function StatCard({
  label,
  value,
  sub,
  accent = "amber",
  href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "amber" | "green" | "blue" | "red";
  href?: string;
}) {
  const colors = {
    amber: { bg: "rgba(251,191,36,0.08)", ring: "rgba(251,191,36,0.20)", text: "#fbbf24" },
    green: { bg: "rgba(34,197,94,0.08)", ring: "rgba(34,197,94,0.20)", text: "#22c55e" },
    blue:  { bg: "rgba(99,102,241,0.08)", ring: "rgba(99,102,241,0.20)", text: "#818cf8" },
    red:   { bg: "rgba(239,68,68,0.08)", ring: "rgba(239,68,68,0.20)", text: "#f87171" },
  }[accent];

  const card = (
    <div
      className="rounded-2xl p-5 transition-colors"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.ring}`,
      }}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: colors.text }}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90">
        {card}
      </Link>
    );
  }
  return card;
}

function irishDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminOverviewPage() {
  noStore();
  const stats = await getStats();

  return (
    <main className="px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-amber-400">
            Live
          </span>
        </div>
        <p className="mt-1 text-sm text-white/45">
          Real-time view of the ExpressGP platform.
        </p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Partner GPs"
          value={stats.totalGPs}
          sub={`${stats.activeGPs} currently accepting cases`}
          accent="amber"
          href="/admin/gps"
        />
        <StatCard
          label="Registered Patients"
          value={stats.totalPatients}
          accent="blue"
          href="/admin/patients"
        />
        <StatCard
          label="Total Consultations"
          value={stats.totalConsultations}
          sub={`${stats.openConsultations} open`}
          accent="green"
        />
        <StatCard
          label="Open Consultations"
          value={stats.openConsultations}
          accent={stats.openConsultations > 10 ? "red" : "green"}
        />
        <StatCard
          label="Documents Issued"
          value={stats.totalDocuments}
          accent="blue"
        />
        <StatCard
          label="Audit Events"
          value="View log"
          accent="amber"
          href="/admin/audit"
        />
      </div>

      {/* Two-column detail rows */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">

        {/* Recent audit events */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Audit Events</h2>
            <Link href="/admin/audit" className="text-xs text-amber-400 hover:text-amber-300">
              View all →
            </Link>
          </div>
          {stats.recentAudit.length === 0 ? (
            <p className="text-sm text-white/35">No audit events yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentAudit.map((ev: Record<string, unknown>) => (
                <li key={String(ev.id)} className="flex items-start gap-3">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/80">
                      <span className="font-semibold capitalize text-white">{String(ev.action)}</span>
                      {" on "}
                      <span className="text-amber-300/80">{String(ev.table_name)}</span>
                      {" by "}
                      <span className="capitalize">{String(ev.actor_type)}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/35">
                      {irishDate(String(ev.created_at))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recently added GPs */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Partner GPs</h2>
            <Link href="/admin/gps" className="text-xs text-amber-400 hover:text-amber-300">
              Manage →
            </Link>
          </div>
          {stats.recentGPs.length === 0 ? (
            <p className="text-sm text-white/35">No GPs registered yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentGPs.map((gp: Record<string, unknown>) => (
                <li key={String(gp.id)}>
                  <Link
                    href={`/admin/gps/${gp.id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/5"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-500/10 text-[11px] font-bold text-amber-300 ring-1 ring-amber-500/20">
                      {String(gp.first_name ?? "?")[0]}{String(gp.last_name ?? "?")[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        Dr. {String(gp.first_name)} {String(gp.last_name)}
                      </p>
                      <p className="truncate text-xs text-white/40">{String(gp.email ?? "")}</p>
                    </div>
                    <span
                      className={[
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        gp.is_accepting_cases
                          ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                          : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20",
                      ].join(" ")}
                    >
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
      <section className="mt-6 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5">
        <h2 className="mb-4 text-sm font-semibold text-amber-300">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/gps"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Manage GPs
          </Link>
          <Link
            href="/admin/patients"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Patient Records
          </Link>
          <Link
            href="/admin/audit"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Audit Log
          </Link>
          <Link
            href="/admin/config"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Platform Config
          </Link>
        </div>
      </section>
    </main>
  );
}
