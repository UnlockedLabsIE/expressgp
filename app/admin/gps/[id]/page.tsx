import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import GPAvailabilityToggle from "../GPAvailabilityToggle";

export const metadata = { title: "GP Profile — Admin" };

function irishDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function AdminGPDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const { id } = await params;

  let gp: Record<string, unknown> | null = null;
  let consultations: Record<string, unknown>[] = [];
  let documents: Record<string, unknown>[] = [];

  try {
    const admin = createAdminSupabaseClient();
    const [gpRes, consultRes, docRes] = await Promise.all([
      admin.from("partner_doctors").select("*").eq("id", id).single(),
      admin.from("consultations")
        .select("id, status, service_type, created_at, patient:patients(first_name, last_name)")
        .eq("doctor_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      admin.from("documents")
        .select("id, type, ref_number, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (!gpRes.data) notFound();
    gp = gpRes.data;
    consultations = consultRes.data ?? [];
    documents = docRes.data ?? [];

    // ISO 27001 — every access to GP clinical data must be logged
    const { data: { user } } = await admin.auth.getUser();
    void admin.from("audit_logs").insert({
      actor_id:   user?.id ?? null,
      actor_type: "admin",
      action:     "clinical_data_viewed",
      table_name: "partner_doctors",
      record_id:  id,
      new_value:  { viewed_by: user?.id ?? null, context: "admin_gp_detail" },
    });
  } catch {
    notFound();
  }

  if (!gp) notFound();

  const initials = `${String(gp.first_name ?? "?")[0]}${String(gp.last_name ?? "?")[0]}`.toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-4 pt-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/admin/gps" className="text-sm text-white/45 transition-colors hover:text-white">
            ← GPs
          </Link>
          <span className="text-white/20">/</span>
          <p className="text-sm text-white/70">
            Dr. {String(gp.first_name)} {String(gp.last_name)}
          </p>
        </div>
      </header>

      <main className="px-5 py-6">
        {/* GP header card */}
        <div className="mb-5 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="flex items-start gap-5">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10 text-xl font-bold text-white/70 ring-1 ring-white/10">
              {initials}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Dr. {String(gp.first_name)} {String(gp.last_name)}
              </h1>
              <p className="mt-0.5 text-sm text-white/45">{String(gp.email ?? "")}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <span className="text-xs text-white/40">
                  IMC: <span className="font-mono text-white/70">{String(gp.imc_number ?? "—")}</span>
                </span>
                <span className="text-xs text-white/40">
                  Joined: <span className="text-white/70">{gp.created_at ? irishDate(String(gp.created_at)) : "—"}</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-white/40">Accepting cases</span>
              <GPAvailabilityToggle gpId={String(gp.id)} initialValue={Boolean(gp.is_accepting_cases)} />
            </div>
          </div>

          {/* Detail fields */}
          {[gp.phone, gp.address, gp.specialisation, gp.bio].some(Boolean) && (
            <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Phone", value: gp.phone },
                { label: "Address", value: gp.address },
                { label: "Specialisation", value: gp.specialisation },
                { label: "Bio", value: gp.bio },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <p className="text-xs font-medium text-white/35">{label}</p>
                    <p className="mt-0.5 text-sm text-white/80">{String(value)}</p>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Recent consultations */}
          <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <h2 className="mb-4 text-base font-semibold text-white">
              Recent Consultations
              <span className="ml-2 text-xs font-normal text-white/35">last 10</span>
            </h2>
            {consultations.length === 0 ? (
              <p className="text-sm text-white/40">No consultations yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {consultations.map((c) => {
                  const patient = c.patient as Record<string, unknown> | null;
                  const statusDot =
                    c.status === "completed" ? "bg-[#22c55e]" :
                    c.status === "cancelled" ? "bg-red-400" : "bg-blue-400";
                  return (
                    <li key={String(c.id)} className="flex items-center gap-3 py-2.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/80">
                          {patient ? `${String(patient.first_name)} ${String(patient.last_name)}` : "Unknown patient"}
                        </p>
                        <p className="text-xs text-white/40 capitalize">
                          {String(c.service_type ?? "").replace(/_/g, " ")} · {String(c.status)}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-white/30">
                        {c.created_at ? new Date(String(c.created_at)).toLocaleDateString("en-IE") : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Recent documents */}
          <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <h2 className="mb-4 text-base font-semibold text-white">
              Recent Documents
              <span className="ml-2 text-xs font-normal text-white/35">last 10</span>
            </h2>
            {documents.length === 0 ? (
              <p className="text-sm text-white/40">No documents yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {documents.map((d) => (
                  <li key={String(d.id)} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/80 capitalize">
                        {String(d.type ?? "Document").replace(/_/g, " ")}
                      </p>
                      <p className="font-mono text-xs text-white/35">{String(d.ref_number ?? "")}</p>
                    </div>
                    <p className="shrink-0 text-xs text-white/30">
                      {d.created_at ? new Date(String(d.created_at)).toLocaleDateString("en-IE") : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-white/35">
          Availability overrides are audit-logged under your admin account.
        </footer>
      </main>
    </>
  );
}
