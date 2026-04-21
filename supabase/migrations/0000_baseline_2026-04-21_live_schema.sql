-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE MIGRATION — snapshot of live production public schema
-- ─────────────────────────────────────────────────────────────────────────────
-- Generated:  2026-04-21 (UTC)
-- Source:     docs/audit/schema-snapshots/2026-04-21_live_schema_public.sql
-- Method:     pg_dump --schema-only --schema=public --no-owner --no-privileges
-- SHA256:     d7d0eef3e419e31ae567cf127e3023eb435d22d3d911b947bd85aa8d1b73536d
--
-- WHY THIS EXISTS
--   Live prod (ref: xxnffdscpeksuvcdmffz) has roughly 20 tables, 8 RLS
--   policies, 2 triggers, 27 indexes, and 14 enum types that were created
--   directly in the Supabase dashboard / SQL editor and never committed
--   to git. This file captures that live state so the repo finally reflects
--   reality and fresh dev/staging projects can be bootstrapped.
--
-- BEHAVIOUR
--   • Fresh project (no public.patients yet):  runs cleanly, bootstraps schema.
--   • Existing prod (objects already exist):   will FAIL if re-run. Mark as
--     applied without running it:
--         supabase migration repair --status applied \
--             0000_baseline_2026-04-21_live_schema
--     Prod has no supabase_migrations.schema_migrations table today — migrations
--     have been applied manually in the SQL editor. The repair command creates
--     the tracking entry without touching the schema.
--
-- WHAT'S EXCLUDED FROM THIS BASELINE
--   • notify-patient-on-status-change trigger on public.consultations — URL
--     is project-specific, moved to 0001_backfill_database_webhook_notify_patient.sql.
--   • Legacy public.audit_log table is preserved here (faithful to prod) then
--     dropped in 0002_retire_audit_log_legacy_table.sql.
--
-- WHAT COMES AFTER
--   All existing add_*.sql and *_rls.sql files in this directory describe
--   changes made BEFORE this snapshot was taken. They are left in place as
--   historical documentation. New changes from 2026-04-21 onward should be
--   added as new timestamped migrations (e.g. YYYYMMDDHHMM_name.sql).
-- ─────────────────────────────────────────────────────────────────────────────

--
-- PostgreSQL database dump
--

\restrict JHiRjHSWKo6tIevDmo1hdHgIYcYweOjKeg05JmZcWyX8JeZRW6XtqXlcg5lIwON

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: audit_actor_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_actor_type AS ENUM (
    'patient',
    'partner_doctor',
    'system',
    'admin'
);


--
-- Name: call_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.call_direction AS ENUM (
    'inbound',
    'outbound'
);


--
-- Name: consultation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consultation_status AS ENUM (
    'pending',
    'under_review',
    'more_info_required',
    'approved',
    'declined',
    'cancelled'
);


--
-- Name: document_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_type AS ENUM (
    'sick_note',
    'referral_letter',
    'medical_cert',
    'insurance_report',
    'fit_to_fly',
    'fit_to_work',
    'other'
);


--
-- Name: employment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employment_type AS ENUM (
    'employed',
    'contracted'
);


--
-- Name: message_sender_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.message_sender_type AS ENUM (
    'patient',
    'partner_doctor',
    'system'
);


--
-- Name: notification_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_channel AS ENUM (
    'email',
    'sms',
    'push'
);


--
-- Name: notification_delivery_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_delivery_status AS ENUM (
    'sent',
    'failed',
    'pending'
);


--
-- Name: notification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_status AS ENUM (
    'sent',
    'failed',
    'pending'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'unpaid',
    'paid',
    'refunded'
);


--
-- Name: service_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_type AS ENUM (
    'prescription',
    'sick_note',
    'referral',
    'medical_cert',
    'gp_consultation',
    'glp1',
    'insurance_report',
    'corporate'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'active',
    'cancelled',
    'past_due'
);


--
-- Name: triage_agent; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.triage_agent AS ENUM (
    'cara',
    'aidan'
);


--
-- Name: triage_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.triage_channel AS ENUM (
    'web',
    'phone'
);


