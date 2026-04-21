-- Patient consent records (immutable once created; Irish Medical Council / GDPR)

create table if not exists public.patient_consents (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients(id) on delete restrict,
  consent_version  text not null,
  consented_at     timestamptz not null default now(),
  ip_address       inet,
  consent_text     text not null
);

create index if not exists patient_consents_patient_consented_idx
  on public.patient_consents (patient_id, consented_at desc);

comment on table public.patient_consents is
  'Immutable snapshot of consent wording and version at time of acceptance. No updates or deletes via normal roles.';

alter table public.patient_consents enable row level security;

-- Patients read their own consent history
create policy "patient_consents_select_own"
  on public.patient_consents
  for select
  to authenticated
  using (patient_id = auth.uid());

-- GPs may read consent for patients they treat (assigned) or see in pending queue (data minimisation: only when consultation visible)
create policy "patient_consents_select_gp_assigned"
  on public.patient_consents
  for select
  to authenticated
  using (
    exists (
      select 1 from public.consultations c
      where c.patient_id = patient_consents.patient_id
        and c.partner_doctor_id = auth.uid()
    )
  );

create policy "patient_consents_select_gp_pending_queue"
  on public.patient_consents
  for select
  to authenticated
  using (
    exists (
      select 1 from public.consultations c
      where c.patient_id = patient_consents.patient_id
        and c.status = 'pending'
        and exists (
          select 1 from public.partner_doctors pd
          where pd.id = auth.uid() and pd.is_active = true
        )
    )
  );

-- Only the patient may insert their own consent row
create policy "patient_consents_insert_own"
  on public.patient_consents
  for insert
  to authenticated
  with check (patient_id = auth.uid());

-- No UPDATE / DELETE policies — rows are append-only for app roles.

-- Hard immutability: even service_role cannot mutate rows without dropping this trigger first (legal hold / DBA only).
create or replace function public.patient_consents_reject_mutation()
returns trigger
language plpgsql as $$
begin
  raise exception 'patient_consents is append-only: updates and deletes are not permitted';
end;
$$;

drop trigger if exists patient_consents_reject_update on public.patient_consents;
create trigger patient_consents_reject_update
  before update on public.patient_consents
  for each row execute procedure public.patient_consents_reject_mutation();

drop trigger if exists patient_consents_reject_delete on public.patient_consents;
create trigger patient_consents_reject_delete
  before delete on public.patient_consents
  for each row execute procedure public.patient_consents_reject_mutation();
