-- Name: 2026-06-27_plan_test_accounts_metadata
-- Purpose: Assign trusted BetaReal role/plan metadata to the four Supabase Auth test accounts.
-- Safe to re-run after creating/editing these users.

update auth.users
set
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"super_admin"}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'role' - 'plan'
where lower(email) = 'creator@betareal.test';

update auth.users
set
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"brand_owner"}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'role' - 'plan'
where lower(email) = 'basic300@betareal.test';

update auth.users
set
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"brand_owner"}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'role' - 'plan'
where lower(email) = 'full450@betareal.test';

update auth.users
set
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"brand_owner"}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'role' - 'plan'
where lower(email) = 'premium900@betareal.test';

insert into public.brand_users (brand_id, user_id, role)
select b.id, u.id, 'brand_owner'
from auth.users u
cross join public.brands b
where lower(u.email) in (
  'basic300@betareal.test',
  'full450@betareal.test',
  'premium900@betareal.test'
)
and b.slug = 'burger-lions'
on conflict (brand_id, user_id) do update set role = excluded.role;

delete from public.restaurant_users ru
using auth.users u
where ru.user_id = u.id
and lower(u.email) in (
  'basic300@betareal.test',
  'full450@betareal.test',
  'premium900@betareal.test'
);

with expected(email) as (
  values
    ('creator@betareal.test'),
    ('basic300@betareal.test'),
    ('full450@betareal.test'),
    ('premium900@betareal.test')
)
select
  e.email,
  case when u.id is null then 'missing auth user' else 'present' end as auth_user_status,
  u.raw_app_meta_data ->> 'role' as role,
  u.raw_app_meta_data ->> 'plan' as legacy_plan_should_be_null,
  b.slug as mapped_brand_slug,
  bu.role as mapped_brand_role,
  u.raw_user_meta_data as user_metadata_should_not_control_plan
from expected e
left join auth.users u on lower(u.email) = e.email
left join public.brand_users bu on bu.user_id = u.id
left join public.brands b on b.id = bu.brand_id and b.slug = 'burger-lions'
order by e.email;
