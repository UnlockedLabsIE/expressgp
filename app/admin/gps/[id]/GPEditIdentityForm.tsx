"use client";

// initial.is_active = partner_doctors row: admin-controlled dashboard access (employed/valid IMC account).
// "Accepting cases" is edited elsewhere (Availability), not in this identity form.

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  gpId: string;
  initial: {
    first_name: string;
    last_name: string;
    email: string;
    imc_number: string;
    employment_type: string;
    is_active: boolean;
  };
};

export default function GPEditIdentityForm({ gpId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        imc_number: form.imc_number.trim(),
        employment_type: form.employment_type,
        is_active: form.is_active,
      };

      const res = await fetch(`/api/admin/gps/${gpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      setSuccess("Saved.");
      router.refresh();
      setTimeout(() => setSuccess(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-5 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-amber-500/20">
      <h2 className="text-base font-semibold text-white">GP record (administration)</h2>
      <p className="mt-1 text-xs leading-relaxed text-white/45">
        Legal name, IMC, email, and account status are not editable by the GP in Settings. Changes here update the clinical profile and, for email, their login address in Supabase Auth.
      </p>

      <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="adm-fn" className="block text-[10px] font-semibold uppercase tracking-wide text-white/35">
            First name
          </label>
          <input
            id="adm-fn"
            value={form.first_name}
            onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40"
            required
          />
        </div>
        <div>
          <label htmlFor="adm-ln" className="block text-[10px] font-semibold uppercase tracking-wide text-white/35">
            Last name
          </label>
          <input
            id="adm-ln"
            value={form.last_name}
            onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="adm-em" className="block text-[10px] font-semibold uppercase tracking-wide text-white/35">
            Email (login)
          </label>
          <input
            id="adm-em"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40"
            required
          />
        </div>
        <div>
          <label htmlFor="adm-imc" className="block text-[10px] font-semibold uppercase tracking-wide text-white/35">
            IMC number
          </label>
          <input
            id="adm-imc"
            value={form.imc_number}
            onChange={(e) => setForm((f) => ({ ...f, imc_number: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white outline-none focus:border-amber-500/40"
            required
          />
        </div>
        <div>
          <label htmlFor="adm-emp" className="block text-[10px] font-semibold uppercase tracking-wide text-white/35">
            Employment type
          </label>
          <select
            id="adm-emp"
            value={form.employment_type}
            onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40"
          >
            <option value="contracted" className="bg-[#0f1729]">Contracted</option>
            <option value="employed" className="bg-[#0f1729]">Employed</option>
          </select>
        </div>
        <div className="sm:col-span-2 flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Account status: Active / Inactive</p>
            <p className="text-xs text-white/40">
              Admin-controlled. When inactive, the GP cannot access the dashboard at all. This is not the same as pausing new consultations (GP-controlled on Availability).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.is_active}
            onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${form.is_active ? "bg-[#22c55e]" : "bg-white/25"}`}
          >
            <span
              className="absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform"
              style={{ transform: form.is_active ? "translateX(22px)" : "translateX(2px)" }}
            />
          </button>
        </div>

        {error && <p className="sm:col-span-2 text-sm text-red-300">{error}</p>}
        {success && <p className="sm:col-span-2 text-sm text-[#86efac]">{success}</p>}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-amber-500/20 px-4 py-2.5 text-sm font-semibold text-amber-200 ring-1 ring-amber-500/35 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save GP record"}
          </button>
        </div>
      </form>
    </section>
  );
}
