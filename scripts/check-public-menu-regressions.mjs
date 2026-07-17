import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');

const cacheMatch = sw.match(/CACHE_NAME\s*=\s*'bl-v(\d+)'/);
assert.ok(cacheMatch, 'service worker cache version must use bl-vNNN format');
assert.ok(Number(cacheMatch[1]) >= 117, 'service worker cache version must be at least bl-v117');

assert.ok(html.includes("showWaiter:   'Show to staff'"), 'English basket CTA should say "Show to staff"');
assert.ok(html.includes("showWaiter:   'აჩვენეთ სერვისის თანამშრომელს'"), 'Georgian staff CTA should be preserved');
assert.ok(!html.includes('Show to waiter'), 'Old English waiter CTA should not remain in index.html');

assert.ok(html.includes('well-lit, textured table'), 'English AR guidance should mention a well-lit textured table');
assert.ok(html.includes('ტექსტურიან'), 'Georgian AR guidance should mention a textured surface/table');
assert.ok(!html.includes('Move slowly over a table or floor'), 'Old broad floor-scan AR hint should not remain');

assert.ok(html.includes('object-position: center center;'), 'Food thumbnails should force centered crops');
assert.ok(html.includes('.thumb-wrap model-viewer') && html.includes('contain: paint;'), 'Thumbnail/model stages should be paint-contained');
assert.ok(html.includes('max(12px, env(safe-area-inset-bottom'), 'Mobile 3D modal should account for safe-area bottom');
assert.ok(html.includes('@media (min-width: 640px) and (max-height: 680px)'), 'Short desktop/tablet 3D modal should keep drawer actions reachable');
assert.ok(html.includes('#modal-drawer-body {\n                grid-template-rows: 1fr;') && html.includes('bottom: min(var(--drawer-full-h, 300px), 48svh);'), 'Short 3D modal drawer should be open and capped');
assert.ok(html.includes('#modal-ar-btn {\n                order: 1;'), 'Short 3D modal drawer should prioritize the AR action');

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
assert.ok(styleMatch, 'index.html should contain an inline stylesheet');
assert.ok(!/#modal-ar-btn\s*\{[^}]*display:\s*block\b/.test(styleMatch[1]), 'CSS must not force the modal AR button visible over JS state');

assert.ok(html.includes('function _hasARForActiveGroup()'), '3D filter should be computed for the active Food/Drinks group');
assert.ok(html.includes('p.hidden = !_hasARForActiveGroup();'), '3D pill should hide when active group has no AR items');
assert.ok(html.includes('if (!_filterIsValid(cat)) cat = \'\';'), 'Invalid active filter should fall back before rendering');

assert.ok(html.includes('Pictureless dishes keep the cart button'), 'Text-only cart control regression note should remain');
assert.ok(html.includes('same cart button and variant/add-on pills as photo cards'), 'Text-only variants/add-ons behavior should remain');

console.log('Public menu regression assertions passed');
