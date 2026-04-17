"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type AuditRow = {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogClient() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, table_name, record_id, new_value, created_at")
        .eq("actor_id", user.id)
        .eq("actor_type", "partner_doctor")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) console.error("[audit-log]", error.message);
      setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen px-5 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Your audit log</h1>
          <p className="mt-1 text-sm text-white/45">
            Actions recorded under your partner GP account on ExpressGP (v1: your actions only).
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="shrink-0 rounded-xl bg-white/8 px-4 py-2 text-sm text-white/80 ring-1 ring-white/10 hover:bg-white/12"
        >
          ← Settings
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-white/40">
            No audit entries yet. Activity such as profile updates and clinical record views will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wide text-white/35">
                  <th className="px-4 py-3 pl-5">When</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3 pr-5">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id} className="text-white/80">
                    <td className="whitespace-nowrap px-4 py-3 pl-5 text-white/55">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-white/90">{r.action}</td>
                    <td className="px-4 py-3 text-white/60">{r.table_name}</td>
                    <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-white/45">
                      {r.record_id ?? "—"}
                    </td>
                    <td className="max-w-md px-4 py-3 pr-5 text-xs text-white/50">
                      {r.new_value ? JSON.stringify(r.new_value) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-white/30">
        Audit entries are retained in line with ExpressGP records management. This list is read-only.
        If you notice activity you did not perform, contact administration immediately.
      </p>
    </div>
  );
}