--
-- Name: anonymise_patient(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.anonymise_patient(p_patient_id uuid, p_reason text DEFAULT 'GDPR Art.17 erasure request'::text, p_requesting_admin_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
    actor_id, actor_type, action, table_name, record_id, new_value
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


--
-- Name: FUNCTION anonymise_patient(p_patient_id uuid, p_reason text, p_requesting_admin_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.anonymise_patient(p_patient_id uuid, p_reason text, p_requesting_admin_id uuid) IS 'GDPR Art.17 compliant patient anonymisation. Nulls PII fields and sets anonymised_at while preserving clinical records. Must be called via service role only. All invocations are recorded in audit_logs.';


--
-- Name: check_controlled_drug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_controlled_drug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: clinical_record_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clinical_record_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception
    'Table "%" contains permanent clinical records. % operations are prohibited. '
    'Retention period: 8 years (Medical Council of Ireland). Record ID: %',
    TG_TABLE_NAME, TG_OP, OLD.id;
end;
$$;


--
-- Name: consultation_no_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consultation_no_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception
    'Consultations are permanent clinical records and cannot be deleted. '
    'Retention period: 8 years (Medical Council of Ireland). Consultation ID: %', OLD.id;
end;
$$;


--
-- Name: documents_immutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.documents_immutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception
    'Documents are permanent clinical records and cannot be % under any circumstances. '
    'Retention period: 8 years (Medical Council of Ireland). '
    'Document ID: %', TG_OP, OLD.id;
end;
$$;


--
-- Name: gp_auth_user_treated_patient(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.gp_auth_user_treated_patient(p_patient_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.consultations x
    where x.patient_id = p_patient_id
      and x.partner_doctor_id = (select auth.uid())
  );
$$;


--
-- Name: FUNCTION gp_auth_user_treated_patient(p_patient_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.gp_auth_user_treated_patient(p_patient_id uuid) IS 'True if the current auth user has ever been assigned partner_doctor on any consultation for this patient_id. Used by RLS to avoid recursive policy on consultations.';


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(uid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select exists (
    select 1 from admin_users
    where id = uid and is_active = true
  );
$$;


--
-- Name: partner_doctors_enforce_field_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.partner_doctors_enforce_field_limits() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  jwt_role text;
begin
  jwt_role := coalesce((select auth.jwt())->>'role', '');
  if jwt_role = 'service_role' then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Cannot change partner_doctors.id';
  end if;
  if new.first_name is distinct from old.first_name then
    raise exception 'Legal name can only be changed by administration';
  end if;
  if new.last_name is distinct from old.last_name then
    raise exception 'Legal name can only be changed by administration';
  end if;
  if new.imc_number is distinct from old.imc_number then
    raise exception 'IMC number can only be changed by administration';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Email can only be changed by administration';
  end if;
  if new.employment_type is distinct from old.employment_type then
    raise exception 'Employment type can only be changed by administration';
  end if;
  if new.is_active is distinct from old.is_active then
    raise exception 'Account status can only be changed by administration';
  end if;

  return new;
end;
$$;


--
-- Name: FUNCTION partner_doctors_enforce_field_limits(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.partner_doctors_enforce_field_limits() IS 'Blocks GP self-service updates to first_name, last_name, imc_number, email, employment_type, is_active, and id unless request uses service_role (admin APIs).';


--
-- Name: patient_consents_reject_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.patient_consents_reject_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'patient_consents is append-only: updates and deletes are not permitted';
end;
$$;


--
-- Name: patient_no_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.patient_no_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception
    'Patient records cannot be hard-deleted. '
    'GDPR Art.17(3)(b): right to erasure does not apply where retention is required by law. '
    'For erasure requests, use the field-level anonymisation procedure. Patient ID: %', OLD.id;
end;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin new.updated_at = now(); return new; end; $$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_type public.audit_actor_type NOT NULL,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_value jsonb,
    new_value jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_type text NOT NULL,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_value jsonb,
    new_value jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_logs_actor_type_check CHECK ((actor_type = ANY (ARRAY['patient'::text, 'partner_doctor'::text, 'system'::text, 'admin'::text])))
);


--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    triage_session_id uuid,
    direction public.call_direction NOT NULL,
    vapi_call_id text,
    transcript text,
    duration_seconds integer,
    outcome text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_name text,
    contact_email text,
    stripe_customer_id text,
    stripe_subscription_id text,
    subscription_status public.subscription_status,
    employee_limit integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: consultations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    partner_doctor_id uuid,
    triage_session_id uuid,
    service_type public.service_type NOT NULL,
    service_subtype text,
    status public.consultation_status DEFAULT 'pending'::public.consultation_status NOT NULL,
    symptoms text,
    patient_notes text,
    doctor_notes text,
    decline_reason text,
    video_call_requested boolean DEFAULT false NOT NULL,
    video_call_url text,
    video_call_scheduled_at timestamp with time zone,
    payment_status public.payment_status DEFAULT 'unpaid'::public.payment_status NOT NULL,
    stripe_payment_id text,
    stripe_subscription_id text,
    amount_charged integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stripe_refund_required boolean DEFAULT false NOT NULL,
    stripe_refund_issued_at timestamp with time zone
);


--
-- Name: COLUMN consultations.stripe_payment_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.consultations.stripe_payment_id IS 'Stripe PaymentIntent ID only — no card numbers, CVV, or full PANs are stored. PCI DSS SAQ-A compliant: card data never touches our servers.';


--
-- Name: doctor_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    email_new_consultation boolean DEFAULT true NOT NULL,
    email_new_message boolean DEFAULT true NOT NULL,
    email_red_flag boolean DEFAULT true NOT NULL,
    sms_new_consultation boolean DEFAULT true NOT NULL,
    sms_red_flag boolean DEFAULT true NOT NULL,
    daily_summary_email boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    consultation_id uuid NOT NULL,
    type public.document_type NOT NULL,
    content text NOT NULL,
    issued_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    consultation_id uuid NOT NULL,
    sender_id uuid,
    sender_type public.message_sender_type NOT NULL,
    body text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_delivery_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_delivery_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    notification_type text NOT NULL,
    channel text NOT NULL,
    triggered_at timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone,
    status public.notification_delivery_status DEFAULT 'pending'::public.notification_delivery_status NOT NULL,
    consultation_id uuid,
    error_message text,
    CONSTRAINT notification_delivery_log_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text])))
);


