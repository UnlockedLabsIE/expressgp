"use client";

import { useState } from "react";

type ServicePricing = Record<string, number>;
type GPShare = { default_pct: number; premium_pct: number; premium_threshold: number };

const SERVICE_LABELS: Record<string, string> = {
  prescription:     "Prescription",
  sick_note:        "Sick Note & Certificates",
  medical_cert:     "Medical Certificate",
  referral:         "Referral Letter",
  gp_consultation:  "GP Consultation",
  glp1:             "GLP-1 Programme (base)",
  insurance_report: "Insurance Report",
  corporate:        "Corporate",
};

const GLP1_LABELS: Record<string, string> = {
  initial_assessment:          "GLP-1 — Initial Assessment",
  initial_blood_test_referral: "GLP-1 — Blood Test Referral",
  monthly_review:              "GLP-1 — Monthly Review",
  dose_adjustment:             "GLP-1 — Dose Adjustment",
  other_glp1:                  "GLP-1 — Other",
};

function centsToEuros(cents: number) {
  return (cents / 100).toFixed(2);
}
function eurosToCents(euros: string) {
  return Math.round(parseFloat(euros) * 100);
}

function PricingRow({
  label,
  valueKey,
  cents,
  onChange,
}: {
  label: string;
  valueKey: string;
  cents: number;
  onChange: (key: string, cents: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(centsToEuros(cents));

  function commit() {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed > 0 && parsed < 1000) {
      onChange(valueKey, eurosToCents(draft));
    } else {
      setDraft(centsToEuros(cents));
    }
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 border-b border-white/5 py-2.5 last:border-0">
      <p className="min-w-0 flex-1 text-xs font-medium text-white/70">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-white/40">€</span>
          <input
            autoFocus
            type="number"
            min="1"
            max="999"
            step="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(centsToEuros(cents)); setEditing(false); } }}
            className="w-20 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-right text-xs text-white outline-none focus:border-white/40"
          />
        </div>
      ) : (
        <button
          onClick={() => { setDraft(centsToEuros(cents)); setEditing(true); }}
          className="group flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-white/55 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
          title="Click to edit"
        >
          €{centsToEuros(cents)}
          <svg className="h-3 w-3 opacity-0 group-hover:opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function PricingEditor({
  initialPricing,
}: {
  initialPricing: ServicePricing & { glp1_subtypes?: Record<string, number> };
}) {
  const [pricing, setPricing] = useState(initialPricing);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleChange(key: string, cents: number) {
    setPricing((p) => ({ ...p, [key]: cents }));
    setDirty(true);
    setSaved(false);
  }

  function handleGlp1Change(key: string, cents: number) {
    setPricing((p) => ({
      ...p,
      glp1_subtypes: { ...(p.glp1_subtypes ?? {}), [key]: cents },
    }));
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "service_pricing", value: pricing }),
      });
      if (res.ok) { setSaved(true); setDirty(false); }
    } finally {
      setSaving(false);
    }
  }

  const serviceKeys = Object.keys(SERVICE_LABELS);
  const glp1Keys = Object.keys(GLP1_LABELS);

  return (
    <div>
      {serviceKeys.map((k) => (
        <PricingRow
          key={k}
          label={SERVICE_LABELS[k]}
          valueKey={k}
          cents={pricing[k] ?? 0}
          onChange={handleChange}
        />
      ))}

      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/30">GLP-1 Subtypes</p>
      {glp1Keys.map((k) => (
        <PricingRow
          key={k}
          label={GLP1_LABELS[k]}
          valueKey={k}
          cents={pricing.glp1_subtypes?.[k] ?? 0}
          onChange={handleGlp1Change}
        />
      ))}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-xl bg-[#22c55e] px-4 py-2 text-xs font-semibold text-[#0f1729] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:opacity-90"
        >
          {saving ? "Saving…" : "Save Pricing"}
        </button>
        {saved && <span className="text-xs text-[#86efac]">Saved</span>}
        {dirty && !saved && <span className="text-xs text-white/35">Unsaved changes</span>}
      </div>
    </div>
  );
}

export function GPShareEditor({ initialShare }: { initialShare: GPShare }) {
  const [share, setShare] = useState(initialShare);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  function set(key: keyof GPShare, val: number) {
    setShare((s) => ({ ...s, [key]: val }));
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "gp_revenue_share", value: share }),
      });
      if (res.ok) { setSaved(true); setDirty(false); }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {(
        [
          { key: "default_pct",       label: "Default GP share",  hint: "Platform retains the remainder.", suffix: "%" },
          { key: "premium_pct",        label: "Premium GP share",  hint: "For GPs above the monthly threshold.", suffix: "%" },
          { key: "premium_threshold",  label: "Premium threshold", hint: "Consultations/month to qualify for premium rate.", suffix: "" },
        ] as const
      ).map(({ key, label, hint, suffix }) => (
        <div key={key} className="flex items-center gap-3 border-b border-white/5 py-2.5 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/70">{label}</p>
            <p className="mt-0.5 text-[11px] text-white/30">{hint}</p>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={key === "premium_threshold" ? 9999 : 100}
              value={share[key]}
              onChange={(e) => set(key, parseInt(e.target.value, 10) || 0)}
              className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-right text-xs text-white outline-none focus:border-white/20"
            />
            {suffix && <span className="text-xs text-white/40">{suffix}</span>}
          </div>
        </div>
      ))}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-xl bg-[#22c55e] px-4 py-2 text-xs font-semibold text-[#0f1729] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:opacity-90"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-xs text-[#86efac]">Saved</span>}
        {dirty && !saved && <span className="text-xs text-white/35">Unsaved changes</span>}
      </div>
    </div>
  );
}
