"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/app/components/Logo";
import { supabase } from "@/lib/supabase";

type Gender = "male" | "female" | "other" | "prefer_not_to_say" | "";

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender>("");
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (!marketingConsent) {
      setError("Please tick the consent box to continue.");
      return;
    }

    setSubmitting(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      { email, password },
    );

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      // Email confirmation is enabled in Supabase — no session yet, can't
      // insert into patients under RLS. Tell the user what to do next.
      setError(
        "Account created. Please check your email to confirm your address before signing in.",
      );
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("patients").insert({
      id: userId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      // schema.sql declares password_hash NOT NULL even though Supabase auth
      // owns the password. Placeholder until that column is dropped.
      password_hash: "managed_by_supabase_auth",
      dob,
      phone: phone.trim() || null,
      gender: gender || null,
      marketing_consent: marketingConsent,
    });

    if (insertError) {
      setError(`Could not create your patient profile: ${insertError.message}`);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  }

  function onEnter(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !submitting) {
      void handleSubmit();
    }
  }

  return (
    <div className="flex flex-1 items-start justify-center bg-[#F9FAFB] px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex justify-center">
          <Logo height={44} />
        </div>

        <h1 className="mt-6 text-center text-2xl font-bold text-[#0F2744]">
          Create your account
        </h1>
        <p className="mt-1 text-center text-sm text-[#6B7280]">
          Join ExpressGP and see a real Irish GP today.
        </p>

        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="First name"
              required
              value={firstName}
              onChange={setFirstName}
              onKeyDown={onEnter}
            />
            <Field
              label="Last name"
              required
              value={lastName}
              onChange={setLastName}
              onKeyDown={onEnter}
            />
          </div>

          <Field
            label="Email"
            type="email"
            required
            value={email}
            onChange={setEmail}
            onKeyDown={onEnter}
            autoComplete="email"
          />

          <Field
            label="Password"
            type="password"
            required
            value={password}
            onChange={setPassword}
            onKeyDown={onEnter}
            autoComplete="new-password"
            help="At least 8 characters."
          />

          <Field
            label="Date of birth"
            type="date"
            required
            value={dob}
            onChange={setDob}
            onKeyDown={onEnter}
          />

          <Field
            label="Phone number (optional)"
            type="tel"
            value={phone}
            onChange={setPhone}
            onKeyDown={onEnter}
            autoComplete="tel"
          />

          <div>
            <label className="block text-sm font-medium text-[#0F2744]">
              Gender (optional)
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#0F2744] focus:border-[#28A863] focus:outline-none"
            >
              <option value="">Prefer not to answer</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <label className="flex items-start gap-3 pt-2 text-sm text-[#6B7280]">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-none accent-[#28A863]"
            />
            <span>
              I agree to receive health tips and updates from ExpressGP.
            </span>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="w-full rounded-full bg-[#28A863] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-[#6B7280]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[#2F6FB6] hover:text-[#2FB36F]"
          >
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}

// Reusable controlled input. Kept inline to avoid creating yet another file
// for what's only used by the two auth pages.
function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  help?: string;
}) {
  const {
    label,
    value,
    onChange,
    onKeyDown,
    type = "text",
    required,
    autoComplete,
    help,
  } = props;

  return (
    <div>
      <label className="block text-sm font-medium text-[#0F2744]">
        {label}
        {required && <span className="ml-0.5 text-[#28A863]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#0F2744] focus:border-[#28A863] focus:outline-none"
      />
      {help && <p className="mt-1 text-xs text-[#9CA3AF]">{help}</p>}
    </div>
  );
}
