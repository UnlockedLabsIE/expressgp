-- GP legal name: only administration (service_role) may change first_name / last_name.
-- Display name on documents must match the record created when the GP was onboarded.

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

comment on function public.partner_doctors_enforce_field_limits() is
  'Blocks GP self-service updates to first_name, last_name, imc_number, email, employment_type, is_active, and id unless request uses service_role (admin APIs).';
