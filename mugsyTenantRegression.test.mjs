import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('./assets/mugsy/manifest.json', import.meta.url), 'utf8'))
const mugsyFixture = JSON.parse(readFileSync(new URL('./data/fixtures/mugsy-menu.fixture.json', import.meta.url), 'utf8'))
const presets = readFileSync(new URL('./admin-app/lib/themePresets.ts', import.meta.url), 'utf8')
const adminUxTest = readFileSync(new URL('./admin-app/lib/adminUx.test.mjs', import.meta.url), 'utf8')

test('Mugsy public shell is exact tenant gated and keeps other tenants out', () => {
  assert.match(html, /const _MUGSY_RESTAURANT_SLUG = 'mugsy-main'/)
  assert.match(html, /const _MUGSY_BRAND_SLUG = 'mugsy'/)
  assert.match(html, /function _isMugsyTenant\(\)/)
  assert.match(html, /restaurant_slug === _MUGSY_RESTAURANT_SLUG/)
  assert.match(html, /brandSlug === _MUGSY_BRAND_SLUG/)
  assert.ok(!/\[data-template="mugsy_street_diner"\] \.mugsy-shell/.test(html), 'public Mugsy shell must not be gated only by reusable template_key')
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.mugsy-shell/)
})

test('reusable fast-casual shell has neutral boot accessibility and resolved tenant identity', () => {
  assert.match(html, /<section class="mugsy-shell" aria-label="Restaurant menu">/)
  assert.match(html, /const shell = document\.querySelector\('\.mugsy-shell'\);\s*if \(shell\) shell\.setAttribute\('aria-label', _localizedBrandTitle\(\) \|\| 'Restaurant menu'\);/)
})

