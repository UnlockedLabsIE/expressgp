"use client";

import { useState } from "react";

type Toggles = {
  accepting_new_patients: boolean;
  accepting_new_gps: boolean;
  maintenance_mode: boolean;
};

function Toggle({
  checked,
  onChange,
  disabled,
  danger,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const activeColor = danger ? "#ef4444" : "#22c55e";
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      style={{
        backgroundColor: checked ? activeColor : "#334155",
        width: "44px",
        height: "24px",
      }}
      className={[
        "relative inline-flex shrink-0 items-center rounded-full px-0.5 transition-colors duration-200 outline-none",
        disabled ? "cursor-wait opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
        className="block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200"
      />
    </button>
  );
}

export default function PlatformToggles({ initial }: { initial: Toggles }) {
  const [values, setValues] = useState<Toggles>(initial);
  const [saving, setSaving] = useState<keyof Toggles | null>(null);
  const [toast, setToast] = useState<{ key: keyof Toggles; ok: boolean } | null>(null);

  async function update(key: keyof Toggles, value: boolean) {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/config/toggles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        setValues((v) => ({ ...v, [key]: value }));
        setToast({ key, ok: true });
      } else {
        setToast({ key, ok: false });
      }
    } catch {
      setToast({ key, ok: false });
    } finally {
      setSaving(null);
      setTimeout(() => setToast(null), 2500);
    }
  }

  const ROWS: {
    key: keyof Toggles;
    label: string;
    hint: string;
    danger?: boolean;
  }[] = [
    {
      key: "accepting_new_patients",
      label: "Accept New Patients",
      hint: "Allow new patients to register on the platform.",
    },
    {
      key: "accepting_new_gps",
      label: "Accept New Partner GPs",
      hint: "Allow new GP applications to join the platform.",
    },
    {
      key: "maintenance_mode",
      label: "Maintenance Mode",
      hint: "Takes the patient-facing site offline for maintenance. Use with care.",
      danger: true,
    },
  ];

  return (
    <div className="divide-y divide-white/5">
      {ROWS.map(({ key, label, hint, danger }) => (
        <div key={key} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">{label}</p>
            <p className="mt-0.5 text-xs text-white/40">{hint}</p>
            {toast?.key === key && (
              <p className={`mt-1 text-xs ${toast.ok ? "text-[#86efac]" : "text-red-400"}`}>
                {toast.ok ? "Saved" : "Failed to save — try again"}
              </p>
            )}
          </div>
          <Toggle
            checked={values[key]}
            onChange={(v) => update(key, v)}
            disabled={saving === key}
            danger={danger && values[key]}
          />
        </div>
      ))}
    </div>
  );
}
