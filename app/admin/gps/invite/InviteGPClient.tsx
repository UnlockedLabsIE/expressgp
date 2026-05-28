"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InviteGPClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    imc_number: "",
    employment_type: "contracted" as "employed" | "contracted",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/gps/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        setError(json.error ?? "Invite failed.");
        return;
      }
      setSuccess("Invite sent. They will receive an email to set a password and can then sign in to the GP dashboard.");
      setForm({
        email: "",
        first_name: "",
        last_name: "",
        imc_number: "",
        employment_type: "contracted",
      });
      setTimeout(() => {
        if (json.id) router.push(`/admin/gps/${json.id}`);
        else router.push("/admin/gps");
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-4 pt-6 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/gps" className="text-sm text-white/45 transition-colors hover:text-white">
            ← Partner GPs
          </Link>
          <span className="text-white/20">/</span>
          <p className="text-sm text-white/70">Invite GP</p>
        </div>
      </header>

      <main className="px-5 py-6 max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Invite a GP</h1>
        <p className="mt-2 text-sm text-white/55 leading-relaxed">
          Creates their login (email invite from Supabase) and their clinical profile. Legal name and IMC can only be changed later via administration — same as the GP cannot edit them in Settings.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-white/40">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1.5 w-full rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm text-white ring-1 ring-white/15 outline-none focus:ring-2 focus:ring-[#22c55e]/50"
              placeholder="gp.name@example.com"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first_name" className="block text-xs font-semibold uppercase tracking-wide text-white/40">
                First name
              </label>
              <input
                id="first_name"
                required
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                className="mt-1.5 w-full rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm text-white ring-1 ring-white/15 outline-none focus:ring-2 focus:ring-[#22c55e]/50"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-xs font-semibold uppercase tracking-wide text-white/40">
                Last name
              </label>
              <input
                id="last_name"
                required
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                className="mt-1.5 w-full rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm text-white ring-1 ring-white/15 outline-none focus:ring-2 focus:ring-[#22c55e]/50"
              />
            </div>
          </div>
          <div>
            <label htmlFor="imc" className="block text-xs font-semibold uppercase tracking-wide text-white/40">
              IMC number
            </label>
            <input
              id="imc"
              required
              value={form.imc_number}
              onChange={(e) => setForm((f) => ({ ...f, imc_number: e.target.value }))}
              className="mt-1.5 w-full rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm text-white font-mono ring-1 ring-white/15 outline-none focus:ring-2 focus:ring-[#22c55e]/50"
              placeholder="e.g. 123456"
            />
          </div>
          <div>
            <label htmlFor="emp" className="block text-xs font-semibold uppercase tracking-wide text-white/40">
              Employment type
            </label>
            <select
              id="emp"
              value={form.employment_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, employment_type: e.target.value as "employed" | "contracted" }))
              }
              className="mt-1.5 w-full rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm text-white ring-1 ring-white/15 outline-none focus:ring-2 focus:ring-[#22c55e]/50"
            >
              <option value="contracted" className="bg-[#0f1729]">Contracted</option>
              <option value="employed" className="bg-[#0f1729]">Employed</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/25">{error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-[#22c55e]/10 px-3 py-2 text-sm text-[#86efac] ring-1 ring-[#22c55e]/25">{success}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#22c55e] py-2.5 text-sm font-semibold text-[#0f1729] transition-colors hover:bg-[#22c55e]/90 disabled:opacity-50"
          >
            {submitting ? "Sending invite…" : "Send invite"}
          </button>
        </form>

        <p className="mt-6 text-[11px] leading-relaxed text-white/30">
          Configure Supabase Auth email templates and Site URL so the invite link works. Optional: set{" "}
          <code className="text-white/45">NEXT_PUBLIC_SITE_URL</code> for redirect after they accept.
        </p>
      </main>
    </>
  );
}
