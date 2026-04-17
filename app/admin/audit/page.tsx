import { unstable_noStore as noStore } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export const metadata = { title: "Audit Log — Admin" };

const ACTION_BADGE: Record<string, string> = {
  download:              "bg-blue-500/15 text-blue-300 ring-blue-500/20",
  reissue:               "bg-orange-500/15 text-orange-300 ring-orange-500/20",
  anonymise:             "bg-red-500/15 text-red-300 ring-red-500/20",
  availability_override: "bg-purple-500/15 text-purple-300 ring-purple-500/20",
  create:                "bg-[#22c55e]/15 text-[#86efac] ring-[#22c55e]/20",
  update:                "bg-white/10 text-white/55 ring-white/10",
  delete:                "bg-red-500/15 text-red-300 ring-red-500/20",
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_BADGE[action.toLowerCase()] ?? "bg-white/10 text-white/45 ring-white/10";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${cls}`}>
      {action.replace(/_/g, " ")}
    </span>
  );
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; actor?: string; page?: string }>;
}) {
  noStore();
  const { table, actor, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  let events: Record<string, unknown>[] = [];
  let totalCount = 0;
  let tables: string[] = [];

  try {
    const admin = createAdminSupabaseClient();

    const { data: tableRows } = await admin.from("audit_logs").select("table_name").order("table_name");
    const seen = new Set<string>();
    for (const r of tableRows ?? []) {
      if (r.table_name) seen.add(r.table_name);
    }
    tables = Array.from(seen);

    let query = admin
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (table) query = query.eq("table_name", table);
    if (actor) query = query.eq("actor_type", actor);

    const { data, count } = await query;
    events = data ?? [];
    totalCount = count ?? 0;
  } catch {
    // Service role key not configured
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function buildHref(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { table, actor, page: String(page), ...overrides };
    if (merged.table) p.set("table", merged.table);
    if (merged.actor) p.set("actor", merged.actor);
    if (merged.page && merged.page !== "1") p.set("page", merged.page);
    const qs = p.toString();
    return `/admin/audit${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-4 pt-6 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-xl font-light tracking-[0.04em] text-white">Admin Portal</p>
          <span className="text-xs text-white/40 tabular-nums">
            {totalCount.toLocaleString()} event{totalCount !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <main className="px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Audit Log</h1>
          <p className="mt-1 text-sm text-white/65">
            Immutable record of all platform actions.
            {table ? ` Filtered to ${table}.` : ""}
            {actor ? ` By ${actor}.` : ""}
          </p>
        </div>

        {/* Filters */}
        <form method="GET" className="mb-5 flex flex-wrap items-center gap-3">
          <select
            name="table"
            defaultValue={table ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:border-white/20"
          >
            <option value="">All tables</option>
            {tables.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            name="actor"
            defaultValue={actor ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:border-white/20"
          >
            <option value="">All actors</option>
            <option value="partner_doctor">Partner GP</option>
            <option value="admin">Admin</option>
            <option value="system">System</option>
            <option value="patient">Patient</option>
          </select>

          <button
            type="submit"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
          >
            Apply
          </button>

          {(table || actor) && (
            <a
              href="/admin/audit"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/45 ring-1 ring-white/10 transition-colors hover:text-white"
            >
              Clear
            </a>
          )}
        </form>

        {/* Table */}
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
          {events.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-white/40">No audit events found.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Table</th>
                  <th className="px-5 py-3">Record</th>
                  <th className="px-5 py-3">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {events.map((ev) => {
                  const ts = ev.created_at
                    ? new Date(String(ev.created_at)).toLocaleString("en-IE", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })
                    : "—";

                  const actorDot =
                    ev.actor_type === "admin" ? "bg-slate-400" :
                    ev.actor_type === "partner_doctor" ? "bg-[#22c55e]" :
                    ev.actor_type === "patient" ? "bg-blue-400" : "bg-white/20";

                  return (
                    <tr key={String(ev.id)} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-3 font-mono text-xs text-white/45 whitespace-nowrap">{ts}</td>
                      <td className="px-5 py-3"><ActionBadge action={String(ev.action ?? "")} /></td>
                      <td className="px-5 py-3 text-xs text-white/60">{String(ev.table_name ?? "—")}</td>
                      <td className="px-5 py-3 font-mono text-[11px] text-white/35">
                        {String(ev.record_id ?? "—").slice(0, 8)}…
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${actorDot}`} aria-hidden />
                          <span className="text-xs text-white/55 capitalize">
                            {String(ev.actor_type ?? "—").replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-white/35">
              Page {page} of {totalPages} · {totalCount.toLocaleString()} events
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={buildHref({ page: String(page - 1) })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                  ← Previous
                </a>
              )}
              {page < totalPages && (
                <a href={buildHref({ page: String(page + 1) })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                  Next →
                </a>
              )}
            </div>
          </div>
        )}

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-white/35">
          Audit events are immutable — they cannot be edited or deleted.
        </footer>
      </main>
    </>
  );
}
