-- Availability columns on partner_doctors
-- is_accepting_cases: when false, GP does not appear in the queue and a
--   warning banner is shown on their dashboard.
-- out_of_office_until: optional return date shown to admins / routing logic.

alter table partner_doctors
  add column if not exists is_accepting_cases  boolean     not null default true,
  add column if not exists out_of_office_until timestamptz          default null;
