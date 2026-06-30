-- Name: 2026-06-30_branch_managers_and_premium_branches
-- Purpose: Add branch_manager support and Premium 900 branch creation.
-- Safe to re-run. Run after 2026-06-30_service_role_membership_grants.sql.

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'restaurant_users'
      and constraint_name = 'restaurant_users_role_check'
  ) then
    alter table public.restaurant_users drop constraint restaurant_users_role_check;
  end if;

  alter table public.restaurant_users
    add constraint restaurant_users_role_check
    check (role in ('branch_staff', 'branch_manager'));
end $$;

create or replace function public.can_manage_restaurant(target_restaurant_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.restaurants r
      join public.brand_users bu on bu.brand_id = r.brand_id
      where r.id = target_restaurant_id
        and bu.user_id = auth.uid()
        and bu.role = 'brand_owner'
    )
    or exists (
      select 1 from public.restaurant_users ru
      where ru.restaurant_id = target_restaurant_id
        and ru.user_id = auth.uid()
        and ru.role in ('branch_manager', 'branch_staff')
    )
$$;

create or replace function public.create_platform_branch(
  p_brand_id bigint,
  p_restaurant_name text,
  p_restaurant_slug text,
  p_create_starter_category boolean default true
)
returns table (
  brand_id bigint,
  brand_name text,
  brand_slug text,
  plan text,
  restaurant_id bigint,
  restaurant_name text,
  restaurant_slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_brand public.brands%rowtype;
  v_restaurant_id bigint;
begin
  select * into v_brand
  from public.brands
  where id = p_brand_id;

  if not found then
    raise exception 'Brand not found' using errcode = 'P0002';
  end if;

  if not (
    public.is_super_admin()
    or (
      v_brand.plan = 'premium'
      and exists (
        select 1
        from public.brand_users bu
        where bu.brand_id = p_brand_id
          and bu.user_id = auth.uid()
          and bu.role = 'brand_owner'
      )
    )
  ) then
    raise exception 'Only super admins and Premium 900 brand owners can create branches' using errcode = '42501';
  end if;

  if coalesce(trim(p_restaurant_name), '') = '' then
    raise exception 'Branch name is required' using errcode = '22023';
  end if;

  if p_restaurant_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Branch slug must use lowercase letters, numbers, and hyphens' using errcode = '22023';
  end if;

  insert into public.restaurants (brand_id, name, slug, status)
  values (p_brand_id, trim(p_restaurant_name), p_restaurant_slug, 'active')
  returning id into v_restaurant_id;

  if p_create_starter_category then
    insert into public.categories (restaurant_id, name_en, name_ka, sort_order)
    values (v_restaurant_id, 'Featured', 'რჩეული', 1);
  end if;

  insert into public.theme_config (restaurant_id, key, value)
  values
    (v_restaurant_id, 'site_name', v_brand.name),
    (v_restaurant_id, 'site_name_ka', v_brand.name)
  on conflict on constraint theme_config_pkey do update set value = excluded.value;

  if coalesce(v_brand.primary_color, '') <> '' then
    insert into public.theme_config (restaurant_id, key, value)
    values (v_restaurant_id, 'night_accent', v_brand.primary_color)
    on conflict on constraint theme_config_pkey do update set value = excluded.value;
  end if;

  if coalesce(v_brand.secondary_color, '') <> '' then
    insert into public.theme_config (restaurant_id, key, value)
    values (v_restaurant_id, 'day_accent', v_brand.secondary_color)
    on conflict on constraint theme_config_pkey do update set value = excluded.value;
  end if;

  return query
  select
    b.id,
    b.name,
    b.slug,
    b.plan,
    r.id,
    r.name,
    r.slug
  from public.brands b
  join public.restaurants r on r.brand_id = b.id
  where b.id = p_brand_id and r.id = v_restaurant_id;
end $$;

drop policy if exists restaurant_users_super_admin_write on public.restaurant_users;
create policy restaurant_users_super_admin_write on public.restaurant_users
for all using (public.is_super_admin()) with check (public.is_super_admin());

grant execute on function public.can_manage_restaurant(bigint) to authenticated, service_role;
grant execute on function public.create_platform_branch(bigint, text, text, boolean) to authenticated, service_role;

grant select on public.brand_users, public.restaurant_users to authenticated, service_role;
grant select, insert, update, delete on public.restaurants, public.categories, public.theme_config to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

notify pgrst, 'reload schema';