--
-- Name: TABLE notification_delivery_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_delivery_log IS 'Audit trail for each outbound notification attempt to a partner GP (clinical governance).';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    consultation_id uuid,
    channel public.notification_channel NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    sent_at timestamp with time zone,
    status public.notification_status DEFAULT 'pending'::public.notification_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: partner_doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    imc_number text NOT NULL,
    employment_type public.employment_type NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_accepting_cases boolean DEFAULT true NOT NULL,
    out_of_office_until timestamp with time zone,
    default_pharmacy_name text,
    default_pharmacy_address text,
    profile_photo_url text,
    display_timezone text DEFAULT 'Europe/Dublin'::text
);


--
-- Name: patient_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    consent_version text NOT NULL,
    consented_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    consent_text text NOT NULL
);


--
-- Name: TABLE patient_consents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.patient_consents IS 'Immutable snapshot of consent wording and version at time of acceptance. No updates or deletes via normal roles.';


--
-- Name: patient_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    consultation_id uuid,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    dob date,
    phone text,
    address text,
    gender text,
    marketing_consent boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    anonymised_at timestamp with time zone
);


--
-- Name: COLUMN patients.anonymised_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patients.anonymised_at IS 'Set by anonymise_patient() when a GDPR Art.17 erasure request is fulfilled. Non-null indicates all PII has been removed while clinical records are retained.';


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    consultation_id uuid NOT NULL,
    medication text NOT NULL,
    dosage text,
    frequency text,
    duration text,
    pharmacy_name text,
    pharmacy_address text,
    healthmail_reference text,
    issued_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sar_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sar_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    patient_email text NOT NULL,
    patient_name text NOT NULL,
    request_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    deadline_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    completed_at timestamp with time zone,
    assigned_to uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sar_requests_request_type_check CHECK ((request_type = ANY (ARRAY['access'::text, 'erasure'::text, 'rectification'::text, 'portability'::text, 'restriction'::text, 'objection'::text]))),
    CONSTRAINT sar_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'rejected'::text])))
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    plan_name text NOT NULL,
    stripe_subscription_id text,
    status text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: triage_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.triage_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    channel public.triage_channel NOT NULL,
    agent public.triage_agent NOT NULL,
    transcript text,
    structured_summary jsonb,
    ai_recommendation text,
    ai_confidence_score numeric,
    red_flag_triggered boolean DEFAULT false NOT NULL,
    call_recording_url text,
    call_sid text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT triage_confidence_score_range CHECK (((ai_confidence_score IS NULL) OR ((ai_confidence_score >= (0)::numeric) AND (ai_confidence_score <= (1)::numeric))))
);


