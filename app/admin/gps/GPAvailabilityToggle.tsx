"use client";

import { useState } from "react";

export default function GPAvailabilityToggle({
  gpId,
  initialValue,
}: {
  gpId: string;
  initialValue: boolean;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/gp-availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gpId, isAccepting: !checked }),
      });
      if (res.ok) setChecked((v) => !v);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={toggle}
      disabled={saving}
      title={checked ? "Click to set unavailable" : "Click to set available"}
      style={{
        backgroundColor: checked ? "#22c55e" : "#64748b",
        width: "44px",
        height: "24px",
      }}
      className={[
        "relative inline-flex shrink-0 items-center rounded-full px-0.5 transition-colors duration-200 outline-none",
        saving ? "cursor-wait opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
        className="block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200"
      />
    </button>
  );
}
