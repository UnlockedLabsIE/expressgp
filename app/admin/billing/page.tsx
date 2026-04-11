export const metadata = { title: "Billing — Admin" };

function PlaceholderCard({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white">{label}</h3>
      <p className="mt-1 text-xs text-white/45">{description}</p>
      <div className="mt-4 h-24 rounded-xl border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center">
        <span className="text-xs text-white/20">Coming soon</span>
      </div>
    </div>
  );
}

export default function AdminBillingPage() {
  return (
    <main className="px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <span className="rounded-full border border-amber-500/25 bg-amber-500/8 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-amber-400/70">
            Stripe
          </span>
        </div>
        <p className="mt-1 text-sm text-white/45">
          Stripe integration — connect your Stripe account to manage payments and payouts.
        </p>
      </div>

      {/* Connect Stripe CTA */}
      <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Connect Stripe Account</h2>
            <p className="mt-1 text-xs text-white/55">
              Link your Stripe account to manage GP payouts, view transaction history, and configure service pricing.
              Requires <code className="rounded bg-white/10 px-1 py-0.5">STRIPE_SECRET_KEY</code> and{" "}
              <code className="rounded bg-white/10 px-1 py-0.5">STRIPE_WEBHOOK_SECRET</code> in your environment.
            </p>
            <button
              disabled
              className="mt-3 cursor-not-allowed rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-400/50"
            >
              Configure Stripe (coming soon)
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlaceholderCard
          label="Revenue Overview"
          description="Total revenue, MRR, and breakdown by service type."
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          }
        />
        <PlaceholderCard
          label="GP Payouts"
          description="Manage and track GP earnings and scheduled payouts."
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <PlaceholderCard
          label="Transaction History"
          description="Full log of all patient payments and refunds."
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
          }
        />
      </div>
    </main>
  );
}
