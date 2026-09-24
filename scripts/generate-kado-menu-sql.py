#!/usr/bin/env python3
"""Generate the KADO (restaurant 81 / brand 75) menu + theme import SQL.

Sources (scraped 2026-09-24): kado.ofoodo.com catalogue (names, KA ingredients,
prices, photos), Wolt venue kado1 (fallback photos), Google Maps (two branches).
English names/ingredients are BetaReal translations for the demo.
Writes a readable Unicode file and an ASCII-safe SQL Editor file, both ending
in ROLLBACK;. Usage: generate-kado-menu-sql.py <menu_final.json>
"""
import json, sys, re, pathlib

RID, BID, RSLUG, BSLUG = 81, 75, 'kado-main', 'kado'
ASSET = 'https://restaurant-ar.pages.dev/assets/kado'
ROOT = pathlib.Path(__file__).resolve().parent.parent

def lit(s, ascii_safe):
    if s is None:
        return 'NULL'
    s = str(s).replace("'", "''")
    if not ascii_safe or s.isascii():
        return "'" + s + "'"
    out = ''.join(c if c.isascii() and c != '\\' else ('\\\\' if c == '\\' else
                  (f'\\{ord(c):04X}' if ord(c) <= 0xFFFF else f'\\+{ord(c):06X}')) for c in s)
    return "U&'" + out + "'"

def price(p):
    return f'{p:g} \u20be'

# elegant_black (Corner at Tabidze) preset, champagne swapped for KADO red.
RED, RED2 = '#e0333a', '#9e1b21'
def recolor(v):
    return (v.replace('215,189,122', '224,51,58').replace('143,116,68', '158,27,33')
             .replace('#d7bd7a', RED).replace('#8f7444', RED2))

THEME = {
  'template_key': 'elegant_black', 'theme_lock': 'night', 'default_theme': 'night',
  'font_body': 'Lato', 'font_heading': 'Playfair Display',
  'night_bg': '#080808', 'night_bg2': '#151414', 'night_card': '#151414', 'night_card2': '#1f1d1b',
  'night_border': 'rgba(215,189,122,0.22)', 'night_text': '#f5efe3', 'night_dim': '#a89c86',
  'night_accent': '#d7bd7a', 'night_accent2': '#8f7444', 'night_accent_text': '#ffffff',
  'night_thumb_bg': '#101010', 'night_modal_bg': '#080808',
  'night_glow': 'rgba(215,189,122,0.20)', 'night_glow2': 'rgba(143,116,68,0.12)', 'night_shadow': 'rgba(0,0,0,0.68)',
  'night_bg_image': 'radial-gradient(78% 48% at 50% -12%, rgba(215,189,122,0.16) 0%, transparent 62%), radial-gradient(58% 42% at 88% 26%, rgba(143,116,68,0.12) 0%, transparent 74%), linear-gradient(180deg, #080808 0%, #151414 58%, #050505 100%)',
  'night_bg_size': 'auto, auto, auto', 'night_bg_repeat': 'no-repeat, no-repeat, no-repeat',
  'night_card_bg': 'linear-gradient(158deg, #151414 0%, #1f1d1b 100%)', 'night_card_radius': '16px', 'night_card_blur': '0px',
  'night_stage_bg': 'radial-gradient(78% 64% at 50% 18%, rgba(215,189,122,0.12), transparent 72%), #101010',
  'night_pill_bg': 'rgba(21,20,20,0.94)', 'night_pill_active_bg': 'linear-gradient(120deg, #d7bd7a, #8f7444)',
  'night_cta_bg': 'linear-gradient(120deg, #d7bd7a, #8f7444)', 'night_cta_shadow': '0 7px 20px rgba(215,189,122,0.20)',
  'night_hero_color': '#f5efe3', 'night_hero_shadow': '0 2px 18px rgba(215,189,122,0.16)',
  'night_divider_bg': 'linear-gradient(90deg, transparent, #d7bd7a, transparent)',
  'night_accent_edge': 'linear-gradient(180deg, #d7bd7a, #8f7444)',
  'night_thumb_vignette': 'radial-gradient(ellipse at center, transparent 34%, rgba(16,16,16,0.82) 100%)',
  'night_item_shadow': '0 5px 18px rgba(0,0,0,0.68)', 'night_item_hover_shadow': '0 14px 30px rgba(0,0,0,0.74)',
  'night_modal_bg_image': 'radial-gradient(70% 48% at 50% 36%, rgba(215,189,122,0.16) 0%, transparent 62%), radial-gradient(130% 100% at 50% 50%, #151414 0%, #080808 72%)',
}
THEME = {k: recolor(v) for k, v in THEME.items()}