--



--



--



--



--



--



--



--



--



--



--



--



--



--



--



--



--



--



--



--



--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_employees company_employees_company_id_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_employees
    ADD CONSTRAINT company_employees_company_id_patient_id_key UNIQUE (company_id, patient_id);


--
-- Name: company_employees company_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_employees
    ADD CONSTRAINT company_employees_pkey PRIMARY KEY (id);


--
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);


--
-- Name: doctor_notification_preferences doctor_notification_preferences_doctor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_notification_preferences
    ADD CONSTRAINT doctor_notification_preferences_doctor_id_key UNIQUE (doctor_id);


--
-- Name: doctor_notification_preferences doctor_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_notification_preferences
    ADD CONSTRAINT doctor_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notification_delivery_log notification_delivery_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_delivery_log
    ADD CONSTRAINT notification_delivery_log_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: partner_doctors partner_doctors_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_doctors
    ADD CONSTRAINT partner_doctors_email_key UNIQUE (email);


--
-- Name: partner_doctors partner_doctors_imc_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_doctors
    ADD CONSTRAINT partner_doctors_imc_number_key UNIQUE (imc_number);


--
-- Name: partner_doctors partner_doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_doctors
    ADD CONSTRAINT partner_doctors_pkey PRIMARY KEY (id);


--
-- Name: patient_consents patient_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_consents
    ADD CONSTRAINT patient_consents_pkey PRIMARY KEY (id);


--
-- Name: patient_files patient_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_files
    ADD CONSTRAINT patient_files_pkey PRIMARY KEY (id);


--
-- Name: patients patients_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_email_key UNIQUE (email);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: sar_requests sar_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sar_requests
    ADD CONSTRAINT sar_requests_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: triage_sessions triage_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.triage_sessions
    ADD CONSTRAINT triage_sessions_pkey PRIMARY KEY (id);


--
-- Name: audit_log_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_actor_idx ON public.audit_log USING btree (actor_type, actor_id);


--
-- Name: audit_log_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_created_at_idx ON public.audit_log USING btree (created_at);


--
-- Name: audit_log_table_record_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_table_record_idx ON public.audit_log USING btree (table_name, record_id);


--
-- Name: call_logs_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX call_logs_patient_id_idx ON public.call_logs USING btree (patient_id);


--
-- Name: call_logs_triage_session_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX call_logs_triage_session_id_idx ON public.call_logs USING btree (triage_session_id);


--
-- Name: company_employees_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_employees_company_id_idx ON public.company_employees USING btree (company_id);


--
-- Name: company_employees_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_employees_patient_id_idx ON public.company_employees USING btree (patient_id);


--
-- Name: consultations_partner_doctor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consultations_partner_doctor_id_idx ON public.consultations USING btree (partner_doctor_id);


--
-- Name: consultations_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consultations_patient_id_idx ON public.consultations USING btree (patient_id);


--
-- Name: consultations_service_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consultations_service_type_idx ON public.consultations USING btree (service_type);


--
-- Name: consultations_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consultations_status_idx ON public.consultations USING btree (status);


