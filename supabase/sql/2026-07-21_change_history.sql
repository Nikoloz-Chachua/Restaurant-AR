-- Change history + revert
-- =========================
-- Records every value change to theme_config and menu_items so the admin panel
-- can show "what changed recently" and put any single change back.
--
-- Design notes:
--  * One row per FIELD that actually changed (not per save). A save that rewrites
--    300 theme keys but only alters one colour produces exactly one row.
--  * Both tables feed ONE history table so the admin panel needs a single query.
--  * Every trigger body is wrapped in an exception handler: history logging must
--    never be able to block or fail a real menu/theme save.

create table if not exists public.change_history (
    id            bigserial primary key,
    restaurant_id bigint not null references public.restaurants(id) on delete cascade,
    source        text   not null,             -- 'theme_config' | 'menu_items'
    record_id     text,                        -- menu_items.id (null for theme)
    label         text,                        -- e.g. the dish name, for display
    field         text   not null,             -- theme key, or menu column name
    old_value     text,                        -- null => the field/row did not exist
    new_value     text,                        -- null => the row was deleted
    changed_at    timestamptz not null default now(),
    changed_by    uuid
);

create index if not exists change_history_restaurant_time_idx
    on public.change_history (restaurant_id, changed_at desc);

alter table public.change_history enable row level security;

-- Mirrors the existing theme_config policy style: signed-in staff read/write,
-- the app scopes every query by restaurant_id.
drop policy if exists change_history_auth_read on public.change_history;
create policy change_history_auth_read on public.change_history
    for select using (auth.role() = 'authenticated');

drop policy if exists change_history_auth_write on public.change_history;
create policy change_history_auth_write on public.change_history
    for all using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

grant select, insert, delete on public.change_history to authenticated;
grant usage, select on sequence public.change_history_id_seq to authenticated;


-- ── theme_config ─────────────────────────────────────────────────────────────
create or replace function public.log_theme_config_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    begin
        if tg_op = 'UPDATE' then
            -- Saves rewrite every key; only record the ones that truly moved.
            if new.value is distinct from old.value then
                insert into public.change_history
                    (restaurant_id, source, field, old_value, new_value, changed_by)
                values
                    (new.restaurant_id, 'theme_config', new.key, old.value, new.value, auth.uid());
            end if;
        elsif tg_op = 'INSERT' then
            insert into public.change_history
                (restaurant_id, source, field, old_value, new_value, changed_by)
            values
                (new.restaurant_id, 'theme_config', new.key, null, new.value, auth.uid());
        end if;
    exception when others then
        null;   -- never let logging break a save
    end;
    return null;
end;
$$;

drop trigger if exists theme_config_history on public.theme_config;
create trigger theme_config_history
    after insert or update on public.theme_config
    for each row execute function public.log_theme_config_change();


-- ── menu_items ───────────────────────────────────────────────────────────────
create or replace function public.log_menu_item_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    col   text;
    oldv  text;
    newv  text;
    oldj  jsonb;
    newj  jsonb;
    -- Only the fields a restaurant actually edits and would want back. Columns
    -- that don't exist simply read as null on both sides, so they never log.
    cols  text[] := array[
        'name_en','name_ka','description_en','description_ka','price',
        'category_id','thumbnail_url','model','model_usdz',
        'visible','ar_scale','is_3d','text_only','sort_order'
    ];
begin
    begin
        if tg_op = 'UPDATE' then
            oldj := to_jsonb(old);
            newj := to_jsonb(new);
            foreach col in array cols loop
                oldv := oldj ->> col;
                newv := newj ->> col;
                if newv is distinct from oldv then
                    insert into public.change_history
                        (restaurant_id, source, record_id, label, field, old_value, new_value, changed_by)
                    values
                        (new.restaurant_id, 'menu_items', new.id::text, new.name_en,
                         col, oldv, newv, auth.uid());
                end if;
            end loop;
        elsif tg_op = 'DELETE' then
            insert into public.change_history
                (restaurant_id, source, record_id, label, field, old_value, new_value, changed_by)
            values
                (old.restaurant_id, 'menu_items', old.id::text, old.name_en,
                 '__deleted__', old.name_en, null, auth.uid());
        end if;
    exception when others then
        null;   -- never let logging break a save
    end;
    return null;
end;
$$;

drop trigger if exists menu_items_history on public.menu_items;
create trigger menu_items_history
    after update or delete on public.menu_items
    for each row execute function public.log_menu_item_change();


-- Keep the log from growing without bound: trim anything older than 90 days.
-- Safe to run repeatedly; call it from a scheduled job if one exists.
create or replace function public.prune_change_history()
returns void
language sql
as $$
    delete from public.change_history where changed_at < now() - interval '90 days';
$$;
