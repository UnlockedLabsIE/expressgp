import { Suspense } from "react";
import AdminLoginForm from "./AdminLoginForm";

export const metadata = { title: "Admin Login — ExpressGP" };

export default function AdminLoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1729",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo area */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.25)",
              marginBottom: "16px",
            }}
          >
            <svg
              style={{ width: "28px", height: "28px", color: "#fbbf24" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "white",
              margin: "0 0 6px",
            }}
          >
            ExpressGP Admin
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", margin: 0 }}>
            Restricted access — authorised personnel only
          </p>
        </div>

        {/* Login card */}
        <div
          style={{
            borderRadius: "20px",
            border: "1px solid rgba(251,191,36,0.15)",
            background: "rgba(255,255,255,0.03)",
            padding: "32px",
          }}
        >
          <Suspense>
            <AdminLoginForm />
          </Suspense>
        </div>

        <p
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "12px",
            color: "rgba(255,255,255,0.25)",
          }}
        >
          This portal is for ExpressGP platform administrators only.
          <br />
          GP staff should use the{" "}
          <a href="/login" style={{ color: "rgba(34,197,94,0.7)", textDecoration: "none" }}>
            GP login
          </a>
          .
        </p>
      </div>
    </div>
  );
}