--
-- Name: consultations_triage_session_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consultations_triage_session_id_idx ON public.consultations USING btree (triage_session_id);


--
-- Name: documents_consultation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_consultation_id_idx ON public.documents USING btree (consultation_id);


--
-- Name: messages_consultation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_consultation_id_idx ON public.messages USING btree (consultation_id);


--
-- Name: messages_sender_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_sender_idx ON public.messages USING btree (sender_type, sender_id);


--
-- Name: notification_delivery_log_doctor_triggered_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_delivery_log_doctor_triggered_idx ON public.notification_delivery_log USING btree (doctor_id, triggered_at DESC);


--
-- Name: notification_delivery_log_red_flag_failures_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_delivery_log_red_flag_failures_idx ON public.notification_delivery_log USING btree (doctor_id, triggered_at DESC) WHERE ((notification_type = 'red_flag'::text) AND (status = 'failed'::public.notification_delivery_status));


--
-- Name: notifications_consultation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_consultation_id_idx ON public.notifications USING btree (consultation_id);


--
-- Name: notifications_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_patient_id_idx ON public.notifications USING btree (patient_id);


--
-- Name: patient_consents_patient_consented_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_consents_patient_consented_idx ON public.patient_consents USING btree (patient_id, consented_at DESC);


--
-- Name: patient_files_consultation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_files_consultation_id_idx ON public.patient_files USING btree (consultation_id);


--
-- Name: patient_files_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_files_patient_id_idx ON public.patient_files USING btree (patient_id);


--
-- Name: prescriptions_consultation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX prescriptions_consultation_id_idx ON public.prescriptions USING btree (consultation_id);


--
-- Name: subscriptions_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_patient_id_idx ON public.subscriptions USING btree (patient_id);


--
-- Name: triage_sessions_agent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX triage_sessions_agent_idx ON public.triage_sessions USING btree (agent);


--
-- Name: triage_sessions_channel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX triage_sessions_channel_idx ON public.triage_sessions USING btree (channel);


--
-- Name: triage_sessions_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX triage_sessions_patient_id_idx ON public.triage_sessions USING btree (patient_id);


--
-- Name: consultations consultations_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER consultations_set_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: prescriptions controlled_drug_check; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER controlled_drug_check BEFORE INSERT ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.check_controlled_drug();


--
-- Name: audit_logs enforce_audit_log_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_audit_log_immutability BEFORE DELETE OR UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.clinical_record_immutable();


--
-- Name: call_logs enforce_call_log_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_call_log_immutability BEFORE DELETE OR UPDATE ON public.call_logs FOR EACH ROW EXECUTE FUNCTION public.clinical_record_immutable();


--
-- Name: consultations enforce_consultation_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_consultation_no_delete BEFORE DELETE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.consultation_no_delete();


--
-- Name: documents enforce_document_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_document_immutability BEFORE DELETE OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.documents_immutable();


--
-- Name: messages enforce_message_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_message_no_delete BEFORE DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.clinical_record_immutable();


--
-- Name: patient_files enforce_patient_file_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_patient_file_immutability BEFORE DELETE OR UPDATE ON public.patient_files FOR EACH ROW EXECUTE FUNCTION public.clinical_record_immutable();


--
-- Name: patients enforce_patient_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_patient_no_delete BEFORE DELETE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.patient_no_delete();


--
-- Name: prescriptions enforce_prescription_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_prescription_immutability BEFORE DELETE OR UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.clinical_record_immutable();


--
-- Name: triage_sessions enforce_triage_session_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_triage_session_immutability BEFORE DELETE OR UPDATE ON public.triage_sessions FOR EACH ROW EXECUTE FUNCTION public.clinical_record_immutable();


--
-- Name: consultations notify-patient-on-status-change; Type: TRIGGER; Schema: public; Owner: -
--

-- [moved to 0001_backfill_database_webhook_notify_patient.sql]
-- CREATE TRIGGER "notify-patient-on-status-change" AFTER UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://xxnffdscpeksuvcdmffz.supabase.co/functions/v1/notify-patient', 'POST', '{"Content-type":"application/json"}', '{}', '5000');


