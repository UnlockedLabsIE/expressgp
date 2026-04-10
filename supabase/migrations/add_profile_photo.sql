-- Profile photo URL for partner doctors
-- Stored in Supabase Storage bucket 'doctor-photos', public URL saved here.
-- Bucket must be created manually in the Supabase dashboard with public read access.

alter table partner_doctors
  add column if not exists profile_photo_url text default null;
