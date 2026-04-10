-- Doctor notification preferences
-- Each GP can configure which events trigger email and SMS alerts.
-- A row is created on first settings save (upsert). Defaults all on.

create table if not exists doctor_notification_preferences (
  id                    uuid primary key default gen_random_uuid(),
  doctor_id             uuid not null references partner_doctors(id) on delete cascade,
  email_new_consultation boolean not null default true,
  email_new_message      boolean not null default true,
  email_red_flag         boolean not null default true,
  sms_new_consultation   boolean not null default true,
  sms_red_flag           boolean not null default true,
  daily_summary_email    boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (doctor_id)
);

-- Auto-update updated_at on row change
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_doctor_notification_preferences_updated_at
  before update on doctor_notification_preferences
  for each row execute function update_updated_at_column();

-- RLS: doctors can only read/write their own preferences
alter table doctor_notification_preferences enable row level security;

create policy "Doctor can read own preferences"
  on doctor_notification_preferences for select
  using (auth.uid() = doctor_id);

create policy "Doctor can insert own preferences"
  on doctor_notification_preferences for insert
  with check (auth.uid() = doctor_id);

create policy "Doctor can update own preferences"
  on doctor_notification_preferences for update
  using (auth.uid() = doctor_id);
