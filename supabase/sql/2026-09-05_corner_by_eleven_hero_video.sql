-- 2026-09-05_corner_by_eleven_hero_video.sql
-- Point Corner By Eleven's hero at the khachapuri cheese-pull clip.
-- ROLLBACK by default; change the final line to COMMIT; to apply.
--
-- This is the fallback path. The intended route is the admin Theme page ->
-- Branding -> "Hero video (BetaReal only)", which uploads to R2 and writes these
-- same three keys. Use this file only when the admin panel is not an option, or
-- to move a clip between tenants without re-uploading it.
--
-- The keys, all read by index.html -> applyRemoteTheme():
--
--   hero_video_url         wide 16:9 cut. Tablets, desktop, and phones when no
--                          phone cut is set.
--   hero_video_mobile_url  optional squarer cut. Phones only (max-width: 639px),
--                          where `cover` throws away most of a 16:9 frame.
--   hero_video_poster_url  the still. Painted immediately, kept for good for
--                          anyone on 2G, on Data Saver, or asking for reduced
--                          motion. Falls back to the first hero_images photo.
--
-- The clip never delays the menu: the band paints from the poster on the first
-- frame exactly as it did before, and the video is attached on idle afterwards.
-- Corner's four interior photos stay in hero_images untouched -- they remain the
-- fallback, they just stop rotating while a clip is set.
--
-- Encoding the clips (H.264, no audio, crossfaded so the loop has no seam):
--   ffmpeg -i source.mp4 -an -filter_complex \
--     "[0:v]split[body][pre];[pre]trim=duration=0.8,format=yuva420p,\
--      fade=in:st=0:d=0.8:alpha=1,setpts=PTS+8.4/TB[tail];\
--      [body]trim=start=0.8,setpts=PTS-STARTPTS[main];\
--      [main][tail]overlay=eof_action=pass,format=yuv420p,crop=1080:1080:420:0" \
--     -c:v libx264 -profile:v high -preset slow -crf 28 -pix_fmt yuv420p \
--     -movflags +faststart -g 48 cheese-pull-square.mp4
-- (0.8 = crossfade seconds, 8.4 = source duration - 2x crossfade. Swap the crop
-- for crop=1920:720:0:180 and -crf 27 for the wide cut.)

BEGIN;

-- Replace these three with the R2 URLs. Keep the r2 host: _safeAssetUrl() in
-- index.html accepts any http(s) URL, but everything heavy we serve lives there.
CREATE TEMP TABLE hero_video_input (key text PRIMARY KEY, value text);
INSERT INTO hero_video_input (key, value) VALUES
  ('hero_video_url',        'REPLACE_ME/corner-by-eleven/cheese-pull-wide.mp4'),
  ('hero_video_mobile_url', 'REPLACE_ME/corner-by-eleven/cheese-pull-square.mp4'),
  ('hero_video_poster_url', 'REPLACE_ME/corner-by-eleven/cheese-pull-poster.webp');

DO $$
DECLARE n_bad integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM restaurants WHERE slug = 'corner-by-eleven-main') THEN
    RAISE EXCEPTION 'corner-by-eleven-main not found';
  END IF;

  SELECT count(*) INTO n_bad FROM hero_video_input WHERE value LIKE 'REPLACE_ME%';
  IF n_bad > 0 THEN
    RAISE EXCEPTION 'Fill in the % URL(s) above before running this', n_bad;
  END IF;

  SELECT count(*) INTO n_bad FROM hero_video_input WHERE value NOT LIKE 'https://%';
  IF n_bad > 0 THEN
    RAISE EXCEPTION '% URL(s) are not https -- _safeAssetUrl will drop them', n_bad;
  END IF;
END $$;

INSERT INTO theme_config (restaurant_id, key, value)
SELECT (SELECT id FROM restaurants WHERE slug = 'corner-by-eleven-main'), i.key, i.value
FROM hero_video_input i
ON CONFLICT (restaurant_id, key) DO UPDATE SET value = EXCLUDED.value;

-- Refuse to commit if the fallback is gone: a clip with nothing behind it leaves
-- a blank band for every guest who does not get the video.
DO $$
DECLARE n_still integer;
BEGIN
  SELECT count(*) INTO n_still
  FROM theme_config
  WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'corner-by-eleven-main')
    AND key IN ('hero_images', 'hero_image_url', 'hero_video_poster_url')
    AND coalesce(value, '') NOT IN ('', '[]');
  IF n_still = 0 THEN
    RAISE EXCEPTION 'no poster and no hero photos -- the band would be empty without the clip';
  END IF;
END $$;

-- Verify.
SELECT key, value
FROM theme_config
WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'corner-by-eleven-main')
  AND key IN ('hero_video_url', 'hero_video_mobile_url', 'hero_video_poster_url',
              'hero_image_url', 'hero_images', 'template_key')
ORDER BY key;

ROLLBACK;
