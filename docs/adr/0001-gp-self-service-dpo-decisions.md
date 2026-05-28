# ADR 0001: GP self-service, IMC governance, audit scope, offline messaging

## Status

Accepted — engineering record for DPO / clinical lead sign-off. Not legal advice.

## Context

Partner GPs update profile, availability, and prescription defaults in-app. Administration retains control of identity, IMC registration, employment type, and account suspension. GPs need an accountability trail for their own changes and clinical views. Patients need consistent messaging when GPs mark themselves offline for new cases.

## Decisions

1. **Legal name, IMC, employment / account status** — Only `service_role` (admin APIs) may change `first_name`, `last_name`, `imc_number`, `email`, `employment_type`, and `is_active`. Enforced in PostgreSQL by `partner_doctors_enforce_field_limits` (`gp_self_update_partner_doctors.sql` and `partner_doctors_lock_name_admin_only.sql` for existing DBs). GPs cannot self-edit these fields in Settings; profile photo remains optional self-service.

2. **Audit log (v1)** — `/dashboard/audit-log` lists `audit_logs` where `actor_id = auth.uid()` and `actor_type = partner_doctor` (own actions only). Wider scope (e.g. all clinical access across the practice) requires DPO review and separate product decision.

3. **Patient-facing copy when `is_accepting_cases` is false** — GP dashboard, consultations, and messages surfaces show that the GP is offline for **new** cases and that patients are advised of **next working day** response; assigned cases can still be completed. **Settings** describes the same patient-facing sentence. Any **separate patient booking app** must be checked so UI/API copy matches; that codebase is outside this repository unless linked here later.

4. **Admin visibility** — Admin GP list and dashboard stats use `is_accepting_cases` for “active / accepting” presentation. Queue behaviour for **pending** cases remains the shared pool; offline GPs do not receive new auto-assignments beyond product rules already in the backend.

5. **Shared in-platform clinical record** — Database RLS: `shared_clinical_record_rls.sql`. Application: consultation screen loads prescriptions and documents for **all** consultations of the same `patient_id` the current user may see under RLS, plus links to other consultations for that patient. **Privacy notice + DPIA** remain product/legal tasks before public claims.

## Consequences

- DPO should confirm (1)–(4) in writing for the live operator.
- Engineering changes that broaden audit visibility or relax IMC triggers need a new ADR or amendment.
