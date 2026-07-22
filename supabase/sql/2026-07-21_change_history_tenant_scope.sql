-- Scope change history to the restaurant you belong to
-- ====================================================
-- The first cut of change_history let any signed-in user read any restaurant's
-- history. Restaurant owners must only ever see and revert THEIR OWN changes;
-- BetaReal creators/devs keep access to everything.
--
-- public.can_access_restaurant(id) already encodes exactly that rule and is used
-- by the restaurants and events policies:
--   super_admin / creator / dev  -> true for every restaurant
--   brand_users member           -> true for that brand's restaurants
--   restaurant_users member      -> true for that restaurant
--
-- Rows are written by the two history triggers, which are SECURITY DEFINER and
-- therefore insert regardless of these policies. Nothing needs INSERT rights, so
-- the app is left read-only against this table.

drop policy if exists change_history_auth_read  on public.change_history;
drop policy if exists change_history_auth_write on public.change_history;

create policy change_history_tenant_read on public.change_history
    for select using (public.can_access_restaurant(restaurant_id));

-- Read-only for the app: history is produced by triggers, never by the client.
revoke insert, delete on public.change_history from authenticated;
grant select on public.change_history to authenticated;
