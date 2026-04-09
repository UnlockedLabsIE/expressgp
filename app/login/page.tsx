import Image from "next/image";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: "#0f1729" }}
    >
      {/* ── Left panel (branding) — hidden on small screens ── */}
      <div
        className="hidden flex-col justify-between p-12 lg:flex"
        style={{ width: "420px", flexShrink: 0, background: "rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div style={{ position: "relative", height: "48px", width: "180px", overflow: "hidden", borderRadius: "14px", background: "rgba(255,255,255,0.06)", boxShadow: "0 0 0 1px rgba(255,255,255,0.10)" }}>
          <Image
            src="/logo.png"
            alt="ExpressGP"
            fill
            priority
            sizes="180px"
            className="object-cover opacity-95"
            style={{ objectPosition: "50% 45%" }}
          />
        </div>

        <div>
          <p
            style={{ fontSize: "28px", fontWeight: 600, lineHeight: 1.3, color: "white", marginBottom: "16px" }}
          >
            Async GP care,<br />done right.
          </p>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
            Review consultations, issue prescriptions, and manage your patient queue — all from one focused dashboard.
          </p>
        </div>

        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
          © {new Date().getFullYear()} ExpressGP Ireland Ltd.
        </p>
      </div>

      {/* ── Right panel (form) ── */}
      <div
        className="flex flex-1 flex-col items-center justify-center p-6"
      >
        {/* Logo for mobile */}
        <div
          className="mb-8 lg:hidden"
          style={{ position: "relative", height: "44px", width: "160px", overflow: "hidden", borderRadius: "12px", background: "rgba(255,255,255,0.06)", boxShadow: "0 0 0 1px rgba(255,255,255,0.10)" }}
        >
          <Image
            src="/logo.png"
            alt="ExpressGP"
            fill
            sizes="160px"
            className="object-cover opacity-95"
            style={{ objectPosition: "50% 45%" }}
          />
        </div>

        {/* Card */}
        <div
          style={{
            width: "100%",
            maxWidth: "400px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "20px",
            padding: "36px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          }}
        >
          <h1
            style={{ fontSize: "22px", fontWeight: 600, color: "white", marginBottom: "4px" }}
          >
            GP Sign In
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", marginBottom: "28px" }}>
            Partner doctor access only
          </p>

          <Suspense
            fallback={
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ height: "48px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: "48px", borderRadius: "12px", background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: "48px", borderRadius: "12px", background: "rgba(34,197,94,0.15)", animation: "pulse 1.5s ease-in-out infinite" }} />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>

        <p style={{ marginTop: "24px", fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>
          ExpressGP &mdash; Secure clinical platform
        </p>
      </div>
    </div>
  );
}
