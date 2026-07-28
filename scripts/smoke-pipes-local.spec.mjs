import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const baseUrl = process.env.PIPES_BASE_URL || 'http://127.0.0.1:3000'
const fixture = JSON.parse(readFileSync(new URL('../data/fixtures/pipes-menu.fixture.json', import.meta.url), 'utf8'))

test.use({ serviceWorkers: 'block' })

test('PIPES browser copy, featured signature selection, and localized title are stable', async ({ page }) => {
  await page.route('**/pipes-menu.fixture.json', route => {
    const body = structuredClone(fixture)
    const [firstFeatured] = body.menu_items
      .filter(item => item.visible !== false && item.featured)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.id ?? '').localeCompare(String(b.id ?? '')))
    body.menu_items = body.menu_items.map(item => {
      return item.id === firstFeatured.id
        ? { ...item, name_en: 'Renamed Stable Signature', featured: true }
        : item
    })
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
  })

  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('bl-lang', 'en')
  })
  await page.goto(`${baseUrl}/?tenant=pipes-burger-main&fixture=pipes`, { waitUntil: 'networkidle' })

  await expect(page).toHaveTitle('Pipes Burger · Fabrika Menu')
  await expect(page.locator('#pipes-location-title')).toHaveText('Find us in Fabrika')
  await expect(page.locator('.pipes-location-address')).toHaveText('Fabrika, 8 Egnate Ninoshvili Street, Tbilisi')
  await expect(page.locator('#pipes-signature-card .pipes-signature-name')).toHaveText('Renamed Stable Signature')

  await page.locator('#lang-toggle').click()
  await expect(page).toHaveTitle('პაიპს ბურგერი · ფაბრიკის მენიუ')
  await expect(page.locator('#pipes-location-title')).toHaveText('გვიპოვე ფაბრიკაში')
  await expect(page.locator('.pipes-location-address')).toHaveText('ფაბრიკა, ეგნატე ნინოშვილის ქუჩა 8, თბილისი')
})