--
-- Name: partner_doctors partner_doctors_enforce_field_limits_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER partner_doctors_enforce_field_limits_trigger BEFORE UPDATE ON public.partner_doctors FOR EACH ROW EXECUTE FUNCTION public.partner_doctors_enforce_field_limits();


--
-- Name: patient_consents patient_consents_reject_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER patient_consents_reject_delete BEFORE DELETE ON public.patient_consents FOR EACH ROW EXECUTE FUNCTION public.patient_consents_reject_mutation();


--
-- Name: patient_consents patient_consents_reject_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER patient_consents_reject_update BEFORE UPDATE ON public.patient_consents FOR EACH ROW EXECUTE FUNCTION public.patient_consents_reject_mutation();


--
-- Name: doctor_notification_preferences set_doctor_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_doctor_notification_preferences_updated_at BEFORE UPDATE ON public.doctor_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_users admin_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: call_logs call_logs_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: call_logs call_logs_triage_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_triage_session_id_fkey FOREIGN KEY (triage_session_id) REFERENCES public.triage_sessions(id) ON DELETE SET NULL;


--
-- Name: company_employees company_employees_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_employees
    ADD CONSTRAINT company_employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_employees company_employees_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_employees
    ADD CONSTRAINT company_employees_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: consultations consultations_partner_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_partner_doctor_id_fkey FOREIGN KEY (partner_doctor_id) REFERENCES public.partner_doctors(id) ON DELETE SET NULL;


--
-- Name: consultations consultations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: consultations consultations_triage_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_triage_session_id_fkey FOREIGN KEY (triage_session_id) REFERENCES public.triage_sessions(id) ON DELETE SET NULL;


--
-- Name: doctor_notification_preferences doctor_notification_preferences_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_notification_preferences
    ADD CONSTRAINT doctor_notification_preferences_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.partner_doctors(id) ON DELETE CASCADE;


--
-- Name: documents documents_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;


--
-- Name: messages messages_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;


--
-- Name: notification_delivery_log notification_delivery_log_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_delivery_log
    ADD CONSTRAINT notification_delivery_log_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE SET NULL;


--
-- Name: notification_delivery_log notification_delivery_log_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_delivery_log
    ADD CONSTRAINT notification_delivery_log_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.partner_doctors(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_consents patient_consents_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_consents
    ADD CONSTRAINT patient_consents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;


--
-- Name: patient_files patient_files_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_files
    ADD CONSTRAINT patient_files_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE SET NULL;


--
-- Name: patient_files patient_files_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_files
    ADD CONSTRAINT patient_files_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;


--
-- Name: sar_requests sar_requests_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sar_requests
    ADD CONSTRAINT sar_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: sar_requests sar_requests_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sar_requests
    ADD CONSTRAINT sar_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: triage_sessions triage_sessions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.triage_sessions
    ADD CONSTRAINT triage_sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: admin_users Admin can read own row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can read own row" ON public.admin_users FOR SELECT USING ((auth.uid() = id));


--
-- Name: sar_requests Admin full access to sar_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin full access to sar_requests" ON public.sar_requests USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.id = auth.uid()) AND (admin_users.is_active = true)))));


--
-- Name: doctor_notification_preferences Doctor can insert own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctor can insert own preferences" ON public.doctor_notification_preferences FOR INSERT WITH CHECK ((auth.uid() = doctor_id));


--
-- Name: doctor_notification_preferences Doctor can read own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctor can read own preferences" ON public.doctor_notification_preferences FOR SELECT USING ((auth.uid() = doctor_id));


--
-- Name: doctor_notification_preferences Doctor can update own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctor can update own preferences" ON public.doctor_notification_preferences FOR UPDATE USING ((auth.uid() = doctor_id));


--
-- Name: documents GP can insert documents on own consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "GP can insert documents on own consultations" ON public.documents FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.consultations c
  WHERE ((c.id = documents.consultation_id) AND (c.partner_doctor_id = auth.uid())))));


