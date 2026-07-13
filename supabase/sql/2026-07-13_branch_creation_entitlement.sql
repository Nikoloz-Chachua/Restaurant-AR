-- Name: 2026-07-13_branch_creation_entitlement
-- Purpose: Make branch creation an explicit per-tenant entitlement.
-- Safe to re-run. Existing tenants default to denied unless explicitly enabled.

alter table public.brands
  add column if not exists can_create_branches boolean;

alter table public.brands
  alter column can_create_branches set default false;

update public.brands
set can_create_branches = false
where can_create_branches is null;

alter table public.brands
  alter column can_create_branches set not null;

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
      v_brand.can_create_branches is true
      and exists (
        select 1
        from public.brand_users bu
        where bu.brand_id = p_brand_id
          and bu.user_id = auth.uid()
          and bu.role = 'brand_owner'
      )
    )
  ) then
    raise exception 'Branch creation is disabled for this tenant' using errcode = '42501';
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

grant execute on function public.create_platform_branch(bigint, text, text, boolean) to authenticated, service_role;

notify pgrst, 'reload schema';
