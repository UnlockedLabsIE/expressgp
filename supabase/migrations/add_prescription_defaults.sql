-- Prescription default columns on partner_doctors
-- Pre-filled when a GP issues a prescription so they don't retype
-- their preferred pharmacy each time.

alter table partner_doctors
  add column if not exists default_pharmacy_name    text default null,
  add column if not exists default_pharmacy_address text default null;
