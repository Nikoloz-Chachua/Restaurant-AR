-- Name: 2026-06-30_service_role_membership_grants
-- Purpose: Allow the server-side Vercel API using SUPABASE_SERVICE_ROLE_KEY to link tenant admins.
-- Safe to re-run.

grant usage on schema public to service_role;

grant select on public.brands, public.restaurants to service_role;
grant select, insert, update, delete on public.brand_users, public.restaurant_users to service_role;
grant select, insert, update, delete on public.brands, public.restaurants to service_role;
grant select, insert, update, delete on public.categories, public.menu_items, public.theme_config to service_role;
grant insert on public.events to service_role;
grant select on public.events to service_role;

grant usage, select on all sequences in schema public to service_role;

grant execute on function public.current_app_role() to service_role;
grant execute on function public.is_super_admin() to service_role;
grant execute on function public.can_access_brand(bigint) to service_role;
grant execute on function public.can_manage_brand(bigint) to service_role;
grant execute on function public.can_access_restaurant(bigint) to service_role;
grant execute on function public.can_manage_restaurant(bigint) to service_role;
grant execute on function public.create_platform_tenant(text, text, text, text, text, text, text, boolean) to service_role;

notify pgrst, 'reload schema';
