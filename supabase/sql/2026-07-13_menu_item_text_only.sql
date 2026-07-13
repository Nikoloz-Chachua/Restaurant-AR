-- Name: 2026-07-13_menu_item_text_only
-- Purpose: Add an explicit text-only menu item flag for items that should save
-- without thumbnail, GLB, or USDZ assets and render without an image stage.
-- Safe to re-run.

alter table public.menu_items
  add column if not exists text_only boolean not null default false;

-- Backfill legacy plain rows that already have no usable media.
update public.menu_items
set text_only = true,
    is_3d = false,
    model = '',
    model_usdz = '',
    thumbnail_url = '',
    thumb_3d = false
where coalesce(text_only, false) = false
  and coalesce(is_3d, false) = false
  and coalesce(trim(model), '') = ''
  and coalesce(trim(model_usdz), '') = ''
  and coalesce(trim(thumbnail_url), '') = '';

-- Keep explicitly text-only rows safe from stale asset values.
update public.menu_items
set is_3d = false,
    model = '',
    model_usdz = '',
    thumbnail_url = '',
    thumb_3d = false
where text_only = true;

notify pgrst, 'reload schema';
