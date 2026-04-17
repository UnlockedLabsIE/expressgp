-- Shared in-platform clinical record (ExpressGP partner GPs)
-- Any partner GP who has (or had) a consultation assigned to them for patient P
-- may SELECT consultations, prescriptions, documents, and messages for ALL
-- consultations belonging to P on this platform (not only rows where they
-- are partner_doctor_id). Patients still see only their own rows.
-- Pending queue: any active partner_doctor may still SELECT pending consultations.

-- ─── consultations SELECT ───────────────────────────────────────────────────
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
      and exists (
        select 1 from consultations c2
        where c2.patient_id = consultations.patient_id
          and c2.partner_doctor_id = auth.uid()
      )
    )
  );

-- ─── prescriptions SELECT ───────────────────────────────────────────────────
drop policy if exists "prescriptions_select_patient_or_doctor" on prescriptions;
drop policy if exists "GP can view prescriptions from own consultations" on prescriptions;

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
            and exists (
              select 1 from consultations c2
              where c2.patient_id = c.patient_id
                and c2.partner_doctor_id = auth.uid()
            )
          )
        )
    )
  );

-- INSERT unchanged: only assigned GP may insert (policy from add_clinical_record / schema)

-- ─── documents SELECT ─────────────────────────────────────────────────────────
drop policy if exists "documents_select_patient_or_doctor" on documents;
drop policy if exists "GP can view documents from own consultations" on documents;

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
            and exists (
              select 1 from consultations c2
              where c2.patient_id = c.patient_id
                and c2.partner_doctor_id = auth.uid()
            )
          )
        )
    )
  );

-- ─── messages SELECT ──────────────────────────────────────────────────────────
drop policy if exists "messages_select_patient_or_doctor" on messages;
drop policy if exists "GP can view messages in own consultations" on messages;

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
            and exists (
              select 1 from consultations c2
              where c2.patient_id = c.patient_id
                and c2.partner_doctor_id = auth.uid()
            )
          )
        )
    )
  );

-- ─── triage_sessions SELECT (linked from consultations) ───────────────────────
do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'triage_sessions'
  ) then
    drop policy if exists "GP can view triage sessions linked to own consultations" on triage_sessions;

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
                and exists (
                  select 1 from consultations c2
                  where c2.patient_id = c.patient_id
                    and c2.partner_doctor_id = auth.uid()
                )
              )
            )
        )
      );
  end if;
end $$;

comment on policy "prescriptions_select_shared_clinical" on prescriptions is
  'ExpressGP shared in-platform record: partner GPs see prescriptions for any consultation of a patient they have treated.';
