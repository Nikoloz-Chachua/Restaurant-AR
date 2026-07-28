import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const restaurantId = 62
const restaurantSlug = 'pipes-burger-main'
const restaurantName = 'Pipes Burger'
const brandId = 56
const brandSlug = 'pipes-burger'
const brandName = 'Pipes Burger'
const fixturePath = 'data/fixtures/pipes-menu.fixture.json'
const manifestPath = 'assets/pipes/manifest.json'
const assetDir = 'assets/pipes/items-webp'
const sqlPath = 'supabase/sql/2026-07-28_pipes_menu_import.sql'
const asciiSqlPath = 'supabase/sql/2026-07-28_pipes_menu_import_ascii_safe.sql'

const en = JSON.parse(readFileSync('data/research/pipes/wolt-assortment-en.json', 'utf8'))
const ka = JSON.parse(readFileSync('data/research/pipes/wolt-assortment-ka.json', 'utf8'))

mkdirSync(assetDir, { recursive: true })

const kaCategoryById = new Map(ka.categories.map(category => [category.id, category]))
const enItemById = new Map(en.items.map(item => [item.id, item]))
const kaItemById = new Map(ka.items.map(item => [item.id, item]))

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatPrice(tetri) {
  const gel = Number(tetri) / 100
  return Number.isInteger(gel) ? `${gel} ₾` : `${gel.toFixed(2).replace(/0$/, '')} ₾`
}

function normalizeCategory(enCategory, kaCategory) {
  const kaName = cleanText(kaCategory?.name)
  const enName = cleanText(enCategory.name)
  if (enName === 'Sides' && kaName === 'სოუსები') return 'Sauces'
  if (enName === 'Side') return 'Sides'
  if (enName === 'Drinks') return 'Drinks'
  return enName
}

function imageUrl(item) {
  return item.images?.[0]?.url || ''
}

function webpPathFor(item) {
  const base = slugify(item.name) || item.id
  return `${assetDir}/${base}.webp`
}

