-- 2026-08-01_segment_template_theme_replace.sql
-- Make the two demo tenants' theme_config an EXACT copy of their source.
-- ROLLBACK by default; run with --commit.
--
-- The clone migration upserted, which MERGES. Any key the demo had from its
-- original preset seeding but the source does not define survived and kept
-- winning, because the app injects theme_config into a <style id="remote-theme">
-- tag appended after the main stylesheet — so theme_config beats every template
-- CSS rule regardless of specificity.
--
-- That left the Fast Casual demo rendering warm_gold's grain background and
-- accent gradients over Mugsy's layout: right structure, wrong palette. The fix
-- is to REPLACE the token set rather than merge into it.
--
-- Reads the sources only. The DELETE is pinned by slug to the two demos.

BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM restaurants WHERE slug IN ('cafe','fast-casual','monday-greens','mugsy-main')) <> 4 THEN
    RAISE EXCEPTION 'expected both demo tenants and both source tenants to exist';
  END IF;
END $$;

-- Keep the three identity keys; drop everything else so nothing stale survives.
DELETE FROM theme_config
WHERE restaurant_id IN (SELECT id FROM restaurants WHERE slug IN ('cafe','fast-casual'))
  AND key NOT IN ('site_name', 'site_name_ka', 'template_key');

INSERT INTO theme_config (restaurant_id, key, value)
SELECT (SELECT id FROM restaurants WHERE slug = 'cafe'), t.key, t.value
FROM theme_config t
WHERE t.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'monday-greens')
  AND t.key NOT IN ('site_name', 'site_name_ka', 'template_key')
ON CONFLICT (restaurant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO theme_config (restaurant_id, key, value)
SELECT (SELECT id FROM restaurants WHERE slug = 'fast-casual'), t.key, t.value
FROM theme_config t
WHERE t.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'mugsy-main')
  AND t.key NOT IN ('site_name', 'site_name_ka', 'template_key')
ON CONFLICT (restaurant_id, key) DO UPDATE SET value = EXCLUDED.value;

-- Prove it: every non-identity key must now match the source exactly, in both
-- directions. Anything other than 0 / 0 / 0 means the copy is still not exact.
WITH pairs AS (
  SELECT 'cafe' AS demo, 'monday-greens' AS src
  UNION ALL SELECT 'fast-casual', 'mugsy-main'
)
SELECT p.demo, p.src,
       (SELECT count(*) FROM theme_config d
          JOIN restaurants dr ON dr.id = d.restaurant_id AND dr.slug = p.demo
         WHERE d.key NOT IN ('site_name','site_name_ka','template_key')
           AND NOT EXISTS (SELECT 1 FROM theme_config s
                             JOIN restaurants sr ON sr.id = s.restaurant_id AND sr.slug = p.src
                            WHERE s.key = d.key)) AS only_in_demo,
       (SELECT count(*) FROM theme_config s
          JOIN restaurants sr ON sr.id = s.restaurant_id AND sr.slug = p.src
         WHERE s.key NOT IN ('site_name','site_name_ka','template_key')
           AND NOT EXISTS (SELECT 1 FROM theme_config d
                             JOIN restaurants dr ON dr.id = d.restaurant_id AND dr.slug = p.demo
                            WHERE d.key = s.key)) AS only_in_src,
       (SELECT count(*) FROM theme_config d
          JOIN restaurants dr ON dr.id = d.restaurant_id AND dr.slug = p.demo
          JOIN theme_config s ON s.key = d.key
          JOIN restaurants sr ON sr.id = s.restaurant_id AND sr.slug = p.src
         WHERE d.key NOT IN ('site_name','site_name_ka','template_key')
           AND d.value IS DISTINCT FROM s.value) AS value_mismatch
FROM pairs p;

ROLLBACK;
