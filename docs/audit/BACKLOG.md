# ExpressGP Audit Backlog

Source: full technical + clinical review conducted 2026-04-20/21. This file tracks every remaining item, grouped by priority, with file paths and fix notes. Tick items as they're completed.

**Legend**
- ✅ Done
- 🔨 In progress
- ⬜ Not started
- ❓ Needs confirmation / investigation

---

## CRITICAL — must fix before real patient data

All CRITICAL items from the original audit are closed. ✅

| Status | Issue | Location | Fix shipped |
|---|---|---|---|
| ✅ | Auth gate (`proxy.ts` not wired) | `proxy.ts` / `middleware.ts` | Next 16.2 treats `proxy.ts` as the registration point; confirmed working. |
| ✅ | Decline/refund build break (missing `stripe`) | `app/api/consultations/[id]/decline/route.ts`, `package.json` | `stripe` dependency added. |
| ✅ | `tsc --noEmit` failing on main | multiple | `ServicePricing` type defined, Supabase casts normalised, PDF types fixed. |
| ✅ | Unpaid consultations could be clinically actioned | `app/dashboard/consultations/[id]/page.tsx` | Payment-status guard added on claim/issue/approve. |
| ✅ | Video route IDOR risk | `app/api/video/route.ts` | App-level `partner_doctor_id === auth.uid` check added. |
| ✅ | Placeholder IMC on legal PDFs | `consultations/[id]/page.tsx`, PDF generators | Block on missing/placeholder IMC. |
| ✅ | Next.js DoS advisory (GHSA-q4gf-8mx6-v5v3) | `package.json` | Upgraded to Next 16.2.4. |

---

## IMPORTANT — before public launch

### Already done

| Status | Issue | Commit / file |
|---|---|---|
| ✅ | Inconsistent clinical audit logging | `consultations/[id]/page.tsx` — `audit()` calls added for every material action |
| ✅ | `getUnreadMessageCount` missing doctor filter | `lib/queries.ts` |
| ✅ | `console.log` of user id | `lib/queries.ts` — gated behind `devLog()` helper |
| ✅ | `loadServicePricing` anon REST read | `lib/config/services.ts` — function deleted, pricing in code |
| ✅ | Healthmail “send” stub (false-dispatch risk) | `consultations/[id]/page.tsx`, `PrescriptionsClient.tsx` — disabled with tooltip + TODO |
| ✅ | Privacy / DPIA links absent on login | `app/login/page.tsx`, `app/login/LoginForm.tsx` |
| ✅ | Retention copy mismatch (7 vs 8 years) | `PatientsClient.tsx` — 8 years, GDPR Art.17(3)(b) |
| ✅ | List views expose clinical body text | `MessagesClient.tsx`, `PrescriptionsClient.tsx`, `PatientsClient.tsx` — data-minimised |
| ✅ | Middleware comment lies | `lib/supabase-server.ts` |
| ✅ | Governance drift on migrations | `docs/audit/MIGRATION_RECONCILIATION_2026-04-21.md` + baseline migrations committed |

### Remaining

| Status | Issue | Location | Recommended fix | Effort |
|---|---|---|---|---|
| ⬜ | **Reissue duplicates without governance** | `app/dashboard/documents/DocumentsClient.tsx` reissue flow (~193+) | Policy for supersession: version number, `supersedes_id` FK, explicit "voided & reissued" state, audit event. DB constraint or soft-invalidate pattern. | 2–3 h |
| ⬜ | **Controlled-drug check only covers `prescriptions.medication`** | `supabase/migrations/add_gdpr_fixes.sql` (~245–276) | Extend controlled-drug trigger to `documents.content` when `document_type` could carry prescribing text. Review false-positive words like "codeine" when embedded in allergy notes. | 1–2 h |
| ⬜ | **`partner_doctors_select_authenticated` exposes full rows** | DB policy (see `0000_baseline_*.sql` line ~1926) | Create a view `partner_doctors_directory` with only name, photo, IMC, is_active; grant SELECT on the view, revoke the wide policy. | 1–2 h |
| ⬜ | **Recreate `notify-patient` webhook per env** | `supabase/migrations/0001_backfill_database_webhook_notify_patient.sql` | Configure via Dashboard → Database Webhooks for dev and staging with the correct project URL. | 15 min |
| ⬜ | **Retire legacy `audit_log` table on prod** | `supabase/migrations/0002_retire_audit_log_legacy_table.sql` | Run against prod (guarded by row-count check, no-op if non-empty). | 5 min |
| ⬜ | **Automated schema drift detection** | — | Weekly CI job: `pg_dump --schema-only` of prod, diff against committed snapshot, fail on diff. | 1–2 h |
| ⬜ | **Missing `try/catch` around Supabase calls** | many files | Wrap network calls; surface mutation errors in UI (claim, issue, approve). | 3–4 h (steady nibble) |
| ⬜ | **Missing error states on mutation forms** | claim, issue, approve flows | Dedicated error UI, not just `if (error)` → silent. | 2–3 h |
| ❓ | **Consent gating end-to-end** | `getLatestPatientConsentForPatient` + callers | Verify every PHI-touching path actually calls it and blocks on absence. | audit + fix, 2–3 h |
| ❓ | **DPIA + processor list** | docs (not code) | Document lawful basis, data categories, retention, subprocessors (Supabase, Resend, Bird, Whereby, Stripe). | legal task |
| ❓ | **Data residency** | Supabase project in `eu-west-2` (London) | London is a UK AWS region; for HPRA/GDPR Irish patient data, confirm with counsel whether Ireland or Frankfurt is required. If yes → migrate project region. | counsel + migration |

