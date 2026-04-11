"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessDenied = searchParams.get("error") === "access_denied";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(
    accessDenied ? "Your account does not have admin access." : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Middleware will validate admin_users and redirect to /admin or back here with error
    router.push("/admin");
    router.refresh();
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
          placeholder="admin@expressgp.ie"
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(251,191,36,0.5)";
            e.target.style.boxShadow = "0 0 0 3px rgba(251,191,36,0.10)";
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
            e.target.style.borderColor = "rgba(251,191,36,0.5)";
            e.target.style.boxShadow = "0 0 0 3px rgba(251,191,36,0.10)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgba(255,255,255,0.10)";
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            borderRadius: "12px",
            border: "1px solid rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.08)",
            padding: "12px 14px",
          }}
        >
          <svg
            style={{ flexShrink: 0, marginTop: "1px", width: "16px", height: "16px", color: "#f87171" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p style={{ fontSize: "13px", color: "#fca5a5", margin: 0 }}>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: "4px",
          width: "100%",
          borderRadius: "12px",
          border: "none",
          background: loading ? "rgba(251,191,36,0.4)" : "#f59e0b",
          padding: "13px 16px",
          fontSize: "14px",
          fontWeight: 600,
          color: "#0f1729",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 4px 24px rgba(251,191,36,0.20)",
          transition: "background 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#d97706"; }}
        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#f59e0b"; }}
      >
        {loading ? "Signing in…" : "Sign in to Admin"}
      </button>
    </form>
  );
}
