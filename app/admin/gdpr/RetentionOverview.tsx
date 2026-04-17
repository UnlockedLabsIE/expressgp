export default function RetentionOverview({
  totalPatients,
  anonymisedCount,
}: {
  totalPatients: number;
  anonymisedCount: number;
}) {
  const activeCount = totalPatients - anonymisedCount;

  const rows = [
    {
      label: "Clinical records (consultations, prescriptions, documents)",
      period: "8 years from last treatment, or age 25 — whichever is later",
      authority: "Medical Council of Ireland, 2015",
      action: "Cannot be deleted. Protected by immutability triggers.",
    },
    {
      label: "Patient PII (name, email, phone, address)",
      period: "Retained until erasure request or end of retention period",
      authority: "GDPR Art.17 & Art.17(3)(b)",
      action: "Anonymise via patient detail page on valid erasure request.",
    },
    {
      label: "Audit logs",
      period: "Permanently retained",
      authority: "ISO 27001 / NIS2 Directive",
      action: "Cannot be deleted. Protected by immutability trigger.",
    },
    {
      label: "Subject Access Requests",
      period: "Retained in sar_requests table indefinitely",
      authority: "GDPR Art.12 accountability obligation",
      action: "Records are kept as evidence of compliance.",
    },
    {
      label: "Stripe payment IDs",
      period: "7 years (Irish Revenue / accounting obligation)",
      authority: "Companies Act 2014 / Revenue guidance",
      action: "No card data stored. Only PaymentIntent IDs retained. PCI DSS SAQ-A.",
    },
  ];

  return (
    <section className="rounded-2xl bg-white/5 ring-1 ring-white/10">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-base font-semibold text-white">Data Retention Overview</h2>
        <p className="mt-0.5 text-xs text-white/40">
          {activeCount.toLocaleString()} active records · {anonymisedCount.toLocaleString()} anonymised
        </p>
      </div>

      <div className="divide-y divide-white/5">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 px-5 py-4 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-medium text-white">{row.label}</p>
              <p className="mt-0.5 text-xs text-white/50">{row.period}</p>
              <p className="mt-0.5 text-xs text-white/30 italic">{row.action}</p>
            </div>
            <div className="mt-1 sm:mt-0 sm:text-right">
              <span className="inline-block rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] text-white/45 ring-1 ring-white/10">
                {row.authority}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-[10px] text-white/25 leading-relaxed">
          All deletion and anonymisation operations are blocked at the database level via PostgreSQL triggers.
          No user or admin action can permanently delete clinical records during the mandatory retention period.
          Right to erasure (GDPR Art.17) is fulfilled by anonymisation of PII, preserving clinical record structure.
        </p>
      </div>
    </section>
  );
}
