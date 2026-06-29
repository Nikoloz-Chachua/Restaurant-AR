-- Name: 2026-06-29_tenant_user_plan_upload_fixes
-- Purpose: Trusted tenant membership/plan backfill for BetaReal platform admins.
-- Safe to re-run. Run after 2026-06-29_multitenant_platform_foundation.sql.

-- 1) Plan assignments for existing tenants.
update public.brands
set plan = 'premium', updated_at = now()
where slug = 'burger-lions' or lower(name) = 'burger lions';

update public.brands
set plan = 'full', updated_at = now()
where slug in ('sherozia-caffe', 'sherozia-cafe')
   or lower(name) in ('sherozia caffe', 'sherozia cafe');

update public.brands
set plan = 'ar_menu', updated_at = now()
where slug in ('guranda-cafe', 'guranda-caffe')
   or lower(name) in ('guranda cafe', 'guranda caffe');

-- 2) app_metadata is trusted; user_metadata role/plan is explicitly ignored.
create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('super_admin', 'creator', 'dev')
$$;

-- 3) Link existing Supabase Auth users to existing tenants.
-- Replace the email strings below with the real owner/admin emails before running.
-- Leave a row null to skip that tenant.
with tenant_admin_emails(brand_slug, admin_email) as (
  values
    ('burger-lions', null::text),
    ('sherozia-caffe', null::text),
    ('guranda-cafe', null::text)
),
resolved as (
  select b.id as brand_id, r.id as restaurant_id, u.id as user_id
  from tenant_admin_emails m
  join public.brands b on b.slug = m.brand_slug
  join public.restaurants r on r.brand_id = b.id
  join auth.users u on lower(u.email) = lower(m.admin_email)
  where m.admin_email is not null
),
brand_links as (
  insert into public.brand_users (brand_id, user_id, role)
  select brand_id, user_id, 'brand_owner'
  from resolved
  on conflict (brand_id, user_id) do update set role = excluded.role
  returning user_id
),
restaurant_links as (
  insert into public.restaurant_users (restaurant_id, user_id, role)
  select restaurant_id, user_id, 'branch_staff'
  from resolved
  on conflict (restaurant_id, user_id) do update set role = excluded.role
  returning user_id
)
update auth.users u
set
  raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || '{"role":"brand_owner"}'::jsonb,
  raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) - 'role' - 'plan'
where u.id in (select user_id from resolved);

-- 4) Clean any stale untrusted role/plan metadata from already-linked tenant users.
update auth.users u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) - 'role' - 'plan'
where exists (select 1 from public.brand_users bu where bu.user_id = u.id)
   or exists (select 1 from public.restaurant_users ru where ru.user_id = u.id);

-- 5) Keep grants/function access aligned after replacement.
grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;

notify pgrst, 'reload schema';

select
  b.slug as brand_slug,
  b.name as brand_name,
  b.plan,
  r.slug as restaurant_slug,
  u.email as linked_admin_email,
  bu.role as brand_role,
  ru.role as restaurant_role
from public.brands b
left join public.restaurants r on r.brand_id = b.id
left join public.brand_users bu on bu.brand_id = b.id
left join auth.users u on u.id = bu.user_id
left join public.restaurant_users ru on ru.restaurant_id = r.id and ru.user_id = u.id
where b.slug in ('burger-lions', 'sherozia-caffe', 'guranda-cafe')
   or lower(b.name) in ('burger lions', 'sherozia caffe', 'sherozia cafe', 'guranda cafe', 'guranda caffe')
order by b.slug, r.slug, u.email;
