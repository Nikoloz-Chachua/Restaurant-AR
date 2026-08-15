import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')

test('Chero allows Georgian and English and normalizes stale Russian', () => {
  assert.match(html, /_LANGUAGES_BY_TENANT_SLUG = \{[^}]*'chero-main': \['ka', 'en'\][^}]*\}/)
  assert.match(html, /_DEFAULT_LANGUAGE_BY_TENANT_SLUG = \{[^}]*'chero-main': 'ka'[^}]*\}/)
})

test('Chero does not disturb the default three-language allowlist', () => {
  // Any tenant not named in _LANGUAGES_BY_TENANT_SLUG still falls through to
  // the full en/ka/ru cycle -- confirms Chero's entry is additive, not a
  // change to the shared default.
  assert.match(html, /return _LANGUAGES_BY_TENANT_SLUG\[tenant\?\.restaurant_slug\] \|\| \['en', 'ka', 'ru'\]/)
})
