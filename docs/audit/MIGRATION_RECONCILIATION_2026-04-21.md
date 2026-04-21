# Migration reconciliation — 2026-04-21

## What this is

A one-off audit comparing the live Supabase production schema
(project ref `xxnffdscpeksuvcdmffz`, region `eu-west-2`) against the migrations
committed in `supabase/migrations/` as of 2026-04-21. The goal: make the git
repo the source of truth so we can detect drift going forward.

## How it was done

1. Dumped live public schema with `pg_dump --schema-only --schema=public --no-owner --no-privileges`.
2. Scrubbed the dump for any accidentally-included row data (none after re-dump).
3. Committed the snapshot to `docs/audit/schema-snapshots/2026-04-21_live_schema_public.sql` (SHA256 `d7d0eef3…b73536d`).
4. Inventoried every object in the dump against every object defined in committed migrations.

## Findings summary

| Category | In live prod | In committed migrations | Drift |
|---|---:|---:|---|
| Tables (public schema) | 20 | 6 | **14 tables undocumented in git** |
| Enum types | 14 | 0 | **14 enum types undocumented in git** |
| Functions | 13 | 7 | **6 functions undocumented in git** |
| Triggers | 14 | 9 | **5 triggers undocumented in git** |
| Indexes | 27 | 0 | **27 indexes undocumented in git** |
| RLS policies | 26 | 18 | **8 policies undocumented in git** |
| `platform_config` | ❌ does not exist | ✅ 2 migrations in git | **reverse drift — never applied** |

**Root cause**: no supabase_migrations.schema_migrations tracking table in
prod. All prod schema changes have been run manually in the Supabase SQL
editor, and only a subset were later mirrored into git via `add_*.sql` files.
The result is a git repo that is neither complete nor accurate against prod.

## Notable uncommitted objects (risk-ranked)

### High — security-relevant

| Object | Type | Table | Notes |
|---|---|---|---|
| `consultations_select_patient_or_doctor` | RLS policy | consultations | Authoritative scope of who can read a consultation. |
| `consultations_update_doctor` | RLS policy | consultations | Authoritative scope of who can mutate a consultation. |
| `documents_select_shared_clinical` | RLS policy | documents | Gates access to clinical attachments. |
| `messages_insert_doctor` / `messages_select_shared_clinical` | RLS policies | messages | Gates message read/write. |
| `prescriptions_select_shared_clinical` | RLS policy | prescriptions | Gates prescription read. |
| `partner_doctors_select_authenticated` | RLS policy | partner_doctors | Grants all authenticated users SELECT on every GP's row. Unchanged — see caveat below. |
| `check_controlled_drug()` | Function + trigger | prescriptions | Blocks controlled-drug insert — clinical safety. |
| `clinical_record_immutable()` | Function + many triggers | multiple | Blocks UPDATE/DELETE on clinical records. |
| `gp_auth_user_treated_patient()` | SECURITY DEFINER function | — | Used by RLS to avoid recursion. Security-definer surface. |

### Medium — data model

- Tables: `consultations`, `prescriptions`, `documents`, `messages`, `patients`, `patient_files`, `patient_consents`, `triage_sessions`, `call_logs`, `notifications`, `notification_delivery_log`, `partner_doctors`, `admin_users`, `audit_logs`, `audit_log` (legacy), `sar_requests`, `subscriptions`, `companies`, `company_employees`, `doctor_notification_preferences`.
- All 14 enum types (consultation_status, service_type, payment_status, etc.).
- `notify-patient-on-status-change` webhook trigger (project-URL-specific).

### Low — housekeeping

- 27 btree indexes on foreign keys and common filter columns.
- `rls_auto_enable` event trigger.
- `set_updated_at()` / `update_updated_at_column()` helpers.

## Caveats explicitly accepted by owner

- **`partner_doctors_select_authenticated`**: `FOR SELECT TO authenticated USING (true)`. Grants every signed-in user access to every GP row. Retained as-is in baseline; needs follow-up review to narrow to doctor-directory columns only.
- **`audit_log` (legacy, singular)**: kept in baseline for fidelity to prod, then dropped in `0002_retire_audit_log_legacy_table.sql` behind a row-count guard.

## Actions taken in this session

- [x] Added `supabase/migrations/0000_baseline_2026-04-21_live_schema.sql` — full schema snapshot.
- [x] Added `supabase/migrations/0001_backfill_database_webhook_notify_patient.sql` — per-env webhook trigger.
- [x] Added `supabase/migrations/0002_retire_audit_log_legacy_table.sql` — retire legacy audit_log.
- [x] Deleted `supabase/migrations/add_platform_config.sql` — never applied to prod.
- [x] Deleted `supabase/migrations/platform_config_harden_comment.sql` — never applied to prod.
- [x] Committed schema snapshot at `docs/audit/schema-snapshots/2026-04-21_live_schema_public.sql`.

## Actions for the human operator

1. **Mark baseline as applied on prod** (does not touch the schema):
   ```bash
   supabase link --project-ref xxnffdscpeksuvcdmffz
   supabase migration repair --status applied 0000_baseline_2026-04-21_live_schema
   ```
   Also repair all existing `add_*.sql` / `*_rls*.sql` files to `applied` so the CLI doesn't try to run them against prod.

2. **Recreate the `notify-patient` webhook per environment** — either via the Supabase dashboard Database Webhooks UI (recommended) or by uncommenting the block in `0001_backfill_*.sql` with the correct project ref for each environment.

3. **Apply the audit_log retirement on prod**:
   ```bash
   supabase migration up  # runs 0002 only, guarded by row-count check
   ```

4. **Narrow `partner_doctors_select_authenticated`** in a follow-up migration to expose only the directory columns (name, photo, IMC number) and not the full row.

5. **Stand up drift detection** — CI job that runs weekly:
   - `pg_dump --schema-only --schema=public` of prod
   - Diff against the committed snapshot, fail the job on any diff
   - Attach report to alerts channel

## Files under `docs/audit/schema-snapshots/`

- `2026-04-21_live_schema.sql` — full dump (all schemas).
- `2026-04-21_live_schema_public.sql` — public-only dump used for this reconciliation.
- `*.sha256` — integrity hashes for both dumps.
- Neither file contains row data. Re-verified via `grep '^COPY '` returning zero matches.