--
-- Name: messages GP can insert messages in own consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "GP can insert messages in own consultations" ON public.messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.consultations c
  WHERE ((c.id = messages.consultation_id) AND (c.partner_doctor_id = auth.uid())))));


--
-- Name: audit_logs GP can insert own audit log entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "GP can insert own audit log entries" ON public.audit_logs FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (actor_id = auth.uid()) AND (actor_type = 'partner_doctor'::text)));


--
-- Name: prescriptions GP can insert prescriptions on own consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "GP can insert prescriptions on own consultations" ON public.prescriptions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.consultations c
  WHERE ((c.id = prescriptions.consultation_id) AND (c.partner_doctor_id = auth.uid())))));


--
-- Name: notification_delivery_log GP can read own notification delivery log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "GP can read own notification delivery log" ON public.notification_delivery_log FOR SELECT TO authenticated USING ((doctor_id = auth.uid()));


--
-- Name: audit_logs GP can view own audit log entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "GP can view own audit log entries" ON public.audit_logs FOR SELECT USING ((actor_id = auth.uid()));


--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: call_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: company_employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;

--
-- Name: consultations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

--
-- Name: consultations consultations_select_patient_or_doctor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consultations_select_patient_or_doctor ON public.consultations FOR SELECT TO authenticated USING (((patient_id = auth.uid()) OR (partner_doctor_id = auth.uid()) OR ((status = 'pending'::public.consultation_status) AND (EXISTS ( SELECT 1
   FROM public.partner_doctors pd
  WHERE ((pd.id = auth.uid()) AND (pd.is_active = true))))) OR ((EXISTS ( SELECT 1
   FROM public.partner_doctors pd
  WHERE ((pd.id = auth.uid()) AND (pd.is_active = true)))) AND public.gp_auth_user_treated_patient(patient_id))));


--
-- Name: consultations consultations_update_doctor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consultations_update_doctor ON public.consultations FOR UPDATE TO authenticated USING (((partner_doctor_id = auth.uid()) OR ((partner_doctor_id IS NULL) AND (EXISTS ( SELECT 1
   FROM public.partner_doctors
  WHERE (partner_doctors.id = auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.partner_doctors
  WHERE (partner_doctors.id = auth.uid()))));


--
-- Name: doctor_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doctor_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: documents documents_select_shared_clinical; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_select_shared_clinical ON public.documents FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.consultations c
  WHERE ((c.id = documents.consultation_id) AND ((c.patient_id = auth.uid()) OR (c.partner_doctor_id = auth.uid()) OR ((c.status = 'pending'::public.consultation_status) AND (EXISTS ( SELECT 1
           FROM public.partner_doctors pd
          WHERE ((pd.id = auth.uid()) AND (pd.is_active = true))))) OR ((EXISTS ( SELECT 1
           FROM public.partner_doctors pd
          WHERE ((pd.id = auth.uid()) AND (pd.is_active = true)))) AND public.gp_auth_user_treated_patient(c.patient_id)))))));


--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: messages messages_insert_doctor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_insert_doctor ON public.messages FOR INSERT TO authenticated WITH CHECK (((sender_type = 'partner_doctor'::public.message_sender_type) AND (EXISTS ( SELECT 1
   FROM public.consultations
  WHERE ((consultations.id = messages.consultation_id) AND (consultations.partner_doctor_id = auth.uid()))))));


--
-- Name: messages messages_select_shared_clinical; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_select_shared_clinical ON public.messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.consultations c
  WHERE ((c.id = messages.consultation_id) AND ((c.patient_id = auth.uid()) OR (c.partner_doctor_id = auth.uid()) OR ((c.status = 'pending'::public.consultation_status) AND (EXISTS ( SELECT 1
           FROM public.partner_doctors pd
          WHERE ((pd.id = auth.uid()) AND (pd.is_active = true))))) OR ((EXISTS ( SELECT 1
           FROM public.partner_doctors pd
          WHERE ((pd.id = auth.uid()) AND (pd.is_active = true)))) AND public.gp_auth_user_treated_patient(c.patient_id)))))));


