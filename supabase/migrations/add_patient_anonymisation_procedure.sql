-- GDPR Article 17 — Right to Erasure (Patient Anonymisation Procedure)
--
-- Hard deletion of patient records is permanently blocked (enforce_patient_no_delete trigger).
-- This procedure is the compliant alternative for erasure requests.
--
-- What it does:
--   - Nulls out all personally identifiable information (PII) on the patient row
--   - Preserves the patient ID and all linked clinical records (consultations,
--     prescriptions, documents, messages) — required by Irish medical record law
--   - Records the anonymisation event in audit_logs with a timestamp and reason
--   - Returns a confirmation summary
--
-- What it does NOT touch:
--   - Consultations, prescriptions, documents, messages — these are clinical records
--     and must be retained. They will reference the now-anonymised patient ID.
--   - The patient row itself is kept — only PII fields are nulled.
--
-- Legal basis:
--   GDPR Art.17(3)(b): right to erasure does not apply where processing is
--   necessary for compliance with a legal obligation (Irish medical record
--   retention, Medical Council of Ireland, 8 years minimum).
--   Anonymisation satisfies the spirit of erasure while meeting the legal
--   obligation to retain clinical records.
--
-- Usage (service role only — never expose to GP client):
--   select anonymise_patient(
--     '<patient-uuid>',
--     'Patient submitted written erasure request on 2026-04-11. '
--     'Retention obligation confirmed. PII anonymised per GDPR Art.17(3)(b).'
--   );

create or replace function anonymise_patient(
  p_patient_id  uuid,
  p_reason      text default 'GDPR Art.17 erasure request'
)
returns jsonb
language plpgsql
security definer  -- runs with owner privileges to bypass RLS
as $$
declare
  v_exists      boolean;
  v_already     boolean;
  v_summary     jsonb;
begin
  -- Confirm patient exists
  select exists (
    select 1 from patients where id = p_patient_id
  ) into v_exists;

  if not v_exists then
    raise exception 'Patient % not found.', p_patient_id;
  end if;

  -- Check if already anonymised (email will be nulled)
  select (email is null) into v_already
  from patients where id = p_patient_id;

  if v_already then
    raise exception 'Patient % has already been anonymised.', p_patient_id;
  end if;

  -- ── Anonymise PII fields ────────────────────────────────────────────────
  -- Clinical fields (dob, gender) are retained — they are part of the
  -- medical record and required for clinical context.
  -- Contact and identity fields are nulled.

  update patients set
    first_name        = '[Anonymised]',
    last_name         = '[Anonymised]',
    email             = null,
    phone             = null,
    address           = null,
    marketing_consent = false
  where id = p_patient_id;

  -- ── Audit log entry ─────────────────────────────────────────────────────
  insert into audit_logs (
    actor_id,
    actor_type,
    action,
    table_name,
    record_id,
    new_value
  ) values (
    null,  -- service role action, no individual actor
    'system',
    'gdpr_anonymisation',
    'patients',
    p_patient_id,
    jsonb_build_object(
      'reason',     p_reason,
      'anonymised_at', now(),
      'fields_nulled', array['first_name','last_name','email','phone','address','marketing_consent'],
      'fields_retained', array['id','dob','gender','created_at'],
      'clinical_records_preserved', true,
      'legal_basis', 'GDPR Art.17(3)(b) — Irish medical record retention obligation'
    )
  );

  -- ── Return confirmation ─────────────────────────────────────────────────
  v_summary := jsonb_build_object(
    'patient_id',            p_patient_id,
    'status',                'anonymised',
    'anonymised_at',         now(),
    'pii_nulled',            true,
    'clinical_records_kept', true,
    'audit_logged',          true,
    'reason',                p_reason
  );

  return v_summary;
end;
$$;

-- Revoke from all authenticated users — this must only be called
-- from server-side code using the service role key.
revoke execute on function anonymise_patient(uuid, text) from public;
revoke execute on function anonymise_patient(uuid, text) from authenticated;
revoke execute on function anonymise_patient(uuid, text) from anon;

comment on function anonymise_patient is
  'GDPR Art.17 compliant patient anonymisation. '
  'Nulls PII fields while preserving clinical record structure. '
  'Must be called via service role only. Never expose to client. '
  'All invocations are recorded in audit_logs.';
