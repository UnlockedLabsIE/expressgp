# GP data governance — handoff checklist (ExpressGP)

Internal checklist for privacy lead / future DPO and clinical lead. Not legal advice.

**DPO / clinical summary (IMC, audit v1, offline messaging, shared record UI):** [ADR 0001 — gp-self-service-dpo-decisions](./adr/0001-gp-self-service-dpo-decisions.md).

## Decisions already recorded in product / engineering

1. **IMC and employment / account status** — changed only by administration (`service_role`); enforced in DB trigger `partner_doctors_enforce_field_limits` (migration `gp_self_update_partner_doctors.sql`).
2. **Shared in-platform clinical record** — any active partner GP who has had a consultation assigned for patient P may read consultations, prescriptions, documents, messages, and triage for **all** of P’s rows on ExpressGP (migration `shared_clinical_record_rls.sql`). Update the **privacy notice** and complete a **DPIA** before production marketing claims.
3. **GP Settings audit log (v1)** — `/dashboard/audit-log` lists `audit_logs` where `actor_id = auth.uid()` and `actor_type = partner_doctor` (narrow accountability view, not the full clinical chart).
4. **Offline GPs (`is_accepting_cases`)** — dashboard + consultations list show a banner; align **patient-facing** copy on the public / patient app with Settings (next working day). Sign-off: clinical ops + privacy.

## Storage: `doctor-photos` (verified in repo)

- **Migration:** `supabase/migrations/storage_doctor_photos_policies.sql` — upserts public bucket `doctor-photos`, **public read**, and policies so **authenticated** users may insert/update/delete only objects whose storage path starts with `{auth.uid()}/` (first path segment = Supabase user id).
- **App:** GP profile photo upload uses bucket `doctor-photos` in `app/dashboard/settings/SettingsClient.tsx`.
- **Deploy:** run the migration on the Supabase project so the bucket and policies exist in the remote project (Dashboard can still create the bucket manually if needed).

## Still manual in Supabase

- Apply all pending SQL migrations in order (including `storage_doctor_photos_policies.sql` and `shared_clinical_record_rls.sql`). If the dashboard shows **infinite recursion detected in policy for relation "consultations"**, apply **`shared_clinical_record_rls_fix_recursion.sql`** (or re-run the updated `shared_clinical_record_rls.sql` which defines `gp_auth_user_treated_patient` and non-recursive policies).
- In Storage, confirm bucket `doctor-photos` exists and policies apply after migration.

## Optional follow-ups

- Widen or narrow **audit log** scope after DPO review.
- **Admin** dashboards: confirm counts of “active GPs” match `is_accepting_cases` expectations.
