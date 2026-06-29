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

select
  email,
  raw_app_meta_data ->> 'role' as role,
  raw_app_meta_data ->> 'plan' as plan,
  raw_user_meta_data as user_metadata_should_not_control_plan
from auth.users
where lower(email) in (
  'creator@betareal.test',
  'basic300@betareal.test',
  'full450@betareal.test',
  'premium900@betareal.test'
)
order by email;
