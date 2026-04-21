-- ─────────────────────────────────────────────────────────────────────────────
-- RETIRE — legacy public.audit_log (singular) table
-- ─────────────────────────────────────────────────────────────────────────────
-- Context
--   Both public.audit_log (singular, legacy) and public.audit_logs (plural,
--   current) exist in live prod. They were both empty as of 2026-04-21. All
--   application audit writes target audit_logs (plural) via lib/audit.ts.
--
--   audit_log is preserved in 0000_baseline_*.sql to faithfully reproduce
--   prod on fresh projects. This migration retires it cleanly and auditably.
--
-- Safety checks
--   This migration refuses to run unless audit_log is empty. If any rows are
--   present (e.g. someone starts writing to the legacy table), operator must
--   migrate them into audit_logs first and then re-run.
--
-- Rollback
--   The CREATE TABLE + indexes for audit_log live in 0000_baseline_*.sql and
--   can be copied back if needed. Schema is simple and deterministic.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_row_count bigint;
begin
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'audit_log'
  ) then
    raise notice 'public.audit_log does not exist — nothing to retire.';
    return;
  end if;

  select count(*) into v_row_count from public.audit_log;

  if v_row_count > 0 then
    raise exception
      'Refusing to drop public.audit_log: % row(s) present. Migrate data into public.audit_logs first.',
      v_row_count;
  end if;

  drop index if exists public.audit_log_actor_idx;
  drop index if exists public.audit_log_created_at_idx;
  drop index if exists public.audit_log_table_record_idx;

  drop table public.audit_log;

  raise notice 'public.audit_log retired. All audit writes go to public.audit_logs (plural).';
end $$;
