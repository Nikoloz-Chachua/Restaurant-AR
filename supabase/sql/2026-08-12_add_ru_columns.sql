-- Adds Russian-language columns for menu items and categories.
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Safe to run multiple times: IF NOT EXISTS guards every ADD COLUMN.
--
-- Why this can't be done through the app's Supabase key: that key is a
-- PostgREST service-role key (data read/write only). Schema changes (DDL)
-- require the SQL Editor or a Postgres connection string, neither of which
-- this session has.

alter table public.categories  add column if not exists name_ru        text;
alter table public.menu_items  add column if not exists name_ru        text;
alter table public.menu_items  add column if not exists description_ru text;
