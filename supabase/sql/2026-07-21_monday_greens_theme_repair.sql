-- Restore Monday Greens production design tokens from the approved staging theme.
-- Idempotent: only upserts design keys and never deletes existing theme_config rows.
do $$
declare
  production_restaurant_id bigint;
  staging_restaurant_id bigint;
begin
  select id into production_restaurant_id
  from public.restaurants
  where slug = 'monday-greens';

  if production_restaurant_id is null then
    raise exception 'Missing restaurant slug: monday-greens';
  end if;

  select id into staging_restaurant_id
  from public.restaurants
  where slug = 'monday-greens-staging';

  if staging_restaurant_id is null then
    raise exception 'Missing restaurant slug: monday-greens-staging';
  end if;

  insert into public.theme_config (restaurant_id, key, value)
  select production_restaurant_id, key, value
  from public.theme_config
  where restaurant_id = staging_restaurant_id
    and (
      key like 'day\_%' escape '\'
      or key like 'night\_%' escape '\'
      or key in ('font_body', 'font_heading', 'template_key')
    )
  on conflict on constraint theme_config_pkey do update
    set value = excluded.value;
end $$;
