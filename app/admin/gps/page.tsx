import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import GPAvailabilityToggle from "./GPAvailabilityToggle";

export const metadata = { title: "Partner GPs — Admin" };

export default async function AdminGPsPage() {
  noStore();

  let gps: Record<string, unknown>[] = [];
  try {
    const admin = createAdminSupabaseClient();
    const { data } = await admin
      .from("partner_doctors")
      .select("id, first_name, last_name, email, imc_number, is_accepting_cases, out_of_office_until, created_at")
      .order("created_at", { ascending: false });
    gps = data ?? [];
  } catch {
    // Service role key not configured
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-4 pt-6 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-xl font-light tracking-[0.04em] text-white">Admin Portal</p>
          <Link
            href="/admin/gps/invite"
            className="rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#0f1729] transition-colors hover:bg-[#22c55e]/90"
          >
            + Invite GP
          </Link>
        </div>
      </header>

      <main className="px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Partner GPs</h1>
          <p className="mt-1 text-sm text-white/65">
            {gps.length} GP{gps.length !== 1 ? "s" : ""} registered on the platform.
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
          {gps.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-white/40">
                {process.env.SUPABASE_SERVICE_ROLE_KEY === "your-service-role-key-here"
                  ? "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to load data."
                  : "No GPs registered yet."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                  <th className="px-5 py-3">GP</th>
                  <th className="px-5 py-3">IMC No.</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Accepting Cases</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {gps.map((gp) => {
                  const initials = `${String(gp.first_name ?? "?")[0]}${String(gp.last_name ?? "?")[0]}`.toUpperCase();
                  const joinedDate = new Date(String(gp.created_at)).toLocaleDateString("en-IE", {
                    day: "2-digit", month: "short", year: "numeric",
                  });

                  return (
                    <tr key={String(gp.id)} className="group transition-colors hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold text-white/70 ring-1 ring-white/10">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              Dr. {String(gp.first_name)} {String(gp.last_name)}
                            </p>
                            <p className="text-xs text-white/45">{String(gp.email ?? "")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-white/55">
                        {String(gp.imc_number ?? "—")}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-[#22c55e]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#86efac] ring-1 ring-[#22c55e]/25">
                          Active
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <GPAvailabilityToggle
                          gpId={String(gp.id)}
                          initialValue={Boolean(gp.is_accepting_cases)}
                        />
                      </td>
                      <td className="px-5 py-4 text-xs text-white/45">{joinedDate}</td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/gps/${gp.id}`}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          View profile
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-white/35">
          GP availability overrides are audit-logged.
        </footer>
      </main>
    </>
  );
}
