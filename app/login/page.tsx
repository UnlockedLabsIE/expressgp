"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/app/components/Logo";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
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
          Welcome back
        </h1>
        <p className="mt-1 text-center text-sm text-[#6B7280]">
          Sign in to your ExpressGP account.
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F2744]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onEnter}
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#0F2744] focus:border-[#28A863] focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-[#0F2744]">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#2F6FB6] hover:text-[#2FB36F]"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onEnter}
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#0F2744] focus:border-[#28A863] focus:outline-none"
            />
          </div>

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
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-[#6B7280]">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-[#2F6FB6] hover:text-[#2FB36F]"
          >
            Get started →
          </Link>
        </p>
      </div>
    </div>
  );
}
