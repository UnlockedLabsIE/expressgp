-- ─────────────────────────────────────────────────────────────────────────────
-- GDPR & Regulatory Compliance Fixes
-- Run once against the production database via the Supabase SQL editor.
--
-- What this migration adds / fixes:
--   1. anonymised_at column on patients
--   2. Updated anonymise_patient() — drops old 2-param overload, creates new
--      3-param version that sets anonymised_at and accepts admin actor
--   3. audit_logs INSERT policy for partner_doctors (ISO 27001 view logging)
--   4. sar_requests table (GDPR Subject Access Requests)
--   5. stripe_refund_required column on consultations (Consumer Rights Act 2022)
--   6. controlled_drug_check trigger on prescriptions (IMC Rule 10)
--   7. PCI DSS compliance comment on stripe_payment_id
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ADD anonymised_at COLUMN TO patients
-- ═══════════════════════════════════════════════════════════════════════════

alter table patients
  add column if not exists anonymised_at timestamptz;

comment on column patients.anonymised_at is
  'Set by anonymise_patient() when a GDPR Art.17 erasure request is fulfilled. '
  'Non-null indicates all PII has been removed while clinical records are retained.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. UPDATE anonymise_patient() FUNCTION
--    Drop the old 2-param signature first so there is only one unambiguous
--    overload, then create the new 3-param version.
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop ALL overloads of anonymise_patient dynamically, regardless of signature.
-- This handles any combination of 2-param or 3-param versions left in the database.
do $$
declare
  r record;
begin
  for r in
    select pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'anonymise_patient'
  loop
    execute 'drop function public.anonymise_patient(' || r.args || ')';
  end loop;
end $$;