test('Mugsy fixture is localhost-only, explicit, dynamic, and not precached', () => {
  assert.match(html, /function _mugsyFixtureRequested\(\)/)
  assert.match(html, /_tenantSlugFromHost\(\) === _MUGSY_RESTAURANT_SLUG/)
  assert.match(html, /get\('fixture'\) === 'mugsy'/)
  assert.match(html, /fetch\('\.\/data\/fixtures\/mugsy-menu\.fixture\.json'/)
  assert.ok(!sw.includes('./data/fixtures/mugsy-menu.fixture.json'), 'Mugsy visual fixture must not be precached')
})

test('Mugsy copy, ordering, locations, and delivery links are theme-config driven', () => {
  assert.match(html, /const _MUGSY_COPY_TOKENS = \{/)
  assert.match(html, /mugsy_order_links/)
  assert.match(html, /mugsy_locations/)
  assert.match(html, /https:\/\/wolt\.com\/en\/geo\/tbilisi\/restaurant\/magsys-burger/)
  assert.match(html, /https:\/\/glovoapp\.com\/en\/ge\/tbilisi\/stores\/mugsy-s-burger-tbi/)
  assert.match(html, /Petre Melikishvili/)
  assert.match(html, /Vazha Pshavela/)
  assert.ok(!/tel:/.test(html), 'Mugsy shell must not invent a phone link')
})

test('Mugsy footer signature is centered and BetaReal-linked only for the exact tenant', () => {
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.site-footer \{\s*max-width: 1180px;\s*align-items: center;\s*text-align: center;/)
  assert.match(html, /function _applyMugsyFooterBrandLink\(\)/)
  assert.match(html, /if \(!_isMugsyTenant\(\)\) return;[\s\S]*?link\.href = 'https:\/\/betareal\.ge';[\s\S]*?link\.setAttribute\('aria-label', 'Visit BetaReal'\);/)
  assert.match(html, /footer\.insertBefore\(link, logos\[0\]\);[\s\S]*?logos\.forEach\(logo => link\.appendChild\(logo\)\);/)
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.footer-brand-link:focus-visible/)
  assert.doesNotMatch(html, /\[data-template="mugsy_street_diner"\] \.site-footer/)
  assert.doesNotMatch(html, /<a[^>]+href="https:\/\/betareal\.ge"[\s\S]*?<img class="footer-logo/)
  assert.doesNotMatch(html, /id="mugsy-footer-links"/)
  assert.doesNotMatch(html, /renderOrders\('mugsy-footer-links'\)/)
  assert.match(html, /<a class="footer-email" href="mailto:betareal\.ar@gmail\.com">betareal\.ar@gmail\.com<\/a>/)
})

test('Mugsy delivery services render from config into a local-asset side rail', () => {
  assert.match(html, /<nav id="mugsy-delivery-rail" class="mugsy-delivery-rail" aria-label="Delivery services" hidden><\/nav>/)
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.mugsy-delivery-rail \{[\s\S]*?position: fixed;[\s\S]*?top: 50svh;[\s\S]*?transform: translateY\(-50%\);/)
  assert.match(html, /@media \(min-width: 768px\) \{[\s\S]*?\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.mugsy-delivery-rail \{[\s\S]*?display: flex;/)
  assert.match(html, /const _MUGSY_DELIVERY_ICONS = \{[\s\S]*?wolt: '\.\/assets\/mugsy\/deliveries\/wolt\.jpg'[\s\S]*?glovo: '\.\/assets\/mugsy\/deliveries\/glovo\.png'/)
  assert.match(html, /function _applyMugsyCopy\(\)[\s\S]*?const orders = _parseConfigList\(cfg\.mugsy_order_links\);[\s\S]*?const orderLinks = orders\.length \? orders[\s\S]*?_demo \? _DEMO_ORDER_LINKS : _MUGSY_DEFAULT_ORDER_LINKS/)
  assert.match(html, /const renderDeliveryRail = \(\) => \{[\s\S]*?window\.matchMedia\('\(min-width: 768px\)'\)\.matches[\s\S]*?rail\.hidden = true;[\s\S]*?return;/)
  assert.match(html, /const renderDeliveryRail = \(\) => \{[\s\S]*?const safe = _safeAssetUrl\(link\.url\);[\s\S]*?const icon = _MUGSY_DELIVERY_ICONS\[key\];[\s\S]*?a\.href = safe;[\s\S]*?img\.src = icon;/)
  assert.match(html, /https:\/\/wolt\.com\/en\/geo\/tbilisi\/restaurant\/magsys-burger/)
  assert.match(html, /https:\/\/glovoapp\.com\/en\/ge\/tbilisi\/stores\/mugsy-s-burger-tbi/)
  assert.ok(manifest.assets.some(asset =>
    asset.role === 'delivery_icon' &&
    asset.service === 'Wolt' &&
    asset.source_url === 'https://mugsy.ge/storage/deliveries/01KKBKA1ZAXQXHBJ9APHZ4TGN7.jpg' &&
    asset.local_path === 'assets/mugsy/deliveries/wolt.jpg'
  ))
  assert.ok(manifest.assets.some(asset =>
    asset.role === 'delivery_icon' &&
    asset.service === 'Glovo' &&
    asset.source_url === 'https://mugsy.ge/storage/deliveries/01KKBKB42ZBBQYEXT1BYAP8GDK.png' &&
    asset.local_path === 'assets/mugsy/deliveries/glovo.png'
  ))
})

test('Mugsy menu cards remain data sourced and photo-only items do not advertise AR', () => {
  assert.match(html, /menu_items\?select=\*,categories\(name_en,name_ka\)&restaurant_id=eq\.\$\{tenant\.restaurant_id\}/)
  assert.match(html, /A real resolved tenant with no menu items should stay empty/)
  assert.match(html, /Mugsy has not published menu items here yet/)
  assert.match(html, /const has3d = _isAREnabledMenuItem\(item\)/)
  assert.match(html, /\$\{has3d \? `<button class="ar-btn"/)
  assert.doesNotMatch(html, /Mugsy (Featured|Popular)|Featured Mugsy|Popular Mugsy/i)
})

test('Mugsy exact tenant forces phone twin product cards without changing larger breakpoints', () => {
  assert.match(html, /@media \(max-width: 699px\) \{[\s\S]*?\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.menu-list \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.category-header,[\s\S]*?\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.mugsy-empty \{[\s\S]*?grid-column: 1 \/ -1;/)
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.menu-item:not\(\.no-image\) \.thumb-wrap \{[\s\S]*?aspect-ratio: 1 \/ 0\.82;[\s\S]*?border-radius: 14px 14px 0 0;/)
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.menu-item:not\(\.no-image\) \.thumb-img,[\s\S]*?object-fit: cover;[\s\S]*?object-position: center center;/)
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.menu-item:not\(\.no-image\) \.qty-add-btn \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/)
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.menu-item:not\(\.no-image\) \.ar-btn \{[\s\S]*?min-height: 44px;[\s\S]*?white-space: normal;/)
  assert.match(html, /\(cfg\.phone_layout === 'twin' \|\| _isMugsyTenant\(\)\) \? 'twin' : 'list'/)
  assert.match(html, /@media \(min-width: 700px\) \{[\s\S]*?\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.menu-list,[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
})

test('Mugsy theme persistence is tenant scoped and ignores stale global night', () => {
  assert.match(html, /mugsyScopedKey = bootSlug === 'mugsy-main' \? `bl-theme:\$\{bootSlug\}` : ''/)
  assert.match(html, /document\.documentElement\.setAttribute\('data-theme',\s*\(mugsyScopedTheme === 'day' \|\| mugsyScopedTheme === 'night'\) \? mugsyScopedTheme : \(defaults\.theme \|\| 'day'\)\)/)
  assert.match(html, /function _mugsyScopedThemeKey\(\)[\s\S]*?return `bl-theme:\$\{_MUGSY_RESTAURANT_SLUG\}`;/)
  assert.match(html, /localStorage\.setItem\(_isMugsyThemeScope\(\) \? _mugsyScopedThemeKey\(\) : 'bl-theme', theme\)/)
  assert.match(html, /_tenantSlugFromHost\(\) === _MUGSY_RESTAURANT_SLUG \? 'day' : 'night'/)
  assert.doesNotMatch(html, /localStorage\.setItem\('bl-theme', theme\);/)
})

test('Mugsy day/night CSS is scoped to the Mugsy tenant slug and covers full journey surfaces', () => {
  assert.match(html, /\[data-theme="night"\]\[data-tenant="mugsy-main"\]\[data-template="mugsy_street_diner"\] \{/)
  assert.match(html, /\[data-theme="day"\]\[data-tenant="mugsy-main"\]\[data-template="mugsy_street_diner"\] \{/)
  assert.doesNotMatch(html, /\[data-theme="night"\]\[data-template="mugsy_street_diner"\] \{/)
  for (const token of [
    '--mugsy-bg-image',
    '--mugsy-topbar-bg',
    '--mugsy-catbar-bg',
    '--mugsy-card-bg',
    '--mugsy-thumb',
    '--mugsy-modal-bg-image',
    '--mugsy-empty-bg',
    '--mugsy-focus',
  ]) {
    assert.ok(html.includes(token), `missing ${token}`)
  }
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] #basket-panel/)
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] #img-lightbox\.has-panel/)
  assert.match(html, /\[data-theme="night"\]\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.footer-logo-white/)
})

test('Mugsy hero copy describes the interactive BetaReal menu without claiming current AR', () => {
  assert.match(html, /interactive BetaReal menu experience/)
  assert.match(html, /BetaReal-ის ინტერაქტიული მენიუს გამოცდილება/)
  assert.doesNotMatch(html, /AR-ready BetaReal menu experience/)
  assert.doesNotMatch(html, /BetaReal-ის AR მენიუს გამოცდილება/)
})

test('Mugsy street-diner template is superadmin-loadable and tenant admins stay restricted', () => {
  assert.match(presets, /\| 'mugsy_street_diner'/)
  assert.match(presets, /key: 'mugsy_street_diner'/)
  assert.match(presets, /label: 'Mugsy Street Diner'/)
  assert.match(adminUxTest, /theme templates are superadmin-only/)
  assert.match(adminUxTest, /brand_owner'\)\.map\(tab => tab\.id\), \['night', 'day', 'background', 'fonts', 'branding'\]/)
})

test('service-worker cache was bumped for changed public assets', () => {
  const cacheMatch = sw.match(/CACHE_NAME\s*=\s*'bl-v(\d+)'/)
  assert.ok(cacheMatch, 'service worker cache version must use bl-vNNN format')
  assert.ok(Number(cacheMatch[1]) >= 135, 'Mugsy delivery rail runtime changes require a bl-v135+ cache')
  assert.match(sw, /\.\/assets\/mugsy\/logo\.svg/)
  assert.match(sw, /\.\/assets\/mugsy\/hero-/)
  assert.match(sw, /\.\/assets\/mugsy\/deliveries\/wolt\.jpg/)
  assert.match(sw, /\.\/assets\/mugsy\/deliveries\/glovo\.png/)
  assert.doesNotMatch(sw, /\.\/assets\/mugsy\/items-webp\//, 'Mugsy product thumbnails must lazy-load through runtime cache')
})

test('service-worker cache advances once beyond the rebased production line', () => {
  const cacheMatch = sw.match(/^const CACHE_NAME = 'bl-v(\d+)';$/m)
  assert.ok(cacheMatch, 'service worker CACHE_NAME must be declared as bl-vNNN')
  assert.ok(Number(cacheMatch[1]) >= 144, 'PIPES public asset changes must use bl-v144+ so this build is beyond production bl-v143')
})

test('Mugsy basket rows render dynamic item thumbnails without affecting other tenants', () => {
  const cheesy = mugsyFixture.menu_items.find(item => item.id === 'mugsy-cheesy')
  assert.equal(cheesy?.thumbnail_url, './assets/mugsy/items-webp/cheesy.webp')

  assert.match(html, /function _basketCurrentItem\(entry, key\)/)
  assert.match(html, /const current = Number\.isFinite\(idx\) \? menuItems\[idx\] : null/)
  assert.match(html, /function _basketItemMediaHtml\(entry, key, altText\)/)
  assert.match(html, /_safeAssetUrl\(item && item\.thumbnail_url\)/)
  assert.match(html, /class="basket-item-thumb" src="\$\{_escapeHtml\(src\)\}" alt="\$\{_escapeHtml\(altText\)\}" loading="eager" decoding="async"/)
  assert.match(html, /onerror="this\.closest\('\.basket-item-media'\)\?\.remove\(\)"/)
  assert.match(html, /const mediaHtml = _isMugsyTenant\(\) \? _basketItemMediaHtml\(entry, key, itemName\) : ''/)
  assert.match(html, /\[data-tenant="mugsy-main"\]\[data-brand-slug="mugsy"\] \.basket-item-media/)
  assert.doesNotMatch(html, /\[data-template="mugsy_street_diner"\] \.basket-item-media/)
  assert.doesNotMatch(html, /\[data-template="monday_greens"\][^{]*\.basket-item-media/)
  assert.doesNotMatch(html, /\[data-template="baoma"\][^{]*\.basket-item-media/)
})
