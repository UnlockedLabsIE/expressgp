type ErasureEvent = {
  id: string;
  actor_type: string;
  created_at: string;
  new_value: Record<string, unknown> | null;
};

function irishDate(iso: string) {
  return new Date(iso).toLocaleString("en-IE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ErasureLog({ events }: { events: ErasureEvent[] }) {
  return (
    <section className="rounded-2xl bg-white/5 ring-1 ring-white/10">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-base font-semibold text-white">Erasure Log</h2>
        <p className="mt-0.5 text-xs text-white/40">
          GDPR Art.17 anonymisation events · PII nulled, clinical records preserved per Irish law (8 years)
        </p>
      </div>

      <div className="divide-y divide-white/5">
        {events.length === 0 ? (
          <p className="px-5 py-6 text-sm text-white/40">No erasure events recorded yet.</p>
        ) : (
          events.map((ev) => {
            const val = ev.new_value ?? {};
            const reason        = String(val.reason ?? "—");
            const adminId       = val.requesting_admin_id ? String(val.requesting_admin_id).slice(0, 8) : null;
            const legalBasis    = String(val.legal_basis ?? "GDPR Art.17(3)(b)");
            return (
              <div key={ev.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">Patient anonymised</p>
                    <p className="mt-0.5 text-xs text-white/50 leading-relaxed">{reason}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-white/30">
                      <span>{irishDate(ev.created_at)}</span>
                      {adminId && <span>Admin ···{adminId.toUpperCase()}</span>}
                      <span className="italic">{legalBasis}</span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/40 ring-1 ring-white/10 capitalize">
                    {ev.actor_type}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
