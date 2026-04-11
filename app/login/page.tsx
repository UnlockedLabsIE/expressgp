import Image from "next/image";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen" style={{ background: "#0f1729" }}>

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex flex-col p-12"
        style={{
          width: "440px",
          flexShrink: 0,
          background: "rgba(255,255,255,0.025)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Top section — logo centred, takes less space */}
        <div style={{ flex: "0 0 38%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            position: "relative",
            height: "52px",
            width: "210px",
            overflow: "hidden",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.07)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.10)",
          }}>
            <Image
              src="/logo.png"
              alt="ExpressGP"
              fill
              priority
              sizes="210px"
              className="object-cover opacity-95"
              style={{ objectPosition: "50% 45%" }}
            />
          </div>
        </div>

        {/* Bottom section — tagline flush to top, copyright pinned to bottom */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: "8px" }}>
        <div>
          <p style={{ fontSize: "30px", fontWeight: 700, lineHeight: 1.3, color: "white", marginBottom: "16px" }}>
            Async GP Care,<br />Done Right.
          </p>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.42)", lineHeight: 1.75 }}>
            Review consultations, issue prescriptions, and manage your patient queue — all from one focused dashboard.
          </p>

          {/* Feature pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "28px" }}>
            {["Secure & Encrypted", "GDPR Compliant", "Irish Medical Standards", "Audit Logged"].map((label) => (
              <span
                key={label}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "rgba(34,197,94,0.85)",
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.18)",
                  borderRadius: "999px",
                  padding: "4px 12px",
                  letterSpacing: "0.02em",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.22)", marginTop: "32px" }}>
          © {new Date().getFullYear()} ExpressGP Ireland Ltd.
        </p>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">

        {/* Logo — mobile only, centred */}
        <div
          className="mb-8 lg:hidden"
          style={{
            position: "relative",
            height: "44px",
            width: "168px",
            overflow: "hidden",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.06)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.10)",
          }}
        >
          <Image
            src="/logo.png"
            alt="ExpressGP"
            fill
            sizes="168px"
            className="object-cover opacity-95"
            style={{ objectPosition: "50% 45%" }}
          />
        </div>

        {/* Card */}
        <div
          style={{
            width: "100%",
            maxWidth: "400px",
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "24px",
            padding: "40px",
            boxShadow: "0 32px 80px rgba(0,0,0,0.45)",
          }}
        >
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "white", marginBottom: "4px", letterSpacing: "-0.01em" }}>
            Welcome Back
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.40)", marginBottom: "32px" }}>
            Sign in to your ExpressGP account
          </p>

          <Suspense
            fallback={
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ height: "48px", borderRadius: "12px", background: "rgba(255,255,255,0.06)" }} />
                <div style={{ height: "48px", borderRadius: "12px", background: "rgba(255,255,255,0.06)" }} />
                <div style={{ height: "48px", borderRadius: "12px", background: "rgba(34,197,94,0.12)" }} />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>

        <p style={{ marginTop: "28px", fontSize: "12px", color: "rgba(255,255,255,0.18)", textAlign: "center" }}>
          ExpressGP &mdash; Secure Clinical Platform &mdash; support@expressgp.ie
        </p>
      </div>
    </div>
  );
}
