import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8')

test('Monday Greens alone allows Georgian and English and normalizes stale Russian', () => {
  assert.match(html, /_LANGUAGES_BY_TENANT_SLUG = \{\s*'monday-greens': \['ka', 'en'\]\s*\}/)
  assert.match(html, /_DEFAULT_LANGUAGE_BY_TENANT_SLUG = \{\s*'monday-greens': 'ka'\s*\}/)
  assert.match(html, /return _LANGUAGES_BY_TENANT_SLUG\[tenant\?\.restaurant_slug\] \|\| \['en', 'ka', 'ru'\]/)
  assert.match(html, /window\.__tenant = _tenant;\s*_normalizeLanguageForTenant\(_tenant\);/)
  assert.match(html, /localStorage\.setItem\('bl-lang', window\.__lang\)/)
  assert.match(html, /return lang === 'ka' \? 'EN' : 'ქარ'/)
  assert.match(html, /textContent\s*=\s*_languageToggleLabel\(lang\)/)
})

test('language toggle cycles the resolved tenant allowlist', () => {
  assert.match(html, /const _languages = _allowedLanguagesForTenant\(\);\s*const _to = _languages\[\(_languages\.indexOf\(_from\) \+ 1\) % _languages\.length\]/)
  assert.doesNotMatch(html, /const _to = _from === 'en' \? 'ka' : _from === 'ka' \? 'ru' : 'en'/)
})

test('service-worker cache advances exactly once from production bl-v164', () => {
  assert.equal((sw.match(/const CACHE_NAME = 'bl-v165';/g) || []).length, 1)
  assert.equal((sw.match(/bl-v165/g) || []).length, 1)
})
