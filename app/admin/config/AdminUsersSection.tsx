"use client";

import { useState } from "react";

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string;
};

function irishDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function AdminUsersSection({
  initialAdmins,
  currentUserId,
}: {
  initialAdmins: AdminUser[];
  currentUserId: string;
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!form.email.trim() || !form.full_name.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Failed to invite admin.");
      } else {
        setFormSuccess(`Invite sent to ${form.email}`);
        setForm({ email: "", full_name: "" });
        setShowForm(false);
        // Optimistically add a placeholder
        setAdmins((a) => [
          ...a,
          {
            id: json.id,
            email: form.email,
            full_name: form.full_name,
            is_active: true,
            last_sign_in_at: null,
            created_at: new Date().toISOString(),
          },
        ]);
        setTimeout(() => setFormSuccess(""), 4000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !current }),
      });
      if (res.ok) {
        setAdmins((a) => a.map((u) => u.id === id ? { ...u, is_active: !current } : u));
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      {/* Admin list */}
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
        {admins.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/40">No admin users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                <th className="px-5 py-3">Admin</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last Sign In</th>
                <th className="px-5 py-3">Added</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {admins.map((u) => {
                const isMe = u.id === currentUserId;
                return (
                  <tr key={u.id} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold text-white/70 ring-1 ring-white/10">
                          {u.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {u.full_name}
                            {isMe && <span className="ml-1.5 text-xs text-white/35">(you)</span>}
                          </p>
                          <p className="text-xs text-white/45">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={[
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
                        u.is_active
                          ? "bg-[#22c55e]/10 text-[#86efac] ring-[#22c55e]/25"
                          : "bg-white/5 text-white/35 ring-white/10",
                      ].join(" ")}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/45">{irishDate(u.last_sign_in_at)}</td>
                    <td className="px-5 py-3.5 text-xs text-white/45">{irishDate(u.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {!isMe && (
                        <button
                          onClick={() => toggleActive(u.id, u.is_active)}
                          disabled={togglingId === u.id}
                          className={[
                            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                            u.is_active
                              ? "border-red-500/20 bg-red-500/5 text-red-300 hover:bg-red-500/10"
                              : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white",
                          ].join(" ")}
                        >
                          {togglingId === u.id ? "…" : u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Success banner */}
      {formSuccess && (
        <p className="mt-3 text-xs text-[#86efac]">{formSuccess}</p>
      )}

      {/* Add admin form */}
      {showForm ? (
        <form onSubmit={invite} className="mt-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="mb-3 text-sm font-semibold text-white">Invite New Admin</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-white/50">Full Name</label>
              <input
                type="text"
                placeholder="Jane Smith"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Email</label>
              <input
                type="email"
                placeholder="jane@expressgp.ie"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/20"
              />
            </div>
          </div>
          {formError && <p className="mt-2 text-xs text-red-400">{formError}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#22c55e] px-4 py-2 text-xs font-semibold text-[#0f1729] disabled:opacity-40"
            >
              {submitting ? "Sending…" : "Send Invite"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(""); }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/55 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/30">An invite email will be sent. They must accept before gaining access.</p>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 rounded-xl bg-[#22c55e] px-4 py-2 text-xs font-semibold text-[#0f1729] transition-opacity hover:opacity-90"
        >
          + Invite Admin
        </button>
      )}
    </div>
  );
}
