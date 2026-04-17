import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import GDPRAnonymiseButton from "./GDPRAnonymiseButton";

export const metadata = { title: "Patient Detail — Admin" };

function irishDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const { id } = await params;

  let patient: Record<string, unknown> | null = null;
  let consultations: Record<string, unknown>[] = [];
  let auditEvents: Record<string, unknown>[] = [];

  try {
    const admin = createAdminSupabaseClient();
    const [patRes, consultRes, auditRes] = await Promise.all([
      admin.from("patients").select("*").eq("id", id).single(),
      admin.from("consultations")
        .select("id, status, service_type, service_subtype, created_at, doctor:partner_doctors(first_name, last_name)")
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
      admin.from("audit_logs")
        .select("id, action, actor_type, created_at, metadata")
        .eq("record_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (!patRes.data) notFound();
    patient = patRes.data;
    consultations = consultRes.data ?? [];
    auditEvents = auditRes.data ?? [];

    // ISO 27001 — every access to patient PII must be logged
    const { data: { user } } = await admin.auth.getUser();
    void admin.from("audit_logs").insert({
      actor_id:   user?.id ?? null,
      actor_type: "admin",
      action:     "clinical_data_viewed",
      table_name: "patients",
      record_id:  id,
      new_value:  { viewed_by: user?.id ?? null, context: "admin_patient_detail" },
    });
  } catch {
    notFound();
  }

  if (!patient) notFound();

  const isAnonymised = Boolean(patient.anonymised_at);
  const fullName = isAnonymised
    ? "[Anonymised]"
    : `${String(patient.first_name ?? "")} ${String(patient.last_name ?? "")}`;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-4 pt-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/admin/patients" className="text-sm text-white/45 transition-colors hover:text-white">
            ← Patients
          </Link>
          <span className="text-white/20">/</span>
          <p className="text-sm text-white/70">{fullName}</p>
        </div>
      </header>

      <main className="px-5 py-6">
        {/* Patient header */}
        <div className="mb-5 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className={["text-xl font-semibold tracking-tight", isAnonymised ? "text-white/35" : "text-white"].join(" ")}>
                  {fullName}
                </h1>
                {isAnonymised ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/45 ring-1 ring-white/10">
                    GDPR Anonymised
                  </span>
                ) : (
                  <span className="rounded-full bg-[#22c55e]/10 px-2.5 py-0.5 text-xs font-semibold text-[#86efac] ring-1 ring-[#22c55e]/25">
                    Active
                  </span>
                )}
              </div>
              {isAnonymised && patient.anonymised_at ? (
                <p className="mt-1 text-xs text-white/35">
                  Anonymised on {irishDate(String(patient.anonymised_at))} per GDPR Article 17 right to erasure.
                </p>
              ) : null}
            </div>

            {!isAnonymised && (
              <GDPRAnonymiseButton patientId={String(patient.id)} patientName={fullName} />
            )}
          </div>

          {/* PII fields — only if not anonymised */}
          {!isAnonymised && (
            <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  { label: "Date of Birth", value: patient.dob ? irishDate(String(patient.dob)) : null },
                  { label: "Email", value: patient.email ? String(patient.email) : null },
                  { label: "Phone", value: patient.phone ? String(patient.phone) : null },
                  { label: "Address", value: patient.address ? String(patient.address) : null },
                  { label: "PPS Number", value: patient.pps_number ? "••••••••" : null },
                  { label: "Registered", value: patient.created_at ? irishDate(String(patient.created_at)) : null },
                ] as { label: string; value: string | null }[]
              ).map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <p className="text-xs font-medium text-white/35">{label}</p>
                    <p className="mt-0.5 text-sm text-white/80">{value}</p>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* After anonymisation — show only non-PII */}
          {isAnonymised && (
            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-white/35">Date of Birth</p>
                  <p className="mt-0.5 text-sm text-white/80">{patient.dob ? irishDate(String(patient.dob)) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-white/35">Registered</p>
                  <p className="mt-0.5 text-sm text-white/80">{patient.created_at ? irishDate(String(patient.created_at)) : "—"}</p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-300/80">
                Contact details (name, email, phone, address) have been nulled out. DOB retained for clinical record integrity.
                All consultation and document records are preserved per the 8-year Irish medical retention requirement.
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Consultation history */}
          <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <h2 className="mb-4 text-base font-semibold text-white">
              Consultation History
              <span className="ml-2 text-xs font-normal text-white/35">{consultations.length} total</span>
            </h2>
            {consultations.length === 0 ? (
              <p className="text-sm text-white/40">No consultations.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto pr-1">
                {consultations.map((c) => {
                  const doctor = c.doctor as Record<string, unknown> | null;
                  const statusDot =
                    c.status === "completed" ? "bg-[#22c55e]" :
                    c.status === "cancelled" ? "bg-red-400" : "bg-blue-400";
                  return (
                    <li key={String(c.id)} className="flex items-center gap-3 py-2.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/80 capitalize">
                          {String(c.service_type ?? "").replace(/_/g, " ")}
                          {c.service_subtype ? ` · ${String(c.service_subtype).replace(/_/g, " ")}` : ""}
                        </p>
                        <p className="text-xs text-white/40">
                          {doctor ? `Dr. ${String(doctor.first_name)} ${String(doctor.last_name)}` : "No doctor assigned"}
                          {" · "}
                          <span className="capitalize">{String(c.status)}</span>
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

          {/* Audit trail */}
          <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <h2 className="mb-4 text-base font-semibold text-white">
              Audit Trail
              <span className="ml-2 text-xs font-normal text-white/35">events on this record</span>
            </h2>
            {auditEvents.length === 0 ? (
              <p className="text-sm text-white/40">No audit events.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto pr-1">
                {auditEvents.map((ev) => (
                  <li key={String(ev.id)} className="flex items-start gap-3 py-2.5">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/80 capitalize">
                        <span className="font-semibold text-white">{String(ev.action).replace(/_/g, " ")}</span>
                        {" by "}
                        <span className="capitalize">{String(ev.actor_type)}</span>
                      </p>
                      <p className="text-xs text-white/35">
                        {ev.created_at ? new Date(String(ev.created_at)).toLocaleString("en-IE") : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
          <p className="text-xs text-white/25">
            Patient records are subject to Irish medical data retention requirements (8 years minimum).
            GDPR right to erasure requests are fulfilled by anonymising PII while preserving clinical records per Article 17(3)(b).
            All actions on this page are audit-logged.
          </p>
        </div>

        <footer className="mt-6 border-t border-white/10 pt-6 text-xs text-white/35">
          ExpressGP admin tools — handle patient data and GP management with care.
        </footer>
      </main>
    </>
  );
}