create or replace function anonymise_patient(
  p_patient_id           uuid,
  p_reason               text    default 'GDPR Art.17 erasure request',
  p_requesting_admin_id  uuid    default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_exists  boolean;
  v_already boolean;
  v_summary jsonb;
begin
  select exists (
    select 1 from patients where id = p_patient_id
  ) into v_exists;

  if not v_exists then
    raise exception 'Patient % not found.', p_patient_id;
  end if;

  select (email is null) into v_already
  from patients where id = p_patient_id;

  if v_already then
    raise exception 'Patient % has already been anonymised.', p_patient_id;
  end if;

  update patients set
    first_name        = '[Anonymised]',
    last_name         = '[Anonymised]',
    email             = null,
    phone             = null,
    address           = null,
    marketing_consent = false,
    anonymised_at     = now()
  where id = p_patient_id;

  insert into audit_logs (
    actor_id,
    actor_type,
    action,
    table_name,
    record_id,
    new_value
  ) values (
    p_requesting_admin_id,
    case when p_requesting_admin_id is not null then 'admin' else 'system' end,
    'gdpr_anonymisation',
    'patients',
    p_patient_id,
    jsonb_build_object(
      'reason',                     p_reason,
      'anonymised_at',              now(),
      'requesting_admin_id',        p_requesting_admin_id,
      'fields_nulled',              array['first_name','last_name','email','phone','address','marketing_consent'],
      'fields_retained',            array['id','dob','gender','created_at','anonymised_at'],
      'clinical_records_preserved', true,
      'legal_basis',                'GDPR Art.17(3)(b) — Irish medical record retention obligation (8 years)'
    )
  );

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

revoke execute on function anonymise_patient(uuid, text, uuid) from public;
revoke execute on function anonymise_patient(uuid, text, uuid) from authenticated;
revoke execute on function anonymise_patient(uuid, text, uuid) from anon;

comment on function anonymise_patient(uuid, text, uuid) is
  'GDPR Art.17 compliant patient anonymisation. '
  'Nulls PII fields and sets anonymised_at while preserving clinical records. '
  'Must be called via service role only. All invocations are recorded in audit_logs.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. audit_logs INSERT POLICY FOR partner_doctors
--    Allows GPs to write ISO 27001 clinical-data view log entries from the
--    browser client, provided they use their own actor_id.
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  if not exists (
    select from pg_policies
    where tablename = 'audit_logs'
      and policyname = 'GP can insert own audit log entries'
  ) then
    create policy "GP can insert own audit log entries"
      on audit_logs for insert
      with check (
        auth.uid() is not null
        and actor_id = auth.uid()
        and actor_type = 'partner_doctor'
      );
  end if;
end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. sar_requests TABLE
--    Tracks GDPR Subject Access Requests, erasure requests, and other data
--    subject rights requests. GDPR Art.12 requires response within 30 days.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists sar_requests (
  id              uuid        primary key default gen_random_uuid(),
  patient_id      uuid        references patients(id) on delete set null,
  patient_email   text        not null,
  patient_name    text        not null,
  request_type    text        not null
                              check (request_type in (
                                'access', 'erasure', 'rectification',
                                'portability', 'restriction', 'objection'
                              )),
  status          text        not null default 'pending'
                              check (status in ('pending', 'in_progress', 'completed', 'rejected')),
  notes           text,
  received_at     timestamptz not null default now(),
  deadline_at     timestamptz not null default (now() + interval '30 days'),
  completed_at    timestamptz,
  assigned_to     uuid        references admin_users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table sar_requests enable row level security;

do $$ begin
  if not exists (
    select from pg_policies
    where tablename = 'sar_requests' and policyname = 'Admin full access to sar_requests'
  ) then
    create policy "Admin full access to sar_requests"
      on sar_requests for all
      using (
        exists (
          select 1 from admin_users
          where id = auth.uid() and is_active = true
        )
      );
  end if;
end $$;

comment on table sar_requests is
  'GDPR Subject Access Request register. '
  'GDPR Art.12 mandates response within 30 days (extendable by 2 months for complex requests). '
  'Each request must be logged and completed_at recorded.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. stripe_refund_required COLUMN ON consultations
--    Set to true by the decline API route. Consumer Rights Act 2022 requires
--    automatic refund when a service cannot be delivered.
-- ═══════════════════════════════════════════════════════════════════════════

alter table consultations
  add column if not exists stripe_refund_required boolean not null default false;

alter table consultations
  add column if not exists stripe_refund_issued_at timestamptz;

comment on column consultations.stripe_refund_required is
  'Set true when a GP declines a paid consultation. '
  'Triggers automatic Stripe refund per Consumer Rights Act 2022.';

comment on column consultations.stripe_refund_issued_at is
  'Timestamp of successful Stripe refund. Null if refund not yet processed.';

-- PCI DSS compliance: no card data is stored in this database.
-- Only Stripe payment IDs are retained for refund and reconciliation purposes.
comment on column consultations.stripe_payment_id is
  'Stripe PaymentIntent ID only — no card numbers, CVV, or full PANs are stored. '
  'PCI DSS SAQ-A compliant: card data never touches our servers.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. CONTROLLED DRUG BLOCK TRIGGER (IMC Rule 10)
--    Prevents issuing prescriptions for controlled or high-risk drugs
--    via a remote-only consultation. IMC guidelines require in-person
--    assessment for Schedule 1–4 controlled substances.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function check_controlled_drug()
returns trigger
language plpgsql
as $$
declare
  controlled_drugs text[] := array[
    'morphine', 'oxycodone', 'codeine', 'tramadol', 'fentanyl',
    'hydrocodone', 'methadone', 'buprenorphine', 'heroin', 'pethidine',
    'diazepam', 'alprazolam', 'lorazepam', 'clonazepam', 'temazepam',
    'nitrazepam', 'flunitrazepam', 'midazolam', 'oxazepam',
    'zolpidem', 'zopiclone', 'zaleplon',
    'methylphenidate', 'dexamphetamine', 'amphetamine', 'lisdexamfetamine',
    'ketamine', 'cocaine', 'cannabis', 'nabilone',
    'gabapentin', 'pregabalin'
  ];
  drug_lower text;
  matched    text;
  i          int;
begin
  drug_lower := lower(coalesce(NEW.medication, ''));

  for i in 1..array_length(controlled_drugs, 1) loop
    if drug_lower like '%' || controlled_drugs[i] || '%' then
      matched := controlled_drugs[i];
      raise exception
        'Controlled drug "%" cannot be prescribed via a remote-only consultation. '
        'IMC guidelines require in-person assessment for controlled substances (matched: %). '
        'Please refer the patient to their local GP or an in-person service.',
        NEW.medication, matched
        using errcode = 'P0001';
    end if;
  end loop;

  return NEW;
end;
$$;

drop trigger if exists controlled_drug_check on prescriptions;
create trigger controlled_drug_check
  before insert on prescriptions
  for each row execute function check_controlled_drug();

comment on function check_controlled_drug is
  'IMC Rule 10 compliance: blocks remote prescribing of controlled drugs. '
  'Applies to Schedule 1-4 controlled substances under the Misuse of Drugs Act 1977. '
  'In-person assessment required for all substances in the blocked list.';
