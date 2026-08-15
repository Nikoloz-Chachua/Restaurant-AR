import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8')

test('Monday Greens alone allows Georgian and English and normalizes stale Russian', () => {
  // _LANGUAGES_BY_TENANT_SLUG/_DEFAULT_LANGUAGE_BY_TENANT_SLUG now hold more
  // than one restricted tenant (see cheroLanguageRegression.test.mjs), so this
  // checks monday-greens' own entry rather than assuming it's the only key.
  assert.match(html, /_LANGUAGES_BY_TENANT_SLUG = \{[^}]*'monday-greens': \['ka', 'en'\][^}]*\}/)
  assert.match(html, /_DEFAULT_LANGUAGE_BY_TENANT_SLUG = \{[^}]*'monday-greens': 'ka'[^}]*\}/)
  assert.match(html, /return _LANGUAGES_BY_TENANT_SLUG\[tenant\?\.restaurant_slug\] \|\| \['en', 'ka', 'ru'\]/)
  assert.match(html, /window\.__tenant = _tenant;\s*_normalizeLanguageForTenant\(_tenant\);/)
  assert.match(html, /localStorage\.setItem\('bl-lang', window\.__lang\)/)
  assert.match(html, /textContent\s*=\s*_languageToggleLabel\(lang\)/)
})

test('language toggle label is derived from the tenant allowlist, not hardcoded per slug', () => {
  // _languageToggleLabel used to hardcode a 'monday-greens' check; it now
  // computes the next label from whatever _allowedLanguagesForTenant()
  // resolves to, so any two-language tenant (monday-greens, chero-main, ...)
  // gets a correct button label without a per-slug branch.
  assert.match(html, /function _languageToggleLabel\(lang\) \{\s*const languages = _allowedLanguagesForTenant\(\);/)
  assert.match(html, /const next = languages\[\(languages\.indexOf\(lang\) \+ 1\) % languages\.length\];/)
  assert.match(html, /return next === 'ka' \? 'ქარ' : next === 'ru' \? 'RU' : 'EN';/)
  assert.doesNotMatch(html, /_tenant\?\.restaurant_slug !== 'monday-greens'/)
})

test('language toggle cycles the resolved tenant allowlist', () => {
  assert.match(html, /const _languages = _allowedLanguagesForTenant\(\);\s*const _to = _languages\[\(_languages\.indexOf\(_from\) \+ 1\) % _languages\.length\]/)
  assert.doesNotMatch(html, /const _to = _from === 'en' \? 'ka' : _from === 'ka' \? 'ru' : 'en'/)
})

test('service-worker cache advances exactly once from bl-v165', () => {
  assert.equal((sw.match(/const CACHE_NAME = 'bl-v166';/g) || []).length, 1)
  assert.equal((sw.match(/bl-v166/g) || []).length, 1)
})