async function downloadAndConvert(sourceUrl, localPath) {
  if (existsSync(localPath)) return
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`failed to fetch ${sourceUrl}: ${response.status}`)
  const input = new Uint8Array(await response.arrayBuffer())
  const tmp = `${localPath}.source-${basename(new URL(sourceUrl).pathname)}`
  writeFileSync(tmp, input)
  const result = spawnSync('ffmpeg', [
    '-y',
    '-loglevel', 'error',
    '-i', tmp,
    '-vf', 'scale=960:-2',
    '-c:v', 'libwebp',
    '-quality', '82',
    localPath,
  ], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${sourceUrl}`)
  unlinkSync(tmp)
}

const categories = en.categories.map((category, index) => {
  const kaCategory = kaCategoryById.get(category.id)
  return {
    source_id: category.id,
    name_en: normalizeCategory({ ...category, name: cleanText(category.name) }, kaCategory),
    name_ka: cleanText(kaCategory?.name || category.name),
    sort_order: index + 1,
  }
})

const categoryBySourceId = new Map(categories.map(category => [category.source_id, category]))
const itemCategory = new Map()
for (const category of en.categories) {
  for (const id of category.item_ids) itemCategory.set(id, categoryBySourceId.get(category.id))
}

const manifestAssets = []
const menuItems = []
let sortOrder = 1
for (const category of en.categories) {
  for (const itemId of category.item_ids) {
    const itemEn = enItemById.get(itemId)
    const itemKa = kaItemById.get(itemId)
    if (!itemEn) throw new Error(`missing EN item ${itemId}`)
    const categoryRow = itemCategory.get(itemId)
    const sourceUrl = imageUrl(itemEn)
    const localPath = sourceUrl ? webpPathFor(itemEn) : ''
    if (sourceUrl) {
      await downloadAndConvert(sourceUrl, localPath)
      manifestAssets.push({
        id: itemId,
        role: cleanText(itemEn.name) === 'Pipes Signature Burger' ? 'hero_signature_item' : 'menu_item',
        item_name_en: cleanText(itemEn.name),
        item_name_ka: cleanText(itemKa?.name),
        source_url: sourceUrl,
        local_path: localPath,
      })
    }
    menuItems.push({
      name_en: cleanText(itemEn.name),
      name_ka: cleanText(itemKa?.name || itemEn.name),
      description_en: cleanText(itemEn.description),
      description_ka: cleanText(itemKa?.description),
      price: formatPrice(itemEn.price),
      price_old: '',
      category_name_en: categoryRow.name_en,
      category_name_ka: categoryRow.name_ka,
      sort_order: sortOrder++,
      visible: true,
      model: '',
      model_usdz: '',
      ar_scale: 1,
      thumbnail_url: localPath ? `./${localPath}` : '',
      thumb_3d: false,
      is_3d: false,
      text_only: !localPath,
      featured: ['Pipes Signature Burger', 'Burgazm'].includes(cleanText(itemEn.name)),
      addons: [],
      variants: [],
    })
  }
}

const fixture = {
  restaurant: {
    id: restaurantId,
    slug: restaurantSlug,
    name: restaurantName,
    brand_id: brandId,
    brands: {
      id: brandId,
      slug: brandSlug,
      name: brandName,
      plan: 'ar_menu',
    },
  },
  categories: categories.map(({ source_id, ...category }) => ({
    id: 920000 + category.sort_order,
    restaurant_id: restaurantId,
    ...category,
  })),
  menu_items: menuItems.map((item, index) => ({
    id: 921000 + index,
    restaurant_id: restaurantId,
    category_id: 920000 + categories.find(category => category.name_en === item.category_name_en).sort_order,
    categories: {
      name_en: item.category_name_en,
      name_ka: item.category_name_ka,
    },
    ...item,
  })),
  theme_config: themeRows(),
  provenance: {
    source: 'Wolt legacy assortment snapshots checked into data/research/pipes',
    source_files: [
      'data/research/pipes/wolt-assortment-en.json',
      'data/research/pipes/wolt-assortment-ka.json',
    ],
    notes: [
      'Venue availability/order links are intentionally not imported.',
      'English Wolt category "Sides" is normalized to "Sauces" because Georgian source category is "სოუსები".',
      'No GLB/USDZ models are present in source data, so all rows are photo/text-only.',
    ],
  },
}

const manifest = {
  tenant: restaurantSlug,
  brand: brandSlug,
  generated_from: fixture.provenance.source_files,
  assets: manifestAssets,
}

writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
writeFileSync(sqlPath, buildSql(false))
writeFileSync(asciiSqlPath, buildSql(true))

console.log(`PIPES artifacts generated: ${categories.length} categories, ${menuItems.length} items, ${manifestAssets.length} images`)

function themeRows() {
  return [
    ['template_key', 'pipes_fabrika'],
    ['default_theme', 'day'],
    ['site_name', 'Pipes Burger'],
    ['site_name_ka', 'პაიპს ბურგერი'],
    ['hero_kicker', 'Fabrika burger joint'],
    ['hero_kicker_ka', 'ბურგერები ფაბრიკაში'],
    ['hero_copy', 'BURGERS. FRIENDS. FABRIKA.'],
    ['hero_copy_ka', 'ბურგერი. მეგობრები. ფაბრიკა.'],
    ['hero_cta', 'Menu'],
    ['hero_cta_ka', 'მენიუ'],
    ['info_kicker', 'Location'],
    ['info_kicker_ka', 'ლოკაცია'],
    ['info_title', 'Find us in Fabrika'],
    ['info_title_ka', 'გვიპოვე ფაბრიკაში'],
    ['location_address', 'Fabrika, 8 Egnate Ninoshvili Street, Tbilisi'],
    ['location_address_ka', 'ფაბრიკა, ეგნატე ნინოშვილის ქუჩა 8, თბილისი'],
    ['info_text', 'PIPES Burger Joint at Fabrika. Compact casual seating with warm brick, concrete, wood and black metal.'],
    ['info_text_ka', 'PIPES Burger Joint ფაბრიკაში. თბილი აგური, ბეტონი, ხე და შავი მეტალის დეტალები.'],
    ['info_directions_label', 'Directions'],
    ['info_directions_label_ka', 'მიმართულება'],
    ['info_directions_url', 'https://www.google.com/maps/dir/?api=1&destination=41.7095131,44.8025001&destination_place_id=PIPES%20Burger%20Joint'],
    ['hero_image_url', './assets/pipes/items-webp/pipes-signature-burger.webp'],
    ['document_title_suffix', 'Fabrika Menu'],
    ['document_title_suffix_ka', 'ფაბრიკის მენიუ'],
  ].map(([key, value]) => ({ key, value }))
}

function jsonBlock(value, asciiSafe) {
  const json = JSON.stringify(value, null, 2)
  if (!asciiSafe) return json
  return json.replace(/[^\x00-\x7F]/g, ch => {
    const cp = ch.codePointAt(0)
    if (cp <= 0xffff) return `\\u${cp.toString(16).padStart(4, '0')}`
    const hi = Math.floor((cp - 0x10000) / 0x400) + 0xd800
    const lo = ((cp - 0x10000) % 0x400) + 0xdc00
    return `\\u${hi.toString(16)}\\u${lo.toString(16)}`
  })
}

function buildSql(asciiSafe) {
  const cats = categories.map(({ source_id, ...category }) => category)
  const items = menuItems.map(({ category_name_ka, ...item }) => item)
  const theme = themeRows()
  return `-- Pipes Burger official menu import - brand_id ${brandId} / restaurant_id ${restaurantId}.
-- Sources: checked-in Wolt legacy assortment snapshots in data/research/pipes, used for menu content provenance only.
-- Default safety is ROLLBACK. To execute after review, change only the final line from ROLLBACK; to COMMIT;

BEGIN;

do $$
declare
  v_restaurant record;
begin
  select r.id, r.slug, r.name, r.brand_id, b.slug as brand_slug
    into v_restaurant
    from public.restaurants r
    join public.brands b on b.id = r.brand_id
   where r.id = ${restaurantId}
     and r.slug = '${restaurantSlug}'
     and r.brand_id = ${brandId}
     and b.slug = '${brandSlug}';

  if not found then
    raise exception 'PIPES identity assertion failed for restaurant %, slug %, brand %, brand slug %',
      ${restaurantId}, '${restaurantSlug}', ${brandId}, '${brandSlug}';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'menu_items' and column_name = 'price_old'
  ) then
    raise exception 'menu_items.price_old is missing - apply 2026-07-28_menu_item_price_old.sql first';
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'menu_items' and column_name = 'featured'
  ) then
    raise exception 'menu_items.featured is missing - apply 2026-07-28_menu_item_featured.sql first';
  end if;
