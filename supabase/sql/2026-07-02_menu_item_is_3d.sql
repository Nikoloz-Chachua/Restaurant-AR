-- Name: 2026-07-02_menu_item_is_3d
-- Purpose:
--   1) Add an explicit "is this a 3D/AR item?" flag to menu_items so a restaurant
--      can mark plain items (drinks, sides, etc.) as non-3D. Non-3D items render
--      with no 3D badge, no thumbnail 3D upgrade, and no AR button on the customer
--      menu, and never count toward the plan's active-AR-item limit.
--   2) Document the model-upload rule: GLB/USDZ uploads are BetaReal-only
--      (super_admin), enforced in the app + the /api/r2-presign route. Clients may
--      still upload their own item photo thumbnails (WebP). No schema change is
--      needed for that rule — it is an authorization check, not a column — but it
--      is recorded here so the policy lives next to the data model.
-- Safe to re-run. Run after 2026-06-29_multitenant_platform_foundation.sql.

alter table public.menu_items
  add column if not exists is_3d boolean not null default true;

-- Backfill: any existing item that already has a model URL is a 3D item; anything
-- without a model is treated as non-3D so the flag matches reality on day one.
update public.menu_items
set is_3d = (coalesce(trim(model), '') <> '')
where is_3d is null or (coalesce(trim(model), '') = '' and is_3d = true);

notify pgrst, 'reload schema';
