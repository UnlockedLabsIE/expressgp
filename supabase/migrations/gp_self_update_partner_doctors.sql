-- GP self-service: allow authenticated partner doctors to UPDATE their own row,
-- while blocking changes to identity / governance fields unless service_role.

-- Display timezone for dashboard (optional; defaults Ireland)
alter table partner_doctors
  add column if not exists display_timezone text default 'Europe/Dublin';

-- RLS: own-row UPDATE for authenticated GPs
drop policy if exists "partner_doctors_update_own" on partner_doctors;
create policy "partner_doctors_update_own"
  on partner_doctors
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Trigger: forbid sensitive column changes except when JWT role is service_role
create or replace function public.partner_doctors_enforce_field_limits()
returns trigger
language plpgsql
as $$
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

drop trigger if exists partner_doctors_enforce_field_limits_trigger on partner_doctors;
create trigger partner_doctors_enforce_field_limits_trigger
  before update on partner_doctors
  for each row
  execute function public.partner_doctors_enforce_field_limits();

comment on function public.partner_doctors_enforce_field_limits() is
  'Blocks GP self-service updates to imc_number, email, employment_type, is_active, and id unless request uses service_role (admin APIs).';
