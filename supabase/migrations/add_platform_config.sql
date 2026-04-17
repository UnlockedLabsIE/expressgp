-- Platform-level configuration table.
-- Keyed JSONB rows — one row per logical config block.
-- All reads/writes go through the service role (admin only).

create table if not exists platform_config (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Only admins can read their own config rows (service role bypasses RLS anyway).
alter table platform_config enable row level security;

-- Seed defaults ---------------------------------------------------------
-- Prices are stored in euro cents (2500 = €25.00).
-- Mirrors the pricing in lib/config/services.ts on the frontend branch.

insert into platform_config (key, value) values (
  'service_pricing',
  '{
    "prescription":      2000,
    "sick_note":         2500,
    "medical_cert":      2500,
    "referral":          3000,
    "gp_consultation":   4000,
    "glp1":              6000,
    "insurance_report":  5000,
    "corporate":         3000,
    "glp1_subtypes": {
      "initial_assessment":          6000,
      "initial_blood_test_referral": 3000,
      "monthly_review":              4000,
      "dose_adjustment":             4000,
      "other_glp1":                  4000
    }
  }'
) on conflict (key) do nothing;

insert into platform_config (key, value) values (
  'gp_revenue_share',
  '{
    "default_pct":  70,
    "premium_pct":  75,
    "premium_threshold": 100
  }'
) on conflict (key) do nothing;

insert into platform_config (key, value) values (
  'platform_toggles',
  '{
    "accepting_new_patients": true,
    "accepting_new_gps":      true,
    "maintenance_mode":       false
  }'
) on conflict (key) do nothing;