end $$;

delete from public.menu_items where restaurant_id = ${restaurantId};
delete from public.categories where restaurant_id = ${restaurantId};

with src as (
  select *
  from jsonb_to_recordset($pipes_categories$${jsonBlock(cats, asciiSafe)}$pipes_categories$::jsonb)
    as t(name_en text, name_ka text, sort_order int)
)
insert into public.categories (restaurant_id, name_en, name_ka, sort_order)
select ${restaurantId}, src.name_en, src.name_ka, src.sort_order
from src
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka,
    sort_order = excluded.sort_order;

with src as (
  select *
  from jsonb_to_recordset($pipes_items$${jsonBlock(items, asciiSafe)}$pipes_items$::jsonb)
    as t(
      name_en text,
      name_ka text,
      description_en text,
      description_ka text,
      price text,
      price_old text,
      category_name_en text,
      sort_order int,
      visible boolean,
      model text,
      model_usdz text,
      ar_scale numeric,
      thumbnail_url text,
      thumb_3d boolean,
      is_3d boolean,
      text_only boolean,
      featured boolean,
      addons jsonb,
      variants jsonb
    )
)
insert into public.menu_items (
  restaurant_id,
  name_en,
  name_ka,
  description_en,
  description_ka,
  price,
  price_old,
  category_id,
  sort_order,
  visible,
  model,
  model_usdz,
  ar_scale,
  thumbnail_url,
  thumb_3d,
  is_3d,
  text_only,
  featured,
  addons,
  variants
)
select
  ${restaurantId},
  src.name_en,
  src.name_ka,
  src.description_en,
  src.description_ka,
  src.price,
  src.price_old,
  c.id,
  src.sort_order,
  src.visible,
  src.model,
  src.model_usdz,
  src.ar_scale,
  src.thumbnail_url,
  src.thumb_3d,
  src.is_3d,
  src.text_only,
  src.featured,
  src.addons,
  src.variants
from src
join public.categories c
  on c.restaurant_id = ${restaurantId}
 and c.name_en = src.category_name_en
on conflict (restaurant_id, name_en) do update
set name_ka = excluded.name_ka,
    description_en = excluded.description_en,
    description_ka = excluded.description_ka,
    price = excluded.price,
    price_old = excluded.price_old,
    category_id = excluded.category_id,
    sort_order = excluded.sort_order,
    visible = excluded.visible,
    model = excluded.model,
    model_usdz = excluded.model_usdz,
    ar_scale = excluded.ar_scale,
    thumbnail_url = excluded.thumbnail_url,
    thumb_3d = excluded.thumb_3d,
    is_3d = excluded.is_3d,
    text_only = excluded.text_only,
    featured = excluded.featured,
    addons = excluded.addons,
    variants = excluded.variants;

with src as (
  select *
  from jsonb_to_recordset($pipes_theme$${jsonBlock(theme, asciiSafe)}$pipes_theme$::jsonb)
    as t(key text, value text)
)
insert into public.theme_config (restaurant_id, key, value)
select ${restaurantId}, src.key, src.value
from src
on conflict (restaurant_id, key) do update
set value = excluded.value;

do $$
declare
  v_category_count int;
  v_item_count int;
  v_image_count int;
begin
  select count(*) into v_category_count from public.categories where restaurant_id = ${restaurantId};
  select count(*) into v_item_count from public.menu_items where restaurant_id = ${restaurantId};
  select count(*) into v_image_count from public.menu_items where restaurant_id = ${restaurantId} and coalesce(thumbnail_url, '') <> '';

  if v_category_count <> 5 then
    raise exception 'expected 5 PIPES categories, found %', v_category_count;
  end if;
  if v_item_count <> 27 then
    raise exception 'expected 27 PIPES menu items, found %', v_item_count;
  end if;
  if v_image_count <> 14 then
    raise exception 'expected 14 PIPES image-backed items, found %', v_image_count;
  end if;
end $$;

ROLLBACK;
`
}
