-- Supabase Storage: doctor-photos bucket + RLS for GP profile images
-- Run after creating bucket "doctor-photos" in dashboard (or rely on insert below).

insert into storage.buckets (id, name, public)
values ('doctor-photos', 'doctor-photos', true)
on conflict (id) do update set public = excluded.public;

-- Policies on storage.objects (idempotent)
drop policy if exists "Doctor photos public read" on storage.objects;
create policy "Doctor photos public read"
  on storage.objects for select
  using (bucket_id = 'doctor-photos');

drop policy if exists "GP upload own doctor-photos folder" on storage.objects;
create policy "GP upload own doctor-photos folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'doctor-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "GP update own doctor-photos folder" on storage.objects;
create policy "GP update own doctor-photos folder"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'doctor-photos' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'doctor-photos' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "GP delete own doctor-photos folder" on storage.objects;
create policy "GP delete own doctor-photos folder"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'doctor-photos' and split_part(name, '/', 1) = auth.uid()::text);
