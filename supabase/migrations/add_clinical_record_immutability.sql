-- Clinical record immutability and retention policy
-- Irish medical record retention requirement: minimum 8 years
-- (Medical Council of Ireland guidance, 2015)
-- GDPR Article 17(3)(b): right to erasure does not apply where retention
-- is required by law — Irish medical record law takes precedence.
--
-- Documents are covered separately in add_document_retention_policy.sql
--
-- This migration uses existence checks throughout so it is safe to run
-- regardless of which tables have been created in this environment.

-- ═══════════════════════════════════════════════════════════════════════════
-- SHARED IMMUTABILITY FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function clinical_record_immutable()
returns trigger language plpgsql as $$
begin
  raise exception
    'Table "%" contains permanent clinical records. % operations are prohibited. '
    'Retention period: 8 years (Medical Council of Ireland). Record ID: %',
    TG_TABLE_NAME, TG_OP, OLD.id;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PRESCRIPTIONS — fully immutable
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'prescriptions') then

    alter table prescriptions enable row level security;

    if not exists (
      select from pg_policies where tablename = 'prescriptions' and policyname = 'GP can view prescriptions from own consultations'
    ) then
      create policy "GP can view prescriptions from own consultations"
        on prescriptions for select
        using (
          exists (
            select 1 from consultations c
            where c.id = prescriptions.consultation_id
              and c.partner_doctor_id = auth.uid()
          )
        );
    end if;

    if not exists (
      select from pg_policies where tablename = 'prescriptions' and policyname = 'GP can insert prescriptions on own consultations'
    ) then
      create policy "GP can insert prescriptions on own consultations"
        on prescriptions for insert
        with check (
          exists (
            select 1 from consultations c
            where c.id = consultation_id
              and c.partner_doctor_id = auth.uid()
          )
        );
    end if;

    if not exists (
      select from pg_trigger where tgname = 'enforce_prescription_immutability'
    ) then
      create trigger enforce_prescription_immutability
        before update or delete on prescriptions
        for each row execute function clinical_record_immutable();
    end if;

  else
    raise notice 'Table prescriptions does not exist — skipping.';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT LOGS — fully immutable (create table if not exists, then lock it)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid,
  actor_type   text not null check (actor_type in ('patient', 'partner_doctor', 'system', 'admin')),
  action       text not null,
  table_name   text not null,
  record_id    uuid,
  old_value    jsonb,
  new_value    jsonb,
  ip_address   text,
  created_at   timestamptz not null default now()
);

alter table audit_logs enable row level security;

do $$ begin
  if not exists (
    select from pg_policies where tablename = 'audit_logs' and policyname = 'GP can view own audit log entries'
  ) then
    create policy "GP can view own audit log entries"
      on audit_logs for select
      using (actor_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select from pg_trigger where tgname = 'enforce_audit_log_immutability'
  ) then
    create trigger enforce_audit_log_immutability
      before update or delete on audit_logs
      for each row execute function clinical_record_immutable();
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIAGE SESSIONS — fully immutable
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'triage_sessions') then

    alter table triage_sessions enable row level security;

    if not exists (
      select from pg_policies where tablename = 'triage_sessions' and policyname = 'GP can view triage sessions linked to own consultations'
    ) then
      create policy "GP can view triage sessions linked to own consultations"
        on triage_sessions for select
        using (
          exists (
            select 1 from consultations c
            where c.triage_session_id = triage_sessions.id
              and c.partner_doctor_id = auth.uid()
          )
        );
    end if;

    if not exists (
      select from pg_trigger where tgname = 'enforce_triage_session_immutability'
    ) then
      create trigger enforce_triage_session_immutability
        before update or delete on triage_sessions
        for each row execute function clinical_record_immutable();
    end if;

  else
    raise notice 'Table triage_sessions does not exist — skipping.';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- MESSAGES — delete blocked, UPDATE allowed (is_read legitimately updated)
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'messages') then

    alter table messages enable row level security;

    if not exists (
      select from pg_policies where tablename = 'messages' and policyname = 'GP can view messages in own consultations'
    ) then
      create policy "GP can view messages in own consultations"
        on messages for select
        using (
          exists (
            select 1 from consultations c
            where c.id = messages.consultation_id
              and c.partner_doctor_id = auth.uid()
          )
        );
    end if;

    if not exists (
      select from pg_policies where tablename = 'messages' and policyname = 'GP can insert messages in own consultations'
    ) then
      create policy "GP can insert messages in own consultations"
        on messages for insert
        with check (
          exists (
            select 1 from consultations c
            where c.id = consultation_id
              and c.partner_doctor_id = auth.uid()
          )
        );
    end if;

    if not exists (
      select from pg_trigger where tgname = 'enforce_message_no_delete'
    ) then
      create trigger enforce_message_no_delete
        before delete on messages
        for each row execute function clinical_record_immutable();
    end if;

  else
    raise notice 'Table messages does not exist — skipping.';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PATIENT FILES — fully immutable
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'patient_files') then

    alter table patient_files enable row level security;

    if not exists (
      select from pg_trigger where tgname = 'enforce_patient_file_immutability'
    ) then
      create trigger enforce_patient_file_immutability
        before update or delete on patient_files
        for each row execute function clinical_record_immutable();
    end if;

  else
    raise notice 'Table patient_files does not exist — skipping.';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- CALL LOGS — fully immutable
-- ═══════════════════════════════════════════════════════════════════════════

do $$ begin
  if exists (select from information_schema.tables where table_schema = 'public' and table_name = 'call_logs') then

    alter table call_logs enable row level security;

    if not exists (
      select from pg_trigger where tgname = 'enforce_call_log_immutability'
    ) then
      create trigger enforce_call_log_immutability
        before update or delete on call_logs
        for each row execute function clinical_record_immutable();
    end if;

  else
    raise notice 'Table call_logs does not exist — skipping.';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- CONSULTATIONS — delete blocked, UPDATE allowed (status changes, notes)
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function consultation_no_delete()
returns trigger language plpgsql as $$
begin
  raise exception
    'Consultations are permanent clinical records and cannot be deleted. '
    'Retention period: 8 years (Medical Council of Ireland). Consultation ID: %', OLD.id;
end;
$$;

do $$ begin
  if not exists (
    select from pg_trigger where tgname = 'enforce_consultation_no_delete'
  ) then
    create trigger enforce_consultation_no_delete
      before delete on consultations
      for each row execute function consultation_no_delete();
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PATIENTS — delete blocked
-- GDPR Art.17(3)(b): right to erasure does not apply where retention is
-- required by law. Use field-level anonymisation for erasure requests.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function patient_no_delete()
returns trigger language plpgsql as $$
begin
  raise exception
    'Patient records cannot be hard-deleted. '
    'GDPR Art.17(3)(b): right to erasure does not apply where retention is required by law. '
    'For erasure requests, use the field-level anonymisation procedure. Patient ID: %', OLD.id;
end;
$$;

do $$ begin
  if not exists (
    select from pg_trigger where tgname = 'enforce_patient_no_delete'
  ) then
    create trigger enforce_patient_no_delete
      before delete on patients
      for each row execute function patient_no_delete();
  end if;
end $$;