VERA_MAP = 'https://www.google.com/maps/place/?q=place_id:ChIJ9cehvKsNREARLiGbyZBOyHc'
SAB_MAP = 'https://www.google.com/maps/place/?q=place_id:ChIJlwV9QABzREAR59Srw74qkEM'
CONTENT = {
  'site_name': 'KADO', 'site_name_ka': 'კადო',
  'logo_url': f'{ASSET}/logo.webp', 'hero_logo_url': f'{ASSET}/logo.webp',
  'hero_image_url': f'{ASSET}/hero-poster.webp',
  'hero_video_url': f'{ASSET}/hero-wide.mp4', 'hero_video_mobile_url': f'{ASSET}/hero-mobile.mp4',
  'hero_video_poster_url': f'{ASSET}/hero-poster.webp',
  'delivery_url': 'https://wolt.com/ka/geo/tbilisi/restaurant/kado1',
  'delivery_icon': 'img/brands/wolt.webp', 'delivery_label': 'Order on Wolt',
  'drink_categories': json.dumps(['Soft Drinks', 'Wine', 'Alcoholic Drinks', 'Tea']),
  'info_kicker': 'Two locations', 'info_kicker_ka': 'ორი ფილიალი',
  'info_title': 'Visit KADO', 'info_title_ka': 'გვესტუმრეთ',
  'info_text': 'Vera — 3a Napareuli St · 593 48 83 88 · open until 03:00\nSaburtalo — Gogi Gegechkori St · 593 35 53 56 · open until 02:00',
  'info_text_ka': 'ვერა — ნაფარეულის ქ. 3ა · 593 48 83 88 · 03:00-მდე\nსაბურთალო — გოგი გეგეჭკორის ქ. · 593 35 53 56 · 02:00-მდე',
  'info_directions_label': 'Directions — Vera', 'info_directions_label_ka': 'მარშრუტი — ვერა',
  'info_directions_url': VERA_MAP,
  'info_map_query': 'KADO, 3a Napareuli St, Tbilisi',
  'venue_links': json.dumps([
    {'label': 'Vera', 'label_ka': 'ვერა', 'url': VERA_MAP},
    {'label': 'Saburtalo', 'label_ka': 'საბურთალო', 'url': SAB_MAP},
    {'label': 'Wolt', 'url': 'https://wolt.com/ka/geo/tbilisi/restaurant/kado1'},
    {'label': 'Facebook', 'url': 'https://www.facebook.com/KADOtbilisi/'},
  ], ensure_ascii=False),
  'site_phone': '+995593488388', 'site_phone_display': '593 48 83 88',
}