### Additional IMPORTANT items not in the original audit but surfaced since

| Status | Issue | Why it matters | Effort |
|---|---|---|---|
| ⬜ | **No rate limiting on public API routes** | `/api/auth/*`, `/api/video`, `/api/notify` | Brute force / abuse surface on a medical login. Add per-IP + per-user limits via Upstash Ratelimit or Supabase edge rules. | 2–4 h |
| ⬜ | **No session timeout for GPs** | Sessions live as long as Supabase default | GPs on shared devices; a 30–60 min idle logout with last-action tracker is expected on clinical systems. | 2–3 h |
| ⬜ | **No production error monitoring** | Errors only visible in Vercel logs after the fact | Wire up Sentry (or equivalent) with PII scrubbing. Critical for post-launch triage. | 1–2 h |
| ⬜ | **No 2FA/MFA for GP accounts** | Single-factor auth on a controlled-drug-adjacent workflow | Supabase Auth supports TOTP; require for `partner_doctor` role. | 3–4 h + comms |
| ⬜ | **Data retention jobs don't actually delete** | Copy mentions 8 years, but there's no scheduled task | Cron job (Supabase `pg_cron` or external) that anonymises patients at T+8y and logs each action. | 3–5 h |
| ⬜ | **No breach notification runbook** | GDPR Art.33 requires notification within 72 h | Document the process, on-call rota, template letters. | docs task |
| ⬜ | **No DPA with Vercel / Supabase / Stripe / Resend / Bird / Whereby** | GDPR Art.28 | Obtain and file DPAs from each subprocessor. | legal task |

---

## NICE TO HAVE — post-launch

| Status | Issue | Location | Notes |
|---|---|---|---|
| ✅ | Replace `alert()` for Healthmail stub | `PrescriptionsClient.tsx` | Handled during Healthmail disable; button is now disabled with tooltip, no `alert()`. |
| ⬜ | Refactor monolithic `consultations/[id]/page.tsx` (~1,200 lines) | same file | Split into hooks + server actions + feature components. Maintainability risk when it grows further. |
| ⬜ | `aria-label` on icon-only buttons | dashboard + admin globally | Accessibility. Start with `PrescriptionDetail` close button (~228), then sweep. |
| ⬜ | WCAG AA contrast audit | `text-white/35`, `text-white/40`, `text-white/50` tokens | Likely fails on `#0f1729` background. Propose replacements, update Tailwind config. |
| ⬜ | Mobile responsive table replacement | `PrescriptionsClient.tsx` `min-w-[900px]`, similar elsewhere | Card layout on small screens instead of horizontal scroll. |
| ⬜ | `npm` `devdir` warning | local env config | Clean up `.npmrc`. |
| ⬜ | Resolve `vapi_call_id` type vs actual integrations | `types/index.ts` | Either wire Vapi up or remove the stale type. |
| ⬜ | EU AI Act: explicit "AI-assisted triage" labelling | patient app (not in this repo) | Out of scope here; tracked for the patient app repo. |
| ⬜ | Structured AI-override audit event | `consultations/[id]/page.tsx` | When GP dismisses/replaces AI recommendation, emit a dedicated `audit_logs` event with before/after. Stronger AI Act traceability. |
| ⬜ | Clickable table rows missing keyboard story | `PatientsClient.tsx`, `MessagesClient.tsx` | `role="button"`, `tabIndex={0}`, Enter/Space handlers, or convert to `<button>`. |
| ⬜ | Tap target size audit | many `h-8 w-8` controls | < 44×44 px fails mobile guidelines. |
| ⬜ | Centralise hardcoded user-facing copy | across dashboard/admin | Extract to `i18n`-ready strings once product stabilises. |

---

## Items explicitly deferred / not worth doing

- **Split consultations page right now** — wait until a specific bug or feature forces the refactor; premature splitting adds noise.
- **i18n framework** — English-only launch is fine; revisit when multi-language is on the product roadmap.

---

## How to use this file

1. Pick any ⬜ item that fits the time you have.
2. Work it in a dedicated branch; one PR per logical task.
3. Flip ⬜ → 🔨 → ✅ here as part of the same PR.
4. If a new issue is found mid-task, add it to the bottom of its section rather than derailing the current task.

---

_Last updated: 2026-04-21. Derived from the original audit output and work completed through migration reconciliation._
