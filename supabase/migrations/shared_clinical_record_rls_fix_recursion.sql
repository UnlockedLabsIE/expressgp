-- Fix infinite recursion on consultations RLS: policies must not subquery the same
-- table they protect. Use a SECURITY DEFINER helper (table owner bypasses RLS on inner read).

create or replace function public.gp_auth_user_treated_patient(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.consultations x
    where x.patient_id = p_patient_id
      and x.partner_doctor_id = (select auth.uid())
  );
$$;

revoke all on function public.gp_auth_user_treated_patient(uuid) from public;
grant execute on function public.gp_auth_user_treated_patient(uuid) to authenticated;

comment on function public.gp_auth_user_treated_patient(uuid) is
  'True if the current auth user has ever been assigned partner_doctor on any consultation for this patient_id. Used by RLS to avoid recursive policy on consultations.';

-- ─── consultations SELECT (fixed) ───────────────────────────────────────────
drop policy if exists "consultations_select_patient_or_doctor" on consultations;
create policy "consultations_select_patient_or_doctor"
  on consultations
  for select
  to authenticated
  using (
    patient_id = auth.uid()
    or partner_doctor_id = auth.uid()
    or (
      status = 'pending'
      and exists (select 1 from partner_doctors pd where pd.id = auth.uid() and pd.is_active = true)
    )
    or (
      exists (select 1 from partner_doctors pd where pd.id = auth.uid() and pd.is_active = true)
      and public.gp_auth_user_treated_patient(consultations.patient_id)
    )
  );

-- ─── prescriptions SELECT (fixed) ─────────────────────────────────────────
drop policy if exists "prescriptions_select_shared_clinical" on prescriptions;
create policy "prescriptions_select_shared_clinical"
  on prescriptions
  for select
  to authenticated
  using (
    exists (
      select 1
      from consultations c
      where c.id = prescriptions.consultation_id
        and (
          c.patient_id = auth.uid()
          or c.partner_doctor_id = auth.uid()
          or (
            c.status = 'pending'
            and exists (select 1 from partner_doctors pd where pd.id = auth.uid() and pd.is_active = true)
          )
          or (
            exists (select 1 from partner_doctors pd where pd.id = auth.uid() and pd.is_active = true)
            and public.gp_auth_user_treated_patient(c.patient_id)
          )
        )
    )
  );

-- ─── documents SELECT (fixed) ───────────────────────────────────────────────
drop policy if exists "documents_select_shared_clinical" on documents;
create policy "documents_select_shared_clinical"
  on documents
  for select
  to authenticated
  using (
    exists (
      select 1
      from consultations c
      where c.id = documents.consultation_id
        and (
          c.patient_id = auth.uid()
          or c.partner_doctor_id = auth.uid()
          or (
            c.status = 'pending'
            and exists (select 1 from partner_doctors pd where pd.id = auth.uid() and pd.is_active = true)
          )
          or (
            exists (select 1 from partner_doctors pd where pd.id = auth.uid() and pd.is_active = true)
            and public.gp_auth_user_treated_patient(c.patient_id)
          )
        )
    )
  );

-- ─── messages SELECT (fixed) ────────────────────────────────────────────────
drop policy if exists "messages_select_shared_clinical" on messages;
create policy "messages_select_shared_clinical"
  on messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from consultations c
      where c.id = messages.consultation_id
        and (
          c.patient_id = auth.uid()
          or c.partner_doctor_id = auth.uid()
          or (
            c.status = 'pending'
            and exists (select 1 from partner_doctors pd where pd.id = auth.uid() and pd.is_active = true)
          )
          or (
            exists (select 1 from partner_doctors pd where pd.id = auth.uid() and pd.is_active = true)
            and public.gp_auth_user_treated_patient(c.patient_id)
          )
        )
    )
  );

-- ─── triage_sessions SELECT (fixed) ───────────────────────────────────────────
do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'triage_sessions'
  ) then
    drop policy if exists "triage_sessions_select_shared_clinical" on triage_sessions;

    create policy "triage_sessions_select_shared_clinical"
      on triage_sessions
      for select
      to authenticated
      using (
        exists (
          select 1 from consultations c
          where c.triage_session_id = triage_sessions.id
            and (
              c.patient_id = auth.uid()
              or c.partner_doctor_id = auth.uid()
              or (
                c.status = 'pending'
                and exists (select 1 from partner_doctors pd where pd.id = auth.uid() and pd.is_active = true)
              )
              or (
                exists (select 1 from partner_doctors pd where pd.id = auth.uid() and pd.is_active = true)
                and public.gp_auth_user_treated_patient(c.patient_id)
              )
            )
        )
      );
  end if;
end $$;
