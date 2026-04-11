"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GDPRAnonymiseButton({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const nameMatches = confirmName.trim().toLowerCase() === patientName.trim().toLowerCase();

  async function handleAnonymise() {
    if (!nameMatches || !reason.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/anonymise-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, reason: reason.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ ok: true, message: "Patient anonymised successfully. This page will refresh." });
        setTimeout(() => {
          router.refresh();
          setOpen(false);
        }, 2000);
      } else {
        setResult({ ok: false, message: data.error ?? "Anonymisation failed." });
      }
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200"
      >
        GDPR Anonymise
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-500/25 p-6"
            style={{ background: "#0f1729" }}
          >
            {/* Header */}
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">GDPR Right to Erasure</h2>
                <p className="mt-1 text-xs text-white/50">
                  This action is <strong className="text-red-300">irreversible</strong>. It will null out all personal
                  identifiers (name, email, phone, address) while preserving clinical records per Irish law.
                </p>
              </div>
            </div>

            {/* What will happen */}
            <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/55 space-y-1">
              <p className="font-semibold text-white/70 mb-2">What this does:</p>
              <p>✓ Nulls: first_name, last_name, email, phone, address, PPS number</p>
              <p>✓ Retains: DOB, all consultations, documents, prescriptions</p>
              <p>✓ Logs the event in audit_logs with your admin ID and reason</p>
              <p>✓ Cannot be reversed</p>
            </div>

            {/* Reason field */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-white/55 mb-1.5">
                Reason / reference number
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. GDPR erasure request #2026-042, received 11 Apr 2026"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-500/40 focus:ring-2 focus:ring-red-500/10"
              />
            </div>

            {/* Confirm by typing patient name */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-white/55 mb-1.5">
                Type the patient&apos;s full name to confirm:{" "}
                <span className="font-semibold text-white/80">{patientName}</span>
              </label>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Full name exactly as shown above"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-500/40 focus:ring-2 focus:ring-red-500/10"
              />
            </div>

            {/* Result message */}
            {result && (
              <div
                className={[
                  "mb-4 rounded-xl border px-4 py-3 text-xs",
                  result.ok
                    ? "border-green-500/25 bg-green-500/8 text-green-300"
                    : "border-red-500/25 bg-red-500/8 text-red-300",
                ].join(" ")}
              >
                {result.message}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { setOpen(false); setConfirmName(""); setReason(""); setResult(null); }}
                disabled={loading}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAnonymise}
                disabled={!nameMatches || !reason.trim() || loading}
                className={[
                  "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  nameMatches && reason.trim() && !loading
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "cursor-not-allowed bg-red-500/20 text-red-300/40",
                ].join(" ")}
              >
                {loading ? "Anonymising…" : "Confirm Anonymise"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
