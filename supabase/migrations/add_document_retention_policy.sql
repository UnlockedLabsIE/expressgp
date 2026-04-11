-- Document retention and immutability policy
-- Irish medical record retention requirement: minimum 8 years
-- (Medical Council of Ireland guidance, 2015)
--
-- Enforces two layers of protection:
--   1. RLS: GPs can only read/insert documents from their own consultations.
--      No UPDATE or DELETE policies exist — those operations are denied to all
--      authenticated users including service role API calls subject to RLS.
--   2. Immutability trigger: raises a hard exception on any UPDATE or DELETE
--      at the Postgres engine level. This applies even to service role calls
--      that bypass RLS. Only a database superuser can remove this trigger.

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table documents enable row level security;

create policy "GP can view documents from own consultations"
  on documents for select
  using (
    exists (
      select 1 from consultations c
      where c.id = documents.consultation_id
        and c.partner_doctor_id = auth.uid()
    )
  );

create policy "GP can insert documents on own consultations"
  on documents for insert
  with check (
    exists (
      select 1 from consultations c
      where c.id = consultation_id
        and c.partner_doctor_id = auth.uid()
    )
  );

-- ── Immutability trigger ──────────────────────────────────────────────────────

create or replace function documents_immutable()
returns trigger language plpgsql as $$
begin
  raise exception
    'Documents are permanent clinical records and cannot be % under any circumstances. '
    'Retention period: 8 years (Medical Council of Ireland). '
    'Document ID: %', TG_OP, OLD.id;
end;
$$;

create trigger enforce_document_immutability
  before update or delete on documents
  for each row execute function documents_immutable();
