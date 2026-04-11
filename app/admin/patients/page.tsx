import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export const metadata = { title: "Patients — Admin" };

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  noStore();
  const { q } = await searchParams;

  let patients: Record<string, unknown>[] = [];
  try {
    const admin = createAdminSupabaseClient();
    let query = admin
      .from("patients")
      .select("id, first_name, last_name, dob, email, created_at, anonymised_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (q) {
      query = query.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`
      );
    }

    const { data } = await query;
    patients = data ?? [];
  } catch {
    // Service role key not configured
  }

  return (
    <main className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Patients</h1>
        <p className="mt-1 text-sm text-white/45">
          {patients.length} patient{patients.length !== 1 ? "s" : ""} shown
          {q ? ` for "${q}"` : " · 100 most recent"}
        </p>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6">
        <div className="relative max-w-md">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/25 outline-none focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15"
          />
        </div>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {patients.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-white/35">
              {q ? `No patients matching "${q}"` : "No patients registered yet."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">DOB</th>
                <th className="px-5 py-3">Registered</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {patients.map((p) => {
                const isAnonymised = Boolean(p.anonymised_at);
                const dob = p.dob
                  ? new Date(String(p.dob)).toLocaleDateString("en-IE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";
                const registered = p.created_at
                  ? new Date(String(p.created_at)).toLocaleDateString("en-IE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";

                return (
                  <tr key={String(p.id)} className="group transition-colors hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <p className={["font-medium", isAnonymised ? "text-white/35 line-through" : "text-white"].join(" ")}>
                        {isAnonymised ? "[Anonymised]" : `${String(p.first_name ?? "")} ${String(p.last_name ?? "")}`}
                      </p>
                      {!isAnonymised && (
                        <p className="text-xs text-white/40">{String(p.email ?? "")}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-white/55">{dob}</td>
                    <td className="px-5 py-4 text-xs text-white/45">{registered}</td>
                    <td className="px-5 py-4">
                      {isAnonymised ? (
                        <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-500/20">
                          Anonymised
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-400 ring-1 ring-green-500/20">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/patients/${p.id}`}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* GDPR notice */}
      <p className="mt-4 text-xs text-white/25">
        Patient data shown here is protected under GDPR. Anonymisation is irreversible and should only be actioned on receipt of a verified Right to Erasure request.
      </p>
    </main>
  );
}
