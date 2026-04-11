"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  padding: "12px 16px",
  fontSize: "14px",
  color: "white",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: "rgba(255,255,255,0.65)",
  marginBottom: "6px",
};

type Step = "form" | "choosing";

export default function LoginForm() {
  const router = useRouter();

  const [step, setStep]         = useState<Step>("form");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check what portals this user has access to
    const res = await fetch("/api/auth/roles");
    const { isAdmin, isGP } = await res.json();

    if (!isAdmin && !isGP) {
      setError("Your account doesn't have access to any portal. Contact support@expressgp.ie.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (isAdmin && isGP) {
      // Show portal choice inline
      setStep("choosing");
      setLoading(false);
      return;
    }

    // Single role — route straight through
    router.push(isAdmin ? "/admin" : "/dashboard");
    router.refresh();
  }

  // Portal choice screen shown when user has both roles
  if (step === "choosing") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.50)", textAlign: "center", margin: "0 0 4px" }}>
          Your account has access to both portals. Where would you like to go?
        </p>

        <button
          onClick={() => { router.push("/dashboard"); router.refresh(); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            borderRadius: "14px",
            border: "1px solid rgba(34,197,94,0.30)",
            background: "rgba(34,197,94,0.08)",
            padding: "16px 18px",
            cursor: "pointer",
            textAlign: "left",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.14)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.08)"; }}
        >
          <div style={{
            display: "grid", placeItems: "center",
            width: "40px", height: "40px", borderRadius: "10px",
            background: "rgba(34,197,94,0.12)", flexShrink: 0,
          }}>
            <svg style={{ width: "20px", height: "20px", color: "#22c55e" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "white", margin: "0 0 2px" }}>GP Dashboard</p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)", margin: 0 }}>Consultations, patients, documents</p>
          </div>
          <svg style={{ width: "14px", height: "14px", color: "rgba(34,197,94,0.5)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>

        <button
          onClick={() => { router.push("/admin"); router.refresh(); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            borderRadius: "14px",
            border: "1px solid rgba(251,191,36,0.25)",
            background: "rgba(251,191,36,0.06)",
            padding: "16px 18px",
            cursor: "pointer",
            textAlign: "left",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(251,191,36,0.11)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(251,191,36,0.06)"; }}
        >
          <div style={{
            display: "grid", placeItems: "center",
            width: "40px", height: "40px", borderRadius: "10px",
            background: "rgba(251,191,36,0.10)", flexShrink: 0,
          }}>
            <svg style={{ width: "20px", height: "20px", color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "white", margin: "0 0 2px" }}>Admin Portal</p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)", margin: 0 }}>Platform management, GDPR, audit log</p>
          </div>
          <svg style={{ width: "14px", height: "14px", color: "rgba(251,191,36,0.5)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <label htmlFor="email" style={labelStyle}>Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@expressgp.ie"
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(34,197,94,0.5)";
            e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.12)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgba(255,255,255,0.10)";
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      <div>
        <label htmlFor="password" style={labelStyle}>Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(34,197,94,0.5)";
            e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.12)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgba(255,255,255,0.10)";
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      {error && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "10px",
          borderRadius: "12px", border: "1px solid rgba(239,68,68,0.25)",
          background: "rgba(239,68,68,0.08)", padding: "12px 14px",
        }}>
          <svg style={{ flexShrink: 0, marginTop: "1px", width: "16px", height: "16px", color: "#f87171" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p style={{ fontSize: "13px", color: "#fca5a5", margin: 0 }}>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: "4px", width: "100%", borderRadius: "12px", border: "none",
          background: loading ? "rgba(34,197,94,0.5)" : "#22c55e",
          padding: "13px 16px", fontSize: "14px", fontWeight: 600, color: "white",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 4px 24px rgba(34,197,94,0.25)",
          transition: "background 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#16a34a"; }}
        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#22c55e"; }}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
