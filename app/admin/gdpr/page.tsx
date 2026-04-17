import { unstable_noStore as noStore } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import SARRegister from "./SARRegister";
import ErasureLog from "./ErasureLog";
import RetentionOverview from "./RetentionOverview";
import ComplianceChecklist from "./ComplianceChecklist";

export const metadata = { title: "GDPR — Admin" };

export default async function AdminGDPRPage() {
  noStore();

  const admin = createAdminSupabaseClient();

  const [sarRes, erasureRes, patientCountRes, overdueRes] = await Promise.all([
    admin
      .from("sar_requests")
      .select(`
        id, patient_email, patient_name, request_type, status,
        received_at, deadline_at, completed_at, notes, created_at
      `)
      .order("received_at", { ascending: false }),

    admin
      .from("audit_logs")
      .select("id, actor_type, created_at, new_value")
      .eq("action", "gdpr_anonymisation")
      .order("created_at", { ascending: false })
      .limit(50),

    admin
      .from("patients")
      .select("id, anonymised_at, created_at", { count: "exact" }),

    // SAR requests past their 30-day deadline that are not completed
    admin
      .from("sar_requests")
      .select("id")
      .lt("deadline_at", new Date().toISOString())
      .not("status", "eq", "completed")
      .not("status", "eq", "rejected"),
  ]);

  const sarRequests     = sarRes.data     ?? [];
  const erasureEvents   = erasureRes.data ?? [];
  const patients        = patientCountRes.data ?? [];
  const overdueCount    = overdueRes.data?.length ?? 0;

  const totalPatients     = patients.length;
  const anonymisedCount   = patients.filter((p) => p.anonymised_at).length;
  const pendingSARs       = sarRequests.filter((s) => s.status === "pending").length;
  const completedSARs     = sarRequests.filter((s) => s.status === "completed").length;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-4 pt-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">GDPR & Compliance</h1>
            <p className="mt-0.5 text-xs text-white/40">
              Subject Access Requests · Erasure Log · Retention · Regulatory Framework
            </p>
          </div>
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-500/25">
              {overdueCount} overdue SAR{overdueCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </header>

      <main className="space-y-6 px-5 py-6">

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total patients",     value: totalPatients,    accent: "text-white" },
            { label: "Anonymised",         value: anonymisedCount,  accent: "text-[#86efac]" },
            { label: "Pending SARs",       value: pendingSARs,      accent: pendingSARs > 0 ? "text-amber-300" : "text-white/50" },
            { label: "Completed SARs",     value: completedSARs,    accent: "text-white/70" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="text-xs text-white/40">{label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* SAR Register */}
        <SARRegister initialSARs={sarRequests} />

        {/* Erasure Log */}
        <ErasureLog events={erasureEvents} />

        {/* Retention Overview */}
        <RetentionOverview totalPatients={totalPatients} anonymisedCount={anonymisedCount} />

        {/* Compliance Checklist */}
        <ComplianceChecklist />

      </main>
    </>
  );
}
