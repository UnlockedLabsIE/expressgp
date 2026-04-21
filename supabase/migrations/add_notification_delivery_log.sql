-- GP-facing notification delivery audit (email / SMS / WhatsApp to partner doctors)

create type notification_delivery_status as enum ('sent', 'failed', 'pending');

create table if not exists public.notification_delivery_log (
  id                 uuid primary key default gen_random_uuid(),
  doctor_id          uuid not null references public.partner_doctors(id) on delete cascade,
  notification_type  text not null,
  channel            text not null check (channel in ('email', 'sms')),
  triggered_at       timestamptz not null default now(),
  delivered_at       timestamptz,
  status             notification_delivery_status not null default 'pending',
  consultation_id  uuid references public.consultations(id) on delete set null,
  error_message      text
);

create index if not exists notification_delivery_log_doctor_triggered_idx
  on public.notification_delivery_log (doctor_id, triggered_at desc);

create index if not exists notification_delivery_log_red_flag_failures_idx
  on public.notification_delivery_log (doctor_id, triggered_at desc)
  where notification_type = 'red_flag' and status = 'failed';

comment on table public.notification_delivery_log is
  'Audit trail for each outbound notification attempt to a partner GP (clinical governance).';

alter table public.notification_delivery_log enable row level security;

-- GPs may read only their own delivery rows (dashboard Settings + queries).
create policy "GP can read own notification delivery log"
  on public.notification_delivery_log
  for select
  to authenticated
  using (doctor_id = auth.uid());

-- Inserts are performed by service_role from application servers (no authenticated insert).