def build(menu, ascii_safe):
    L = lambda s: lit(s, ascii_safe)
    n_items = sum(len(c['items']) for c in menu)
    n_img = sum(1 for c in menu for i in c['items'] if i['file'])
    o = [f"-- KADO digital menu + elegant_black theme. restaurant {RID} '{RSLUG}', brand {BID} '{BSLUG}'.",
         '-- Generated by scripts/generate-kado-menu-sql.py. Checked-in copy always ends in ROLLBACK.',
         'BEGIN;', '', 'DO $$', 'BEGIN',
         f"  IF NOT EXISTS (SELECT 1 FROM public.restaurants r JOIN public.brands b ON b.id = r.brand_id",
         f"                 WHERE r.id = {RID} AND r.slug = '{RSLUG}' AND r.brand_id = {BID} AND b.slug = '{BSLUG}') THEN",
         "    RAISE EXCEPTION 'KADO identity assertion failed; refusing to mutate data';", '  END IF;', 'END $$;', '',
         f'DELETE FROM public.menu_items WHERE restaurant_id = {RID};',
         f'DELETE FROM public.categories WHERE restaurant_id = {RID};', '',
         'INSERT INTO public.categories (restaurant_id, name_en, name_ka, name_ru, sort_order) VALUES']
    o.append(',\n'.join(f"  ({RID}, {L(c['cat_en'])}, {L(c['cat'])}, NULL, {k+1})" for k, c in enumerate(menu)) + ';')
    o += ['', 'WITH dishes(category_en, name_en, name_ka, description_en, description_ka, price, thumbnail_url, sort_order) AS (VALUES']
    rows = []
    for c in menu:
        for k, i in enumerate(c['items']):
            thumb = f"{ASSET}/items/{i['slug']}.webp" if i['file'] else ''
            rows.append(f"  ({L(c['cat_en'])}, {L(i['name_en'])}, {L(i['name_ka'])}, {L(i['desc_en'])}, {L(i['desc_ka'])}, "
                        f"{L(price(i['price']))}, '{thumb}', {k+1})")
    o.append(',\n'.join(rows))
    o += [')', 'INSERT INTO public.menu_items (',
          '  restaurant_id, category_id, name_en, name_ka, name_ru, description_en, description_ka, description_ru,',
          '  price, model, model_usdz, thumbnail_url, is_3d, ar_scale, thumb_3d, text_only, featured, sort_order, visible)',
          f"SELECT {RID}, c.id, d.name_en, d.name_ka, NULL, d.description_en, d.description_ka, NULL,",
          "  d.price, '', '', d.thumbnail_url, false, 1, false, false, false, d.sort_order, true",
          f'FROM dishes d JOIN public.categories c ON c.restaurant_id = {RID} AND c.name_en = d.category_en;', '']
    kv = {**THEME, **CONTENT}
    o.append('INSERT INTO public.theme_config (restaurant_id, key, value) VALUES')
    o.append(',\n'.join(f"  ({RID}, '{k}', {L(v)})" for k, v in kv.items()))
    o.append('ON CONFLICT (restaurant_id, key) DO UPDATE SET value = EXCLUDED.value;')
    o += ['', f"UPDATE public.brands SET logo_url = '{ASSET}/logo.webp', primary_color = '{RED}', secondary_color = '{RED2}' WHERE id = {BID};", '',
          'DO $$', 'BEGIN',
          f"  IF (SELECT count(*) FROM public.categories WHERE restaurant_id = {RID}) <> {len(menu)} THEN RAISE EXCEPTION 'expected {len(menu)} categories'; END IF;",
          f"  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = {RID}) <> {n_items} THEN RAISE EXCEPTION 'expected {n_items} items'; END IF;",
          f"  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = {RID} AND thumbnail_url LIKE '{ASSET}/items/%.webp') <> {n_img} THEN RAISE EXCEPTION 'expected {n_img} thumbnails'; END IF;",
          f"  IF (SELECT count(*) FROM public.menu_items WHERE restaurant_id = {RID} AND is_3d) <> 0 THEN RAISE EXCEPTION 'no 3D models exist yet'; END IF;",
          f"  IF EXISTS (SELECT 1 FROM public.menu_items m JOIN public.categories c ON c.id = m.category_id WHERE m.restaurant_id = {RID} AND c.restaurant_id <> {RID}) THEN RAISE EXCEPTION 'cross-tenant category'; END IF;",
          'END $$;', '',
          f'SELECT c.sort_order, c.name_en, count(m.id) AS items FROM public.categories c LEFT JOIN public.menu_items m ON m.category_id = c.id WHERE c.restaurant_id = {RID} GROUP BY c.id ORDER BY c.sort_order;',
          '', 'ROLLBACK;', '']
    return '\n'.join(o)

if __name__ == '__main__':
    menu = json.load(open(sys.argv[1]))
    out = ROOT / 'supabase' / 'sql'
    (out / '2026-09-25_kado_digital_menu.sql').write_text(build(menu, False))
    safe = build(menu, True)
    assert safe.isascii()
    (out / '2026-09-25_kado_digital_menu_ascii_safe.sql').write_text(safe)
    print('ok', sum(len(c['items']) for c in menu), 'items')
