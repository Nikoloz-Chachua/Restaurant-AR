-- Name: 2026-07-28_menu_item_featured
-- Purpose: let a tenant promote a few signature dishes so a template can render
-- them as large hero cards above the normal list (Burger Bar's "Miami Burger",
-- "BBQ Bacon Burger", etc.).
--
-- Templates that do not implement a featured row simply ignore the flag, so
-- turning it on never changes an existing tenant's layout.
--
-- Defaults to false with no backfill: every existing row stays unfeatured, so
-- no menu changes appearance.
--
-- Safe to re-run.

alter table public.menu_items
  add column if not exists featured boolean not null default false;

comment on column public.menu_items.featured is
  'Promote as a signature/hero card. Only rendered by templates that support it.';

-- The public menu asks for these by restaurant; keep the promoted lookup cheap.
create index if not exists menu_items_featured_idx
  on public.menu_items (restaurant_id)
  where featured;

notify pgrst, 'reload schema';
