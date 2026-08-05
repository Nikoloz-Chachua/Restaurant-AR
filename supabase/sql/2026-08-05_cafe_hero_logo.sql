-- 2026-08-05_cafe_hero_logo.sql
-- Drop the inherited hero logo from the Modern Cafe demo.
-- ROLLBACK by default; change the final line to COMMIT; to apply.
--
-- APPLIED 2026-08-05 via the REST endpoint (the Management API token was
-- revoked at the time), deleting exactly one row: restaurant 68 / hero_logo_url.
-- Verified after: cafe has no hero_logo_url and keeps its own logo_url,
-- monday-greens still has hers, and the project-wide hero_logo_url count went
-- 6 -> 5. Kept here as the record of the change; re-running is a harmless no-op.
--
-- The demo was cloned from Monday Greens with a byte-exact copy of their
-- theme_config, which included:
--
--   hero_logo_url = https://monday-greens-b.3darmenu.pages.dev/img/mg-logo-white.png
--
-- The hero paints `hero_logo_url || logo_url`, so that inherited value wins over
-- the logo actually uploaded for this tenant. It went unnoticed because the hero
-- logo never rendered at all until the ReferenceError repaired in bl-v153; the
-- moment the hero logo came back, so did Monday Greens' branding.
--
-- Two reasons this key in particular is worth removing rather than overwriting:
-- it is not exposed as a field on the admin Theme page, so nobody can clear it
-- from the CMS, and it points at another tenant's deployment rather than at our
-- asset bucket. Deleting it lets the hero fall back to logo_url, which IS
-- editable in the admin panel.
--
-- hero_logo_url stays a supported key — a tenant may legitimately want a
-- knockout logo over the photo that differs from the topbar mark. Monday Greens
-- itself is untouched here and keeps using it.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE slug = 'cafe') THEN
    RAISE EXCEPTION 'cafe demo tenant not found';
  END IF;
END $$;

DELETE FROM theme_config
WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'cafe')
  AND key = 'hero_logo_url';

-- Refuse to commit unless the demo is clean and has something to fall back to.
DO $$
DECLARE n_leak integer; n_logo integer;
BEGIN
  SELECT count(*) INTO n_leak
  FROM theme_config
  WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'cafe')
    AND (key ILIKE '%monday%' OR value ILIKE '%monday%' OR value ILIKE '%mg-logo%');
  IF n_leak > 0 THEN
    RAISE EXCEPTION 'cafe still has % theme_config row(s) referencing Monday Greens', n_leak;
  END IF;

  SELECT count(*) INTO n_logo
  FROM theme_config
  WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'cafe')
    AND key = 'logo_url' AND coalesce(value, '') <> '';
  IF n_logo = 0 THEN
    RAISE EXCEPTION 'cafe has no logo_url to fall back to — upload a logo before running this';
  END IF;
END $$;

-- Verify: cafe keeps its own logo, Monday Greens keeps its hero logo.
SELECT r.slug,
       max(CASE WHEN t.key = 'logo_url'      THEN t.value END) AS logo_url,
       max(CASE WHEN t.key = 'hero_logo_url' THEN t.value END) AS hero_logo_url
FROM restaurants r JOIN theme_config t ON t.restaurant_id = r.id
WHERE r.slug IN ('cafe', 'monday-greens')
GROUP BY r.slug ORDER BY r.slug;

ROLLBACK;
