export const metadata = { title: "Platform Config — Admin" };

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
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mt-0.5 text-xs text-white/40">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ConfigRow({
  label,
  value,
  hint,
  disabled = true,
}: {
  label: string;
  value: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-white/5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white/70">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-white/30">{hint}</p>}
      </div>
      <div className="shrink-0">
        {disabled ? (
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-white/50">
            {value}
          </span>
        ) : (
          <input
            defaultValue={value}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-amber-500/40"
          />
        )}
      </div>
    </div>
  );
}

export default function AdminConfigPage() {
  return (
    <main className="px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Platform Config</h1>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/35">
            Read-only
          </span>
        </div>
        <p className="mt-1 text-sm text-white/45">
          Platform-level settings. Editing coming in a future release.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        <ConfigSection
          title="Service Types & Pricing"
          description="Consultation types available to patients and their base fees."
        >
          {[
            { label: "Sick Note", value: "€25.00" },
            { label: "Fit to Fly Certificate", value: "€35.00" },
            { label: "Fit to Return to Work", value: "€30.00" },
            { label: "Medical Certificate", value: "€25.00" },
            { label: "Insurance Report", value: "€45.00" },
            { label: "GP Letter", value: "€30.00" },
            { label: "Video Consultation", value: "€40.00" },
          ].map((r) => (
            <ConfigRow key={r.label} label={r.label} value={r.value} />
          ))}
          <button
            disabled
            className="mt-3 cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/25"
          >
            Edit pricing (coming soon)
          </button>
        </ConfigSection>

        <ConfigSection
          title="GP Revenue Share"
          description="Percentage of each consultation fee paid to the partner GP."
        >
          <ConfigRow
            label="Default GP share"
            value="70%"
            hint="Platform retains 30% to cover infrastructure, support, and insurance."
          />
          <ConfigRow
            label="Premium GP share"
            value="75%"
            hint="For GPs with >100 consultations per month."
          />
        </ConfigSection>

        <ConfigSection
          title="Document Retention"
          description="Regulatory retention periods for different record types."
        >
          <ConfigRow label="Clinical documents" value="8 years" hint="Per Irish Medical Council guidelines." />
          <ConfigRow label="Prescriptions" value="8 years" />
          <ConfigRow label="Consultation records" value="8 years" />
          <ConfigRow label="Audit logs" value="Indefinite" hint="Immutable and never deleted." />
        </ConfigSection>

        <ConfigSection
          title="Platform Identifiers"
          description="Environment and integration identifiers."
        >
          <ConfigRow
            label="Supabase Project"
            value="xxnffdscpeksuvcdmffz"
            hint="Supabase project ref."
          />
          <ConfigRow
            label="Environment"
            value={process.env.NODE_ENV ?? "development"}
          />
          <ConfigRow
            label="Support Email"
            value="support@expressgp.ie"
          />
        </ConfigSection>

        <ConfigSection
          title="Notification Channels"
          description="Services used for patient and GP notifications."
        >
          <ConfigRow label="Transactional Email" value="Resend" hint="notifications@expressgp.ie" />
          <ConfigRow label="WhatsApp" value="Bird.com" hint="WhatsApp Business via Bird API." />
          <ConfigRow label="Video Consultation" value="Whereby" hint="Embedded video sessions." />
        </ConfigSection>

        <ConfigSection
          title="Compliance"
          description="GDPR and regulatory compliance settings."
        >
          <ConfigRow label="Data Controller" value="ExpressGP Ltd" />
          <ConfigRow label="DPA Registration" value="IE — pending" hint="Data Protection Commission registration." />
          <ConfigRow label="GDPR Right to Erasure" value="Enabled" hint="Via admin anonymise_patient procedure." />
          <ConfigRow label="Audit trail" value="Immutable" hint="Postgres trigger prevents UPDATE/DELETE on audit_logs." />
        </ConfigSection>

      </div>
    </main>
  );
}
