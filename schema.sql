-- ExpressGP (Supabase/Postgres) core schema
-- Notes:
-- - Uses UUID primary keys and `gen_random_uuid()`
-- - Enables RLS on all tables (policies must be added separately)
-- - Indexes all foreign keys

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type employment_type as enum ('employed', 'contracted');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type subscription_status as enum ('active', 'cancelled', 'past_due');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type triage_channel as enum ('web', 'phone');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type triage_agent as enum ('cara', 'aidan');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type service_type as enum (
    'prescription',
    'sick_note',
    'referral',
    'medical_cert',
    'gp_consultation',
    'glp1',
    'insurance_report',
    'corporate'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type consultation_status as enum (
    'pending',
    'under_review',
    'more_info_required',
    'approved',
    'declined',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type payment_status as enum ('unpaid', 'paid', 'refunded');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type document_type as enum (
    'sick_note',
    'referral_letter',
    'medical_cert',
    'insurance_report',
    'fit_to_fly',
    'fit_to_work',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type message_sender_type as enum ('patient', 'partner_doctor', 'system');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type call_direction as enum ('inbound', 'outbound');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type notification_channel as enum ('email', 'sms', 'push');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type notification_status as enum ('sent', 'failed', 'pending');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type audit_actor_type as enum ('patient', 'partner_doctor', 'system', 'admin');
exception
  when duplicate_object then null;
end $$;

-- Tables
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  password_hash text not null,
  dob date,
  phone text,
  address text,
  gender text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists partner_doctors (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  imc_number text not null unique,
  employment_type employment_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status subscription_status,
  employee_limit integer,
  created_at timestamptz not null default now()
);

create table if not exists company_employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (company_id, patient_id)
);

create index if not exists company_employees_company_id_idx on company_employees(company_id);
create index if not exists company_employees_patient_id_idx on company_employees(patient_id);

create table if not exists triage_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  channel triage_channel not null,
  agent triage_agent not null,
  transcript text,
  structured_summary jsonb,
  ai_recommendation text,
  ai_confidence_score numeric,
  red_flag_triggered boolean not null default false,
  call_recording_url text,
  call_sid text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint triage_confidence_score_range check (
    ai_confidence_score is null or (ai_confidence_score >= 0 and ai_confidence_score <= 1)
  )
);

create index if not exists triage_sessions_patient_id_idx on triage_sessions(patient_id);
create index if not exists triage_sessions_channel_idx on triage_sessions(channel);
create index if not exists triage_sessions_agent_idx on triage_sessions(agent);

create table if not exists consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  partner_doctor_id uuid references partner_doctors(id) on delete set null,
  triage_session_id uuid references triage_sessions(id) on delete set null,
  service_type service_type not null,
  service_subtype text,
  status consultation_status not null default 'pending',
  symptoms text,
  patient_notes text,
  doctor_notes text,
  decline_reason text,
  video_call_requested boolean not null default false,
  video_call_url text,
  video_call_scheduled_at timestamptz,
  payment_status payment_status not null default 'unpaid',
  stripe_payment_id text,
  stripe_subscription_id text,
  amount_charged integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultations_patient_id_idx on consultations(patient_id);
create index if not exists consultations_partner_doctor_id_idx on consultations(partner_doctor_id);
create index if not exists consultations_triage_session_id_idx on consultations(triage_session_id);
create index if not exists consultations_status_idx on consultations(status);
create index if not exists consultations_service_type_idx on consultations(service_type);

create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  medication text not null,
  dosage text,
  frequency text,
  duration text,
  pharmacy_name text,
  pharmacy_address text,
  healthmail_reference text,
  issued_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists prescriptions_consultation_id_idx on prescriptions(consultation_id);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  type document_type not null,
  content text not null,
  issued_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists documents_consultation_id_idx on documents(consultation_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  sender_id uuid,
  sender_type message_sender_type not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_consultation_id_idx on messages(consultation_id);
create index if not exists messages_sender_idx on messages(sender_type, sender_id);

create table if not exists patient_files (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  consultation_id uuid references consultations(id) on delete set null,
  file_name text not null,
  file_url text not null,
  file_type text,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists patient_files_patient_id_idx on patient_files(patient_id);
create index if not exists patient_files_consultation_id_idx on patient_files(consultation_id);

create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  triage_session_id uuid references triage_sessions(id) on delete set null,
  direction call_direction not null,
  vapi_call_id text,
  transcript text,
  duration_seconds integer,
  outcome text,
  created_at timestamptz not null default now()
);

create index if not exists call_logs_patient_id_idx on call_logs(patient_id);
create index if not exists call_logs_triage_session_id_idx on call_logs(triage_session_id);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  consultation_id uuid references consultations(id) on delete cascade,
  channel notification_channel not null,
  type text not null,
  message text not null,
  sent_at timestamptz,
  status notification_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists notifications_patient_id_idx on notifications(patient_id);
create index if not exists notifications_consultation_id_idx on notifications(consultation_id);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  plan_name text not null,
  stripe_subscription_id text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_patient_id_idx on subscriptions(patient_id);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_type audit_actor_type not null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_actor_idx on audit_log(actor_type, actor_id);
create index if not exists audit_log_table_record_idx on audit_log(table_name, record_id);
create index if not exists audit_log_created_at_idx on audit_log(created_at);

-- updated_at trigger for consultations
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists consultations_set_updated_at on consultations;
create trigger consultations_set_updated_at
before update on consultations
for each row
execute function set_updated_at();

-- Row Level Security (RLS)
alter table patients enable row level security;
alter table partner_doctors enable row level security;
alter table companies enable row level security;
alter table company_employees enable row level security;
alter table triage_sessions enable row level security;
alter table consultations enable row level security;
alter table prescriptions enable row level security;
alter table documents enable row level security;
alter table messages enable row level security;
alter table patient_files enable row level security;
alter table call_logs enable row level security;
alter table notifications enable row level security;
alter table subscriptions enable row level security;
alter table audit_log enable row level security;

