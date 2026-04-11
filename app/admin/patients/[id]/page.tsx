import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import GDPRAnonymiseButton from "./GDPRAnonymiseButton";

export const metadata = { title: "Patient Detail — Admin" };

function irishDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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
      admin
        .from("consultations")
        .select("id, status, service_type, service_subtype, created_at, doctor:partner_doctors(first_name, last_name)")
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
      admin
        .from("audit_logs")
        .select("id, action, actor_type, created_at, metadata")
        .eq("record_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (!patRes.data) notFound();
    patient = patRes.data;
    consultations = consultRes.data ?? [];
    auditEvents = auditRes.data ?? [];
  } catch {
    notFound();
  }

  if (!patient) notFound();

  const isAnonymised = Boolean(patient.anonymised_at);
  const fullName = isAnonymised
    ? "[Anonymised]"
    : `${String(patient.first_name ?? "")} ${String(patient.last_name ?? "")}`;

  return (
    <main className="px-6 py-8">
      {/* Back */}
      <Link
        href="/admin/patients"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to Patients
      </Link>

      {/* Patient header */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className={["text-xl font-bold", isAnonymised ? "text-white/40" : "text-white"].join(" ")}>
                {fullName}
              </h1>
              {isAnonymised ? (
                <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400 ring-1 ring-slate-500/20">
                  GDPR Anonymised
                </span>
              ) : (
                <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400 ring-1 ring-green-500/20">
                  Active
                </span>
              )}
            </div>
            {isAnonymised && patient.anonymised_at ? (
              <p className="mt-1 text-xs text-white/35">
                Anonymised on {irishDate(String(patient.anonymised_at))} per GDPR Article 17 right to erasure.
                Clinical records are retained per Irish medical retention requirements.
              </p>
            ) : null}
          </div>

          {/* GDPR anonymise button — only shown if not already anonymised */}
          {!isAnonymised && (
            <GDPRAnonymiseButton
              patientId={String(patient.id)}
              patientName={fullName}
            />
          )}
        </div>

        {/* PII fields — shown only if not anonymised */}
        {!isAnonymised && (
          <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { label: "Date of Birth", value: patient.dob ? irishDate(String(patient.dob)) : null },
                { label: "Email", value: patient.email ? String(patient.email) : null },
                { label: "Phone", value: patient.phone ? String(patient.phone) : null },
                { label: "Address", value: patient.address ? String(patient.address) : null },
                { label: "PPS Number", value: patient.pps_number ? "••••••••" : null },
                {
                  label: "Registered",
                  value: patient.created_at ? irishDate(String(patient.created_at)) : null,
                },
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

        {/* After anonymisation, show only non-PII fields */}
        {isAnonymised && (
          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-white/35">Date of Birth</p>
                <p className="mt-0.5 text-sm text-white/80">
                  {patient.dob ? irishDate(String(patient.dob)) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-white/35">Registered</p>
                <p className="mt-0.5 text-sm text-white/80">
                  {patient.created_at ? irishDate(String(patient.created_at)) : "—"}
                </p>
              </div>
            </div>
            <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300/80">
              Contact details (name, email, phone, address) have been nulled out. DOB is retained for clinical record integrity.
              All consultation and document records are preserved per the 8-year Irish medical retention requirement.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Consultation history */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">
            Consultation History
            <span className="ml-2 text-xs font-normal text-white/35">{consultations.length} total</span>
          </h2>
          {consultations.length === 0 ? (
            <p className="text-sm text-white/35">No consultations.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {consultations.map((c) => {
                const doctor = c.doctor as Record<string, unknown> | null;
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
                      <p className="truncate text-xs font-medium text-white/80 capitalize">
                        {String(c.service_type ?? "").replace(/_/g, " ")}
                        {c.service_subtype ? ` · ${String(c.service_subtype).replace(/_/g, " ")}` : ""}
                      </p>
                      <p className="text-[11px] text-white/35">
                        {doctor
                          ? `Dr. ${String(doctor.first_name)} ${String(doctor.last_name)}`
                          : "No doctor assigned"}
                        {" · "}
                        <span className="capitalize">{String(c.status)}</span>
                      </p>
                    </div>
                    <p className="shrink-0 text-[11px] text-white/30">
                      {c.created_at
                        ? new Date(String(c.created_at)).toLocaleDateString("en-IE")
                        : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Audit trail */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">
            Audit Trail
            <span className="ml-2 text-xs font-normal text-white/35">events on this patient record</span>
          </h2>
          {auditEvents.length === 0 ? (
            <p className="text-sm text-white/35">No audit events.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {auditEvents.map((ev) => (
                <li key={String(ev.id)} className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-white/5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/80 capitalize">
                      <span className="font-semibold text-white">{String(ev.action).replace(/_/g, " ")}</span>
                      {" by "}
                      <span className="capitalize">{String(ev.actor_type)}</span>
                    </p>
                    <p className="text-[11px] text-white/35">
                      {ev.created_at
                        ? new Date(String(ev.created_at)).toLocaleString("en-IE")
                        : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Legal notice */}
      <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <p className="text-xs text-white/25">
          Patient records are subject to Irish medical data retention requirements (8 years minimum).
          GDPR right to erasure requests are fulfilled by anonymising PII while preserving clinical records per
          Article 17(3)(b). All actions on this page are audit-logged.
        </p>
      </div>
    </main>
  );
}
