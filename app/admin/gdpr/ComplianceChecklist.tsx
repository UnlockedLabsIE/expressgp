type CheckItem = {
  regulation: string;
  requirement: string;
  status: "compliant" | "partial" | "policy-only";
  notes: string;
};

const ITEMS: CheckItem[] = [
  {
    regulation: "GDPR Art.5",
    requirement: "Data minimisation on pending consultation queue",
    status: "compliant",
    notes: "PENDING_SELECT removes patient PII from unclaimed cases. Full PII only visible once a GP claims the case.",
  },
  {
    regulation: "GDPR Art.17",
    requirement: "Right to erasure via patient anonymisation",
    status: "compliant",
    notes: "anonymise_patient() function nulls PII, sets anonymised_at, logs to audit_logs. Clinical records preserved per Art.17(3)(b).",
  },
  {
    regulation: "GDPR Art.12",
    requirement: "Subject Access Request register with 30-day deadline tracking",
    status: "compliant",
    notes: "sar_requests table with deadline_at = received_at + 30 days. Overdue SARs flagged in header.",
  },
  {
    regulation: "IMC Rule 1",
    requirement: "GP IMC number on all issued documents",
    status: "compliant",
    notes: "imc_number fetched from partner_doctors and embedded in all PDF documents at issue time.",
  },
  {
    regulation: "IMC Rule 3",
    requirement: "Active GP gate — suspended GPs cannot issue documents",
    status: "compliant",
    notes: "is_active=false blocks GP dashboard access and consultation claims. roles API enforces at login.",
  },
  {
    regulation: "IMC Rule 10",
    requirement: "Controlled drug prescribing blocked for remote consultations",
    status: "compliant",
    notes: "controlled_drug_check trigger blocks DB insert of any controlled substance prescription.",
  },
  {
    regulation: "EU AI Act Art.14",
    requirement: "Human oversight of AI-assisted clinical recommendations",
    status: "compliant",
    notes: "Advisory disclaimer shown on every consultation with an AI triage summary. GPs must review before acting.",
  },
  {
    regulation: "ISO 27001",
    requirement: "Audit log on every clinical data access event",
    status: "compliant",
    notes: "clinical_data_viewed events logged when GP opens a consultation, and when admin views patient or GP detail pages.",
  },
  {
    regulation: "Consumer Rights Act 2022",
    requirement: "Automatic refund when GP declines a paid consultation",
    status: "compliant",
    notes: "Decline API route triggers Stripe refund automatically. stripe_refund_required flag set on consultation record.",
  },
  {
    regulation: "PCI DSS SAQ-A",
    requirement: "No card data stored in database",
    status: "compliant",
    notes: "Only stripe_payment_id (PaymentIntent ID) stored. No card numbers, CVV, or PANs. Verified by schema audit.",
  },
  {
    regulation: "IMC Rule 5",
    requirement: "Emergency 999/112 notice on red-flag consultations",
    status: "compliant",
    notes: "Red banner shown to GP when triage session has red_flag_triggered=true. Instructs GP to direct patient to emergency services.",
  },
  {
    regulation: "Medical Council of Ireland",
    requirement: "8-year clinical record retention",
    status: "compliant",
    notes: "Immutability triggers on consultations, prescriptions, documents, messages. Confirmed in retention UI wording.",
  },
  {
    regulation: "NIS2 Directive",
    requirement: "Incident response and business continuity documentation",
    status: "policy-only",
    notes: "Technical controls in place. Formal incident response plan and BCP documents required — provide to DPO for review.",
  },
  {
    regulation: "EHDS / EU Data Act",
    requirement: "Patient data portability on request",
    status: "partial",
    notes: "SAR register captures portability requests. Automated data export not yet implemented — handle manually via admin.",
  },
];

const STATUS_CONFIG = {
  compliant:    { label: "Compliant",    style: "bg-[#22c55e]/15 text-[#86efac] ring-[#22c55e]/25" },
  partial:      { label: "Partial",      style: "bg-amber-500/15 text-amber-300 ring-amber-500/25" },
  "policy-only":{ label: "Policy only", style: "bg-blue-500/15 text-blue-300 ring-blue-500/25" },
};

export default function ComplianceChecklist() {
  const compliantCount    = ITEMS.filter((i) => i.status === "compliant").length;
  const partialCount      = ITEMS.filter((i) => i.status === "partial").length;
  const policyOnlyCount   = ITEMS.filter((i) => i.status === "policy-only").length;

  return (
    <section className="rounded-2xl bg-white/5 ring-1 ring-white/10">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Regulatory Compliance Checklist</h2>
            <p className="mt-0.5 text-xs text-white/40">
              GDPR · IMC · EU AI Act · ISO 27001 · Consumer Rights Act · PCI DSS
            </p>
          </div>
          <div className="flex gap-2 text-[10px]">
            <span className="rounded-full bg-[#22c55e]/15 px-2.5 py-1 font-semibold text-[#86efac] ring-1 ring-[#22c55e]/25">
              {compliantCount} compliant
            </span>
            {partialCount > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-300 ring-1 ring-amber-500/25">
                {partialCount} partial
              </span>
            )}
            {policyOnlyCount > 0 && (
              <span className="rounded-full bg-blue-500/15 px-2.5 py-1 font-semibold text-blue-300 ring-1 ring-blue-500/25">
                {policyOnlyCount} policy only
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {ITEMS.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          return (
            <div key={`${item.regulation}-${item.requirement}`} className="flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-white/60 ring-1 ring-white/10">
                    {item.regulation}
                  </span>
                  <p className="text-sm font-medium text-white">{item.requirement}</p>
                </div>
                <p className="mt-1 text-xs text-white/45 leading-relaxed">{item.notes}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${cfg.style}`}>
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-[10px] text-white/25 leading-relaxed">
          This checklist reflects the current technical implementation. &quot;Policy only&quot; items require documented policies from your DPO or legal team.
          Review with qualified legal counsel before processing live patient data.
        </p>
      </div>
    </section>
  );
}
