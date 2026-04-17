"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { logGpAudit } from "@/lib/audit";
import type { DoctorNotificationPreferences, PartnerDoctor } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Toast = { id: number; message: string; type: "success" | "error" };

type Props = {
  doctor: PartnerDoctor | null;
  notifPrefs: DoctorNotificationPreferences | null;
  userEmail: string;
  lastSignInAt: string | null;
};

type TabId = "profile" | "security" | "notifications" | "availability" | "prescription" | "data-privacy" | "platform";

const TABS: { id: TabId; label: string }[] = [
  { id: "profile",        label: "GP Profile" },
  { id: "security",       label: "Security" },
  { id: "notifications",  label: "Notifications" },
  { id: "availability",   label: "Availability" },
  { id: "prescription",   label: "Prescription Defaults" },
  { id: "data-privacy",   label: "Data & Privacy" },
  { id: "platform",       label: "Platform" },
];

const TIMEZONES = [
  { value: "Europe/Dublin",       label: "Europe/Dublin (IST/GMT)" },
  { value: "Europe/London",       label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris",        label: "Europe/Paris (CET/CEST)" },
  { value: "UTC",                 label: "UTC" },
  { value: "America/New_York",    label: "America/New_York (ET)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { value: "Australia/Sydney",    label: "Australia/Sydney (AEDT)" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Dublin",
  }).format(new Date(iso));
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: number) => void }) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ring-1",
        t.type === "success"
          ? "bg-[#22c55e]/10 text-[#86efac] ring-[#22c55e]/30"
          : "bg-red-500/10 text-red-300 ring-red-500/30",
      ].join(" ")}
    >
      {t.type === "success" ? (
        <svg className="h-4 w-4 shrink-0 text-[#22c55e]" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      <span className="flex-1">{t.message}</span>
      <button onClick={() => onDismiss(t.id)} className="ml-1 shrink-0 text-white/35 hover:text-white/70 transition-colors" aria-label="Dismiss">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{ backgroundColor: checked ? "#22c55e" : "#64748b", width: "44px", height: "24px" }}
      className={[
        "relative inline-flex items-center shrink-0 rounded-full px-0.5 transition-colors duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1729]",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
        className="block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200"
      />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/40">{label}</p>
      {children}
    </div>
  );
}

function TextInput({ id, value, onChange, placeholder }: { id?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/25 ring-1 ring-white/15 outline-none focus:ring-2 focus:ring-[#22c55e]/50 transition-shadow"
    />
  );
}

function ReadOnlyField({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 rounded-lg bg-white/[0.03] px-3 py-2.5 text-sm text-white/35 ring-1 ring-white/8">
        {value}
      </span>
      <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/25 ring-1 ring-white/10">
        Managed by admin
      </span>
    </div>
  );
}

function SaveButton({ onClick, loading, label = "Save changes" }: { onClick: () => void; loading?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="mt-5 rounded-xl bg-[#22c55e]/15 px-5 py-2.5 text-sm font-semibold text-[#86efac] ring-1 ring-[#22c55e]/35 transition-colors hover:bg-[#22c55e]/25 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Saving…" : label}
    </button>
  );
}

function MandatoryNotifRow({ label, description }: { label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-xl bg-white/[0.03] px-4 py-3.5 ring-1 ring-white/10">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{label}</p>
          <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300 ring-1 ring-red-500/20">
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Mandatory
          </span>
        </div>
        {description && <p className="mt-0.5 text-xs text-white/40">{description}</p>}
      </div>
      <Toggle checked={true} onChange={() => {}} disabled />
    </div>
  );
}

function ConfigNotifRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-xl bg-white/[0.03] px-4 py-3.5 ring-1 ring-white/10">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="mt-0.5 text-xs text-white/40">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsClient({ doctor, notifPrefs, userEmail, lastSignInAt }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const toastRef = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const toast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastRef.current;
    setToasts([{ id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  // ── Profile ────────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(doctor?.first_name ?? "");
  const [lastName, setLastName]   = useState(doctor?.last_name  ?? "");
  const [photoUrl, setPhotoUrl]   = useState(doctor?.profile_photo_url ?? "");
  const [savingProfile, setSavingProfile]   = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function saveProfile() {
    if (!doctor) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("partner_doctors")
      .update({ first_name: firstName.trim(), last_name: lastName.trim() })
      .eq("id", doctor.id);
    setSavingProfile(false);
    if (error) toast("Failed to save profile.", "error");
    else {
      await logGpAudit(supabase, {
        doctorId: doctor.id,
        action: "gp_profile_updated",
        tableName: "partner_doctors",
        recordId: doctor.id,
        newValue: { first_name: firstName.trim(), last_name: lastName.trim() },
      });
      toast("Profile updated successfully.");
      router.refresh();
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !doctor) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast("Only JPEG, PNG or WebP images are supported.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Photo must be under 5 MB.", "error");
      return;
    }

    setUploadingPhoto(true);
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${doctor.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("doctor-photos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast("Upload failed. Ensure the 'doctor-photos' storage bucket exists.", "error");
      setUploadingPhoto(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("doctor-photos").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("partner_doctors")
      .update({ profile_photo_url: publicUrl })
      .eq("id", doctor.id);

    setUploadingPhoto(false);
    if (updateError) {
      toast("Photo uploaded but failed to save URL.", "error");
    } else {
      setPhotoUrl(publicUrl);
      await logGpAudit(supabase, {
        doctorId: doctor.id,
        action: "gp_profile_photo_updated",
        tableName: "partner_doctors",
        recordId: doctor.id,
        newValue: { profile_photo_url: publicUrl },
      });
      toast("Profile photo updated.");
      router.refresh();
    }
  }

  // ── Security ───────────────────────────────────────────────────────────────
  const [resetSent, setResetSent]     = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  async function sendPasswordReset() {
    if (!userEmail) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setSendingReset(false);
    if (error) toast("Failed to send reset email.", "error");
    else setResetSent(true);
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notif, setNotif] = useState({
    email_new_message:   notifPrefs?.email_new_message   ?? true,
    daily_summary_email: notifPrefs?.daily_summary_email ?? true,
  });
  const savingNotifRef = useRef(false);

  async function saveNotifPref<K extends keyof typeof notif>(key: K, value: boolean) {
    if (!doctor || savingNotifRef.current) return;
    savingNotifRef.current = true;
    const next = { ...notif, [key]: value };
    setNotif(next);

    // Upsert with mandatory fields always true
    const { error } = await supabase
      .from("doctor_notification_preferences")
      .upsert(
        {
          doctor_id: doctor.id,
          email_new_consultation: true,
          email_new_message:      next.email_new_message,
          email_red_flag:         true,
          sms_new_consultation:   true,
          sms_red_flag:           true,
          daily_summary_email:    next.daily_summary_email,
        },
        { onConflict: "doctor_id" }
      );

    savingNotifRef.current = false;
    if (error) {
      setNotif((prev) => ({ ...prev, [key]: !value }));
      toast("Failed to save preference.", "error");
    } else {
      toast("Preference saved.");
    }
  }

  // ── Availability ───────────────────────────────────────────────────────────
  const [isAccepting, setIsAccepting] = useState(doctor?.is_accepting_cases ?? true);
  const [outOfOfficeUntil, setOutOfOfficeUntil] = useState(
    doctor?.out_of_office_until
      ? new Date(doctor.out_of_office_until).toISOString().split("T")[0]
      : ""
  );
  const [savingAvail, setSavingAvail] = useState(false);

  async function saveAvailability(accepting: boolean, oooDate: string) {
    if (!doctor) return;
    setSavingAvail(true);
    const { error } = await supabase
      .from("partner_doctors")
      .update({
        is_accepting_cases:  accepting,
        out_of_office_until: oooDate ? new Date(oooDate).toISOString() : null,
      })
      .eq("id", doctor.id);
    setSavingAvail(false);
    if (error) toast("Failed to update availability. Run pending SQL migrations first.", "error");
    else {
      await logGpAudit(supabase, {
        doctorId: doctor.id,
        action: "gp_availability_updated",
        tableName: "partner_doctors",
        recordId: doctor.id,
        newValue: { is_accepting_cases: accepting, out_of_office_until: oooDate || null },
      });
      toast("Availability updated.");
      router.refresh();
    }
  }

  async function handleAcceptingToggle(value: boolean) {
    setIsAccepting(value);
    if (value) setOutOfOfficeUntil("");
    await saveAvailability(value, value ? "" : outOfOfficeUntil);
  }

  // ── Prescription defaults ──────────────────────────────────────────────────
  const [pharmacyName,    setPharmacyName]    = useState(doctor?.default_pharmacy_name    ?? "");
  const [pharmacyAddress, setPharmacyAddress] = useState(doctor?.default_pharmacy_address ?? "");
  const [savingPharmacy,  setSavingPharmacy]  = useState(false);

  async function savePharmacyDefaults() {
    if (!doctor) return;
    setSavingPharmacy(true);
    const { error } = await supabase
      .from("partner_doctors")
      .update({
        default_pharmacy_name:    pharmacyName.trim()    || null,
        default_pharmacy_address: pharmacyAddress.trim() || null,
      })
      .eq("id", doctor.id);
    setSavingPharmacy(false);
    if (error) toast("Failed to save pharmacy defaults.", "error");
    else {
      await logGpAudit(supabase, {
        doctorId: doctor.id,
        action: "gp_prescription_defaults_updated",
        tableName: "partner_doctors",
        recordId: doctor.id,
        newValue: {
          default_pharmacy_name: pharmacyName.trim() || null,
          default_pharmacy_address: pharmacyAddress.trim() || null,
        },
      });
      toast("Prescription defaults saved.");
      router.refresh();
    }
  }

  // ── Platform ───────────────────────────────────────────────────────────────
  const [timezone, setTimezone] = useState(doctor?.display_timezone ?? "Europe/Dublin");
  const [savingPlatform, setSavingPlatform] = useState(false);

  async function savePlatformPrefs() {
    if (!doctor) return;
    setSavingPlatform(true);
    const { error } = await supabase
      .from("partner_doctors")
      .update({ display_timezone: timezone })
      .eq("id", doctor.id);
    setSavingPlatform(false);
    if (error) toast("Failed to save platform preferences.", "error");
    else {
      await logGpAudit(supabase, {
        doctorId: doctor.id,
        action: "gp_platform_preferences_updated",
        tableName: "partner_doctors",
        recordId: doctor.id,
        newValue: { display_timezone: timezone },
      });
      toast("Platform preferences saved.");
      router.refresh();
    }
  }

  const initials = firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : "GP";
  const displayName = firstName || lastName ? `Dr. ${firstName} ${lastName}`.trim() : "Partner GP";

  if (!doctor) {
    return (
      <div className="min-h-screen px-5 py-10">
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <div className="mt-6 max-w-lg rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-5">
          <p className="text-sm font-semibold text-amber-200">Partner GP profile unavailable</p>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Your account is not linked to an active partner doctor profile, or your access has been suspended.
            Contact ExpressGP administration to restore access. Clinical settings cannot be changed until then.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/15 hover:bg-white/15"
            >
              Back to dashboard
            </Link>
            {userEmail && (
              <p className="self-center text-xs text-white/40">
                Signed in as <span className="text-white/70">{userEmail}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Page header + tab bar ── */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1729]/85 px-5 pb-0 pt-6 backdrop-blur">
        <p className="mb-4 text-xl font-light tracking-[0.04em] text-white">Settings</p>
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={[
                "shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === id
                  ? "border-b-2 border-[#22c55e] text-white"
                  : "text-white/50 hover:text-white/80",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Notification strip — lives inside the sticky header, always clear of content */}
        {toasts.length > 0 && (
          <div className="border-t border-white/10 py-2 space-y-1" aria-live="polite">
            {toasts.map((t) => (
              <ToastItem key={t.id} t={t} onDismiss={dismissToast} />
            ))}
          </div>
        )}
      </header>

      {/* ── Content ── */}
      <main className="px-5 py-7">

        {/* ─────────────────── GP Profile ─────────────────── */}
        {activeTab === "profile" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-white">GP Profile</h2>
              <p className="mt-1 text-sm text-white/50">Update your name and photo. All other fields are managed by administration.</p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] px-4 py-5 ring-1 ring-white/10">
              {/* Avatar + name header */}
              <div className="mb-6 flex items-center gap-4 border-b border-white/10 pb-6">
                <div className="relative shrink-0">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={displayName}
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-[#22c55e]/40"
                    />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-[#22c55e]/15 text-lg font-semibold text-[#86efac] ring-1 ring-[#22c55e]/35">
                      {initials}
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                      <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{displayName}</p>
                  <p className="text-xs text-white/45">{userEmail || doctor?.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      {uploadingPhoto ? "Uploading…" : "Change photo"}
                    </button>
                    {photoUrl && (
                      <button
                        onClick={async () => {
                          if (!doctor) return;
                          const { error } = await supabase
                            .from("partner_doctors")
                            .update({ profile_photo_url: null })
                            .eq("id", doctor.id);
                          if (error) {
                            toast("Failed to remove photo.", "error");
                            return;
                          }
                          setPhotoUrl("");
                          await logGpAudit(supabase, {
                            doctorId: doctor.id,
                            action: "gp_profile_photo_removed",
                            tableName: "partner_doctors",
                            recordId: doctor.id,
                            newValue: { profile_photo_url: null },
                          });
                          toast("Photo removed.");
                          router.refresh();
                        }}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/35 transition-colors hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                    <span className="text-xs text-white/25">JPEG, PNG or WebP · max 5 MB</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First name">
                  <TextInput value={firstName} onChange={setFirstName} placeholder="First name" />
                </Field>
                <Field label="Last name">
                  <TextInput value={lastName} onChange={setLastName} placeholder="Last name" />
                </Field>
                <Field label="Email address">
                  <ReadOnlyField value={userEmail || doctor?.email || "—"} />
                </Field>
                <Field label="IMC number">
                  <ReadOnlyField value={doctor?.imc_number || "—"} />
                </Field>
                <Field label="Employment type">
                  <ReadOnlyField value={
                    doctor?.employment_type === "contracted" ? "Contracted"
                    : doctor?.employment_type === "employed" ? "Employed"
                    : "—"
                  } />
                </Field>
                <Field label="Account status">
                  <ReadOnlyField value={doctor?.is_active ? "Active" : "Inactive"} />
                </Field>
              </div>
            </div>

            <SaveButton onClick={saveProfile} loading={savingProfile} />
          </div>
        )}

        {/* ─────────────────── Security ─────────────────── */}
        {activeTab === "security" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-white">Security</h2>
              <p className="mt-1 text-sm text-white/50">Manage your credentials and authentication settings.</p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] px-4 py-5 ring-1 ring-white/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/35">Last sign-in</p>
              <p className="mt-2 text-sm text-white">{formatDateTime(lastSignInAt)}</p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] px-4 py-5 ring-1 ring-white/10 space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">Password</p>
                <p className="mt-1 text-xs text-white/45">A secure reset link will be emailed to your registered address.</p>
              </div>
              {resetSent ? (
                <div className="flex items-start gap-3 rounded-xl bg-[#22c55e]/10 px-4 py-3 ring-1 ring-[#22c55e]/25">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm text-[#86efac]">A password reset link has been sent to your registered email address.</p>
                </div>
              ) : (
                <button
                  onClick={sendPasswordReset}
                  disabled={sendingReset}
                  className="rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  {sendingReset ? "Sending…" : "Send password reset email"}
                </button>
              )}
            </div>

            <div className="rounded-2xl bg-amber-500/[0.06] px-4 py-5 ring-1 ring-amber-500/20 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Two-factor authentication</p>
                  <p className="mt-1 text-xs text-white/45">Adds a second layer of protection via an authenticator app.</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-amber-500/30">
                      Coming soon — will be mandatory for production
                    </span>
                  </div>
                </div>
                <Toggle checked={false} onChange={() => {}} disabled />
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-red-500/10 px-5 py-4 ring-1 ring-red-500/25">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-red-300">
                Two-factor authentication is not enabled on your account. It will be mandatory before this platform goes live.
              </p>
            </div>
          </div>
        )}

        {/* ─────────────────── Notifications ─────────────────── */}
        {activeTab === "notifications" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-white">Notifications</h2>
              <p className="mt-1 text-sm text-white/50">
                Mandatory alerts cannot be disabled — they are required for clinical safety and your obligations as a registered GP on this platform.
              </p>
            </div>

            {/* Email — mandatory */}
            <div className="rounded-2xl bg-white/[0.04] px-4 py-5 ring-1 ring-white/10 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/35 pb-1">Email — always on</p>
              <MandatoryNotifRow
                label="New consultation submitted"
                description="You are notified every time a patient consultation enters the pending queue. You cannot disable this — your availability as a GP on this platform depends on receiving these."
              />
              <MandatoryNotifRow
                label="Red flag triage alert"
                description="Sent whenever the AI triage flags a potentially urgent clinical case. This alert cannot be disabled under any circumstances. Missing a red flag and failing to act could have serious patient safety consequences."
              />
            </div>

            {/* Email — configurable */}
            <div className="rounded-2xl bg-white/[0.04] px-4 py-5 ring-1 ring-white/10 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/35 pb-1">Email — configurable</p>
              <ConfigNotifRow
                label="New patient message"
                description="Alert when a patient sends a follow-up message on an open consultation."
                checked={notif.email_new_message}
                onChange={(v) => saveNotifPref("email_new_message", v)}
              />
              <ConfigNotifRow
                label="Daily summary"
                description="Morning digest of outstanding consultations and your queue status."
                checked={notif.daily_summary_email}
                onChange={(v) => saveNotifPref("daily_summary_email", v)}
              />
            </div>

            {/* WhatsApp */}
            <div className="rounded-2xl bg-white/[0.04] px-4 py-5 ring-1 ring-white/10 space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <svg className="h-3.5 w-3.5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/35">WhatsApp alerts — always on</p>
              </div>
              <MandatoryNotifRow
                label="Red flag triage (WhatsApp)"
                description="An urgent WhatsApp message is sent for every AI-flagged case. This runs alongside the email alert and cannot be disabled."
              />
              <MandatoryNotifRow
                label="New consultation (WhatsApp)"
                description="WhatsApp notification for each incoming consultation. Ensures you are reached even if email is delayed."
              />
              <div className="mt-1 rounded-xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/8">
                <p className="text-xs text-white/35">
                  ExpressGP uses WhatsApp for clinical notifications, not SMS. WhatsApp delivery is handled automatically via the platform — there is no per-GP opt-out for mandatory clinical alerts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────── Availability ─────────────────── */}
        {activeTab === "availability" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-white">Availability</h2>
              <p className="mt-1 text-sm text-white/50">
                Controls whether you appear in the active GP pool. When you are unavailable, patients are shown a message that the service is operating and they will receive a response by the next working day.
              </p>
            </div>

            {!isAccepting && (
              <div className="flex items-start gap-3 rounded-2xl bg-red-500/10 px-5 py-4 ring-1 ring-red-500/25">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-300">You are not currently accepting new consultations.</p>
                  <p className="mt-1 text-xs text-red-300/70">
                    Patients submitting now will see: <em>"Our GP team is available and your consultation will be reviewed by the next working day."</em>
                  </p>
                </div>
              </div>
            )}

            <div className={[
              "rounded-2xl p-6 ring-1",
              isAccepting ? "bg-[#22c55e]/[0.06] ring-[#22c55e]/25" : "bg-red-500/[0.06] ring-red-500/25",
            ].join(" ")}>
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-base font-semibold text-white">Accepting new consultations</p>
                  <p className={["mt-1 text-sm", isAccepting ? "text-[#86efac]" : "text-red-300"].join(" ")}>
                    {isAccepting
                      ? "You are live. New consultations are being routed to you."
                      : "You are offline. Patients will be advised of next working day response."}
                  </p>
                </div>
                <Toggle checked={isAccepting} onChange={handleAcceptingToggle} disabled={savingAvail} />
              </div>
            </div>

            {!isAccepting && (
              <div className="rounded-2xl bg-white/[0.04] px-4 py-5 ring-1 ring-white/10 space-y-3">
                <Field label="Return date (optional)">
                  <input
                    type="date"
                    value={outOfOfficeUntil}
                    onChange={(e) => setOutOfOfficeUntil(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm text-white ring-1 ring-white/15 outline-none focus:ring-2 focus:ring-[#22c55e]/50 transition-shadow [color-scheme:dark]"
                  />
                </Field>
                <p className="text-xs text-white/35">Visible to ExpressGP admins only. Does not automatically re-enable availability.</p>
                <SaveButton onClick={() => saveAvailability(isAccepting, outOfOfficeUntil)} loading={savingAvail} label="Save return date" />
              </div>
            )}
          </div>
        )}

        {/* ─────────────────── Prescription Defaults ─────────────────── */}
        {activeTab === "prescription" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-white">Prescription Defaults</h2>
              <p className="mt-1 text-sm text-white/50">Pre-filled when you issue a prescription — saves time on repeat fields.</p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] px-4 py-5 ring-1 ring-white/10 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Default pharmacy name">
                  <TextInput value={pharmacyName} onChange={setPharmacyName} placeholder="e.g. Boots Pharmacy, Grafton Street" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Pharmacy address">
                  <TextInput value={pharmacyAddress} onChange={setPharmacyAddress} placeholder="Full address including Eircode" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Digital signature">
                  <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-3 ring-1 ring-white/10">
                    <svg className="h-5 w-5 shrink-0 text-white/20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M15.232 5.232a3 3 0 0 1 4.243 4.243L7 22H3v-4L15.232 5.232z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-sm text-white/35 flex-1">Signature upload</p>
                    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-amber-500/25">
                      Coming soon
                    </span>
                  </div>
                </Field>
              </div>
            </div>

            <SaveButton onClick={savePharmacyDefaults} loading={savingPharmacy} />
          </div>
        )}

        {/* ─────────────────── Data & Privacy ─────────────────── */}
        {activeTab === "data-privacy" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-white">Data & Privacy</h2>
              <p className="mt-1 text-sm text-white/50">Your data rights and platform compliance information.</p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] px-4 py-5 ring-1 ring-white/10 space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] px-4 py-4 ring-1 ring-white/10">
                <div>
                  <p className="text-sm font-medium text-white">Download my data</p>
                  <p className="mt-0.5 text-xs text-white/40">Export all data associated with your account.</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => { console.log("[ExpressGP] Download my data — not yet implemented"); toast("Data export is not yet available.", "error"); }}
                    className="rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-white/55 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Export
                  </button>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/25">Coming soon</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] px-4 py-4 ring-1 ring-white/10">
                <div>
                  <p className="text-sm font-medium text-white">Audit log</p>
                  <p className="mt-0.5 text-xs text-white/40">View all activity recorded against your account.</p>
                </div>
                <Link
                  href="/dashboard/audit-log"
                  className="rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-white/55 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white"
                >
                  View →
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-blue-500/[0.06] px-4 py-5 ring-1 ring-blue-500/20 space-y-4">
              <div className="flex gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-blue-300">Data retention</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/50">
                      Patient records, consultation records, and prescription records are retained for a minimum of{" "}
                      <span className="font-semibold text-white/75">8 years</span> in accordance with Irish medical record retention requirements as set out by the Medical Council of Ireland.
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-300">GDPR compliance</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/50">
                      Patient data is processed in accordance with the{" "}
                      <span className="font-semibold text-white/75">General Data Protection Regulation (GDPR)</span> and the{" "}
                      <span className="font-semibold text-white/75">Irish Data Protection Act 2018</span>. ExpressGP acts as a data processor on behalf of the patient and the supervising clinical practice. All data is stored within the EU.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────── Platform ─────────────────── */}
        {activeTab === "platform" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-white">Platform</h2>
              <p className="mt-1 text-sm text-white/50">Display and locale preferences.</p>
            </div>

            <div className="rounded-2xl bg-white/[0.04] px-4 py-5 ring-1 ring-white/10 grid gap-5 sm:grid-cols-2">
              <div>
                <Field label="Timezone">
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-lg bg-white/[0.06] px-3 py-2.5 text-sm text-white ring-1 ring-white/15 outline-none focus:ring-2 focus:ring-[#22c55e]/50 transition-shadow appearance-none"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value} className="bg-[#0f1729]">{tz.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div>
                <Field label="Theme">
                  <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/10">
                    <p className="flex-1 text-sm text-white/35">Dark / light mode</p>
                    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-amber-500/25">
                      Coming soon
                    </span>
                  </div>
                </Field>
              </div>
            </div>

            <SaveButton onClick={() => void savePlatformPrefs()} loading={savingPlatform} label="Save preferences" />
          </div>
        )}

      </main>
    </>
  );
}
