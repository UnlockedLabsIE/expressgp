"use client";

import { useState } from "react";

type SARRow = {
  id: string;
  patient_email: string;
  patient_name: string;
  request_type: string;
  status: string;
  received_at: string;
  deadline_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  access:        "Access",
  erasure:       "Erasure",
  rectification: "Rectification",
  portability:   "Portability",
  restriction:   "Restriction",
  objection:     "Objection",
};

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  in_progress: "bg-blue-500/15 text-blue-300 ring-blue-500/25",
  completed:   "bg-[#22c55e]/15 text-[#86efac] ring-[#22c55e]/25",
  rejected:    "bg-red-500/15 text-red-300 ring-red-500/25",
};

function irishDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", { day: "2-digit", month: "short", year: "numeric" });
}

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

export default function SARRegister({ initialSARs }: { initialSARs: SARRow[] }) {
  const [sars, setSARs] = useState<SARRow[]>(initialSARs);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_name:  "",
    patient_email: "",
    request_type:  "access",
    notes:         "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/gdpr/sar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const newSAR = await res.json() as SARRow;
      setSARs((p) => [newSAR, ...p]);
      setForm({ patient_name: "", patient_email: "", request_type: "access", notes: "" });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/admin/gdpr/sar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const updated = await res.json() as SARRow;
    setSARs((p) => p.map((s) => (s.id === id ? updated : s)));
  }

  return (
    <section className="rounded-2xl bg-white/5 ring-1 ring-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">Subject Access Request Register</h2>
          <p className="mt-0.5 text-xs text-white/40">GDPR Art.12 — 30-day response window</p>
        </div>
        <button
          onClick={() => setShowForm((p) => !p)}
          className="rounded-xl bg-[#22c55e]/10 px-3 py-2 text-xs font-semibold text-[#86efac] ring-1 ring-[#22c55e]/25 transition-colors hover:bg-[#22c55e]/20">
          + Log SAR
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="border-b border-white/10 px-5 py-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/40">Patient name</label>
              <input
                required
                value={form.patient_name}
                onChange={(e) => setForm((p) => ({ ...p, patient_name: e.target.value }))}
                className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/25"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/40">Patient email</label>
              <input
                required
                type="email"
                value={form.patient_email}
                onChange={(e) => setForm((p) => ({ ...p, patient_email: e.target.value }))}
                className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/25"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/40">Request type</label>
            <select
              value={form.request_type}
              onChange={(e) => setForm((p) => ({ ...p, request_type: e.target.value }))}
              className="w-full rounded-xl bg-[#0f1729] px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/25">
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/40">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full resize-none rounded-xl bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/25"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/50 ring-1 ring-white/10 hover:bg-white/10">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[#22c55e]/15 px-4 py-2 text-sm font-semibold text-[#86efac] ring-1 ring-[#22c55e]/25 hover:bg-[#22c55e]/25 disabled:opacity-50">
              {saving ? "Saving…" : "Log request"}
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-white/5">
        {sars.length === 0 ? (
          <p className="px-5 py-6 text-sm text-white/40">No SAR requests logged yet.</p>
        ) : (
          sars.map((sar) => {
            const days = daysLeft(sar.deadline_at);
            const isOverdue = days < 0 && sar.status !== "completed" && sar.status !== "rejected";
            return (
              <div key={sar.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{sar.patient_name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_STYLES[sar.status] ?? STATUS_STYLES.pending}`}>
                      {sar.status.replace(/_/g, " ")}
                    </span>
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/50 ring-1 ring-white/10">
                      {TYPE_LABELS[sar.request_type] ?? sar.request_type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-white/45">{sar.patient_email}</p>
                  {sar.notes && <p className="mt-1 text-xs text-white/35">{sar.notes}</p>}
                  <p className="mt-1 text-[10px] text-white/30">
                    Received {irishDate(sar.received_at)} ·{" "}
                    {sar.status === "completed" || sar.status === "rejected"
                      ? `Closed ${sar.completed_at ? irishDate(sar.completed_at) : "—"}`
                      : isOverdue
                        ? <span className="font-semibold text-red-400">Overdue by {Math.abs(days)} day{Math.abs(days) !== 1 ? "s" : ""}</span>
                        : `Deadline ${irishDate(sar.deadline_at)} (${days}d left)`}
                  </p>
                </div>
                {sar.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleStatusChange(sar.id, "in_progress")}
                      className="rounded-xl bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 ring-1 ring-blue-500/20 hover:bg-blue-500/20 transition-colors">
                      Start
                    </button>
                    <button
                      onClick={() => handleStatusChange(sar.id, "rejected")}
                      className="rounded-xl bg-white/5 px-3 py-1.5 text-xs font-medium text-white/40 ring-1 ring-white/10 hover:bg-white/10 transition-colors">
                      Reject
                    </button>
                  </div>
                )}
                {sar.status === "in_progress" && (
                  <button
                    onClick={() => handleStatusChange(sar.id, "completed")}
                    className="shrink-0 rounded-xl bg-[#22c55e]/10 px-3 py-1.5 text-xs font-medium text-[#86efac] ring-1 ring-[#22c55e]/20 hover:bg-[#22c55e]/20 transition-colors">
                    Mark complete
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
