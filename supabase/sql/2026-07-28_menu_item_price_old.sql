-- Name: 2026-07-28_menu_item_price_old
-- Purpose: let an item advertise a discount by carrying its previous price
-- alongside the current one, so the card can render "33.80 ₾" struck through
-- next to "31.80 ₾".
--
-- Same free-text shape as menu_items.price (prices here are strings like
-- "31.80 ₾", not numerics — see the original schema).
--
-- Nullable with no default and no backfill: every existing row stays NULL, so
-- no tenant's menu changes appearance. The card only renders the old price when
-- this column holds something.
--
-- Safe to re-run.

alter table public.menu_items
  add column if not exists price_old text;

comment on column public.menu_items.price_old is
  'Previous price, shown struck through beside price. NULL/empty = not on sale.';

notify pgrst, 'reload schema';
