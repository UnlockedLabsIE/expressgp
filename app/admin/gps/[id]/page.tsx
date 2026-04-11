import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import GPAvailabilityToggle from "../GPAvailabilityToggle";

export const metadata = { title: "GP Profile — Admin" };

function irishDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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
      admin
        .from("partner_doctors")
        .select("*")
        .eq("id", id)
        .single(),
      admin
        .from("consultations")
        .select("id, status, service_type, created_at, patient:patients(first_name, last_name)")
        .eq("doctor_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      admin
        .from("documents")
        .select("id, type, ref_number, created_at, consultation:consultations(patient:patients(first_name, last_name))")
        .eq("consultation.doctor_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (!gpRes.data) notFound();
    gp = gpRes.data;
    consultations = consultRes.data ?? [];
    documents = docRes.data ?? [];
  } catch {
    notFound();
  }

  if (!gp) notFound();

  const initials = `${String(gp.first_name ?? "?")[0]}${String(gp.last_name ?? "?")[0]}`.toUpperCase();

  return (
    <main className="px-6 py-8">
      {/* Back */}
      <Link
        href="/admin/gps"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to GPs
      </Link>

      {/* GP header card */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-start gap-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-xl font-bold text-amber-300 ring-1 ring-amber-500/20">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">
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
            <GPAvailabilityToggle
              gpId={String(gp.id)}
              initialValue={Boolean(gp.is_accepting_cases)}
            />
          </div>
        </div>

        {/* Detail fields */}
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent consultations */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">
            Recent Consultations
            <span className="ml-2 text-xs font-normal text-white/35">last 10</span>
          </h2>
          {consultations.length === 0 ? (
            <p className="text-sm text-white/35">No consultations yet.</p>
          ) : (
            <ul className="space-y-2">
              {consultations.map((c) => {
                const patient = c.patient as Record<string, unknown> | null;
                return (
                  <li key={String(c.id)} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5">
                    <span
                      className={[
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        c.status === "completed" ? "bg-green-400" :
                        c.status === "cancelled" ? "bg-red-400" : "bg-amber-400",
                      ].join(" ")}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white/80">
                        {patient ? `${String(patient.first_name)} ${String(patient.last_name)}` : "Unknown patient"}
                      </p>
                      <p className="text-[11px] text-white/35 capitalize">
                        {String(c.service_type ?? "").replace(/_/g, " ")} · {String(c.status)}
                      </p>
                    </div>
                    <p className="shrink-0 text-[11px] text-white/30">
                      {c.created_at ? new Date(String(c.created_at)).toLocaleDateString("en-IE") : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent documents */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">
            Recent Documents
            <span className="ml-2 text-xs font-normal text-white/35">last 10</span>
          </h2>
          {documents.length === 0 ? (
            <p className="text-sm text-white/35">No documents yet.</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((d) => (
                <li key={String(d.id)} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/80 capitalize">
                      {String(d.type ?? "Document").replace(/_/g, " ")}
                    </p>
                    <p className="font-mono text-[11px] text-white/35">{String(d.ref_number ?? "")}</p>
                  </div>
                  <p className="shrink-0 text-[11px] text-white/30">
                    {d.created_at ? new Date(String(d.created_at)).toLocaleDateString("en-IE") : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