--
-- Name: notification_delivery_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_doctors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_doctors ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_doctors partner_doctors_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_doctors_select_authenticated ON public.partner_doctors FOR SELECT TO authenticated USING (true);


--
-- Name: partner_doctors partner_doctors_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partner_doctors_update_own ON public.partner_doctors FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: patient_consents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_consents patient_consents_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_consents_insert_own ON public.patient_consents FOR INSERT TO authenticated WITH CHECK ((patient_id = auth.uid()));


--
-- Name: patient_consents patient_consents_select_gp_assigned; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_consents_select_gp_assigned ON public.patient_consents FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.consultations c
  WHERE ((c.patient_id = patient_consents.patient_id) AND (c.partner_doctor_id = auth.uid())))));


--
-- Name: patient_consents patient_consents_select_gp_pending_queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_consents_select_gp_pending_queue ON public.patient_consents FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.consultations c
  WHERE ((c.patient_id = patient_consents.patient_id) AND (c.status = 'pending'::public.consultation_status) AND (EXISTS ( SELECT 1
           FROM public.partner_doctors pd
          WHERE ((pd.id = auth.uid()) AND (pd.is_active = true))))))));


--
-- Name: patient_consents patient_consents_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_consents_select_own ON public.patient_consents FOR SELECT TO authenticated USING ((patient_id = auth.uid()));


--
-- Name: patient_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;

--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: patients patients_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_insert_own ON public.patients FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: consultations patients_insert_own_consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_insert_own_consultations ON public.consultations FOR INSERT TO authenticated WITH CHECK ((patient_id = auth.uid()));


--
-- Name: patients patients_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_select_own ON public.patients FOR SELECT TO authenticated USING (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.consultations
  WHERE ((consultations.patient_id = patients.id) AND ((consultations.partner_doctor_id = auth.uid()) OR (consultations.status = 'pending'::public.consultation_status)))))));


--
-- Name: consultations patients_select_own_consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_select_own_consultations ON public.consultations FOR SELECT TO authenticated USING ((patient_id = auth.uid()));


--
-- Name: documents patients_select_own_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_select_own_documents ON public.documents FOR SELECT TO authenticated USING ((consultation_id IN ( SELECT consultations.id
   FROM public.consultations
  WHERE (consultations.patient_id = auth.uid()))));


--
-- Name: prescriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions prescriptions_select_shared_clinical; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prescriptions_select_shared_clinical ON public.prescriptions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.consultations c
  WHERE ((c.id = prescriptions.consultation_id) AND ((c.patient_id = auth.uid()) OR (c.partner_doctor_id = auth.uid()) OR ((c.status = 'pending'::public.consultation_status) AND (EXISTS ( SELECT 1
           FROM public.partner_doctors pd
          WHERE ((pd.id = auth.uid()) AND (pd.is_active = true))))) OR ((EXISTS ( SELECT 1
           FROM public.partner_doctors pd
          WHERE ((pd.id = auth.uid()) AND (pd.is_active = true)))) AND public.gp_auth_user_treated_patient(c.patient_id)))))));


--
-- Name: sar_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sar_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: triage_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.triage_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: triage_sessions triage_sessions_select_shared_clinical; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY triage_sessions_select_shared_clinical ON public.triage_sessions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.consultations c
  WHERE ((c.triage_session_id = triage_sessions.id) AND ((c.patient_id = auth.uid()) OR (c.partner_doctor_id = auth.uid()) OR ((c.status = 'pending'::public.consultation_status) AND (EXISTS ( SELECT 1
           FROM public.partner_doctors pd
          WHERE ((pd.id = auth.uid()) AND (pd.is_active = true))))) OR ((EXISTS ( SELECT 1
           FROM public.partner_doctors pd
          WHERE ((pd.id = auth.uid()) AND (pd.is_active = true)))) AND public.gp_auth_user_treated_patient(c.patient_id)))))));


--
-- PostgreSQL database dump complete
--

\unrestrict JHiRjHSWKo6tIevDmo1hdHgIYcYweOjKeg05JmZcWyX8JeZRW6XtqXlcg5lIwON

