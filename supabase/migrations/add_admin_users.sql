-- Admin users table
-- Admins are separate from partner_doctors. Same Supabase Auth system,
-- but identified by presence of a row in this table.
-- id matches auth.users.id (the Supabase Auth user UUID).

create table if not exists admin_users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  full_name     text not null,
  is_active     boolean not null default true,
  last_sign_in_at timestamptz,
  created_at    timestamptz not null default now()
);

-- RLS: admins can only see their own row via the anon key.
-- All other access (listing all admins, creating admins) requires service role.
alter table admin_users enable row level security;

create policy "Admin can read own row"
  on admin_users for select
  using (auth.uid() = id);

-- Helper function: returns true if the given uid is an active admin.
-- SECURITY DEFINER so it can read admin_users even when called by anon role.
-- Used by middleware to gate /admin routes without needing the service role key there.
create or replace function is_admin(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from admin_users
    where id = uid and is_active = true
  );
$$;

-- Revoke direct execute from anon/public — only callable by the app via RPC
revoke execute on function is_admin(uuid) from anon;
grant  execute on function is_admin(uuid) to authenticated;
