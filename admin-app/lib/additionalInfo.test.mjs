import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

const modulePath = new URL('./additionalInfo.js', import.meta.url)

test('additional information support exists', () => {
  assert.equal(existsSync(modulePath), true, 'additionalInfo.js must exist')
})

test('additional information is enabled only for Food & Market', async () => {
  const { supportsAdditionalInfo } = await import(modulePath)
  assert.equal(supportsAdditionalInfo(73, 'food-market-main'), true)
  assert.equal(supportsAdditionalInfo(76, 'corner-by-eleven-main'), false)
  assert.equal(supportsAdditionalInfo(1, 'food-market-main'), false)
})

test('localized additional information uses safe language fallback', async () => {
  const { localizedAdditionalInfo } = await import(modulePath)
  const item = { additional_info_en: 'Contains peanuts', additional_info_ka: 'შეიცავს მიწის თხილს' }
  assert.equal(localizedAdditionalInfo(item, 'en'), 'Contains peanuts')
  assert.equal(localizedAdditionalInfo(item, 'ka'), 'შეიცავს მიწის თხილს')
  assert.equal(localizedAdditionalInfo({ additional_info_en: 'Contains peanuts', additional_info_ka: '' }, 'ka'), 'Contains peanuts')
  assert.equal(localizedAdditionalInfo({ additional_info_en: '   ', additional_info_ka: '' }, 'en'), '')
})
