import { unstable_noStore as noStore } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import PlatformToggles from "./PlatformToggles";
import { PricingEditor, GPShareEditor } from "./PricingEditor";
import AdminUsersSection from "./AdminUsersSection";
import type { ServicePricing } from "@/types";

export const metadata = { title: "Platform Config — Admin" };

type Toggles = {
  accepting_new_patients: boolean;
  accepting_new_gps: boolean;
  maintenance_mode: boolean;
};

type GPShare = {
  default_pct: number;
  premium_pct: number;
  premium_threshold: number;
};

const DEFAULT_TOGGLES: Toggles = {
  accepting_new_patients: true,
  accepting_new_gps: true,
  maintenance_mode: false,
};

const DEFAULT_PRICING: ServicePricing = {
  prescription: 2000,
  sick_note: 2500,
  medical_cert: 2500,
  referral: 3000,
  gp_consultation: 4000,
  glp1: 6000,
  insurance_report: 5000,
  corporate: 3000,
  glp1_subtypes: {
    initial_assessment: 6000,
    initial_blood_test_referral: 3000,
    monthly_review: 4000,
    dose_adjustment: 4000,
    other_glp1: 4000,
  },
};

const DEFAULT_SHARE: GPShare = {
  default_pct: 70,
  premium_pct: 75,
  premium_threshold: 100,
};

function ConfigSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mt-0.5 text-xs text-white/40">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-4 border-b border-white/5 py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white/70">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-white/30">{hint}</p>}
      </div>
      <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-white/55">
        {value}
      </span>
    </div>
  );
}

export default async function AdminConfigPage() {
  noStore();

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let toggles: Toggles = DEFAULT_TOGGLES;
  let pricing: ServicePricing = DEFAULT_PRICING;
  let gpShare: GPShare = DEFAULT_SHARE;
  let adminUsers: {
    id: string;
    email: string;
    full_name: string;
    is_active: boolean;
    last_sign_in_at: string | null;
    created_at: string;
  }[] = [];

  try {
    const admin = createAdminSupabaseClient();

    const [
      { data: togglesRow },
      { data: pricingRow },
      { data: shareRow },
      { data: admins },
    ] = await Promise.all([
      admin.from("platform_config").select("value").eq("key", "platform_toggles").single(),
      admin.from("platform_config").select("value").eq("key", "service_pricing").single(),
      admin.from("platform_config").select("value").eq("key", "gp_revenue_share").single(),
      admin.from("admin_users").select("id, email, full_name, is_active, last_sign_in_at, created_at").order("created_at"),
    ]);

    if (togglesRow?.value) toggles = togglesRow.value as Toggles;
    if (pricingRow?.value) pricing = pricingRow.value as ServicePricing;
    if (shareRow?.value) gpShare = shareRow.value as GPShare;
    if (admins) adminUsers = admins;
  } catch {
    // Service role key not configured — show defaults
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-4 pt-6 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-xl font-light tracking-[0.04em] text-white">Admin Portal</p>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/35">
            Config
          </span>
        </div>
      </header>

      <main className="px-5 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Platform Config</h1>
          <p className="mt-1 text-sm text-white/65">
            Live platform settings. Changes take effect immediately.
          </p>
        </div>

        {/* Platform Toggles — full width */}
        <ConfigSection
          title="Platform Toggles"
          description="Control patient registration, GP onboarding, and maintenance mode in real time."
        >
          <PlatformToggles initial={toggles} />
        </ConfigSection>

        {/* Two-column grid */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Service Pricing */}
          <ConfigSection
            title="Service Pricing"
            description="Prices shown to patients at checkout. Stored in euros. Click any price to edit."
          >
            <PricingEditor initialPricing={pricing} />
          </ConfigSection>

          {/* GP Revenue Share */}
          <div className="flex flex-col gap-4">
            <ConfigSection
              title="GP Revenue Share"
              description="Percentage of each consultation fee paid to the partner GP."
            >
              <GPShareEditor initialShare={gpShare} />
            </ConfigSection>

            {/* Notification Channels — read only */}
            <ConfigSection
              title="Notification Channels"
              description="Services used for patient and GP notifications."
            >
              <InfoRow label="Transactional Email" value="Resend" hint="notifications@expressgp.ie" />
              <InfoRow label="WhatsApp" value="Bird.com" hint="WhatsApp Business via Bird API." />
              <InfoRow label="Video Consultation" value="Whereby" hint="Embedded video sessions." />
            </ConfigSection>
          </div>
        </div>

        {/* Compliance — read only */}
        <div className="mt-4">
          <ConfigSection
            title="Compliance & Data Retention"
            description="GDPR and Irish Medical Council retention requirements."
          >
            <div className="grid gap-x-8 sm:grid-cols-2">
              <InfoRow label="Clinical documents" value="8 years" hint="Per Irish Medical Council guidelines." />
              <InfoRow label="Prescriptions" value="8 years" />
              <InfoRow label="Consultation records" value="8 years" />
              <InfoRow label="Audit logs" value="Indefinite" hint="Immutable — Postgres trigger prevents UPDATE/DELETE." />
              <InfoRow label="Data Controller" value="ExpressGP Ltd" />
              <InfoRow label="GDPR Right to Erasure" value="Enabled" hint="Via admin anonymise_patient procedure." />
              <InfoRow label="DPA Registration" value="IE — pending" hint="Data Protection Commission." />
              <InfoRow label="Environment" value={process.env.NODE_ENV ?? "development"} />
            </div>
          </ConfigSection>
        </div>

        {/* Admin Users — full width */}
        <div className="mt-4">
          <ConfigSection
            title="Admin Users"
            description="Manage who has access to this admin portal. Invite new admins or deactivate existing ones."
          >
            <AdminUsersSection
              initialAdmins={adminUsers}
              currentUserId={user?.id ?? ""}
            />
          </ConfigSection>
        </div>

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-white/35">
          ExpressGP admin tools — handle patient data and GP management with care.
        </footer>
      </main>
    </>
  );
}
