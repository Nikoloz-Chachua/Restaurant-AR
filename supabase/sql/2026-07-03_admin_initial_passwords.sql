-- Name: 2026-07-03_admin_initial_passwords
-- Purpose: Temporary operational storage for initial admin passwords visible only
-- through super-admin service-role API routes. Remove when BetaReal no longer
-- needs plaintext password visibility.

create table if not exists public.admin_initial_passwords (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  initial_password text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_initial_passwords_email_idx
  on public.admin_initial_passwords (lower(email));

alter table public.admin_initial_passwords enable row level security;

revoke all on public.admin_initial_passwords from anon;
revoke all on public.admin_initial_passwords from authenticated;
grant all on public.admin_initial_passwords to service_role;

comment on table public.admin_initial_passwords is
  'Temporary plaintext initial admin password storage for BetaReal super-admin operations only.';
