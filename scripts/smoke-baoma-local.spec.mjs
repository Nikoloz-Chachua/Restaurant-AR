import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.env.BAOMA_SMOKE_BASE || 'http://127.0.0.1:4174'
const outDir = 'tmp/baoma-smoke'
mkdirSync(outDir, { recursive: true })

test.setTimeout(150000)

async function collectErrors(page) {
  const errors = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', err => errors.push(err.message))
  return errors
}

async function scrollThroughPage(page) {
  const height = page.viewportSize()?.height || 800
  const total = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y <= total; y += Math.max(240, height - 120)) {
    await page.evaluate(scrollY => window.scrollTo(0, scrollY), y)
    await page.waitForTimeout(180)
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(350)
  await page.waitForFunction(() => {
    const dishImages = [...document.querySelectorAll('.menu-item:not(.no-image) .thumb-img')]
    const info = document.querySelector('.baoma-info-img')
    const imgs = info ? dishImages.concat(info) : dishImages
    return imgs.length > 0 && imgs.every(img => img.complete && img.naturalWidth > 0)
  }, null, { timeout: 10000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(250)
}

async function loadedImageCounts(page) {
  return page.evaluate(() => ({
    dishImages: [...document.querySelectorAll('.menu-item:not(.no-image) .thumb-img')].length,
    loadedDishImages: [...document.querySelectorAll('.menu-item:not(.no-image) .thumb-img')]
      .filter(img => img.complete && img.naturalWidth > 0).length,
    textPlaceholders: document.querySelectorAll('.menu-item.no-image .thumb-wrap, .menu-item.no-image img').length,
    infoLoaded: (() => {
      const img = document.querySelector('.baoma-info-img')
      return !!img && img.complete && img.naturalWidth > 0
    })()
  }))
}

function watchFixtureRequests(page) {
  const requests = []
  page.on('request', req => {
    if (req.url().includes('/data/fixtures/baoma-menu.fixture.json')) requests.push(req.url())
  })
  return requests
}

test('BAOMA fixture renders, opens details, switches language, and does not leak', async ({ browser }) => {
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, serviceWorkers: 'block' })
  const mobile = await mobileContext.newPage()
  await mobile.addInitScript(() => localStorage.clear())
  const mobileFixtureRequests = watchFixtureRequests(mobile)
  let errors = await collectErrors(mobile)
  await mobile.goto(`${base}/?tenant=b-main&fixture=baoma`, { waitUntil: 'domcontentloaded' })
  await mobile.waitForSelector('.menu-item')
  await scrollThroughPage(mobile)

  const mobileCounts = await mobile.evaluate(() => ({
    items: window.__menuItems?.length || 0,
    categories: window.__categories?.length || 0,
    photos: [...document.querySelectorAll('.menu-item:not(.no-image)')].length,
    arButtons: document.querySelectorAll('.ar-btn').length,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    tenant: document.documentElement.dataset.tenant,
    phoneLayout: document.documentElement.dataset.phoneLayout
  }))
  expect(mobileCounts).toEqual({
    items: 155,
    categories: 16,
    photos: 22,
    arButtons: 0,
    overflow: false,
    tenant: 'b-main',
    phoneLayout: 'twin'
  })
  expect(mobileFixtureRequests.length).toBe(1)
  await expect(mobile.locator('.menu-item').first()).toHaveCSS('display', 'grid')
  expect(await mobile.evaluate(() => getComputedStyle(document.querySelector('.menu-list')).gridTemplateColumns.split(' ').length)).toBe(1)
  expect(await loadedImageCounts(mobile)).toEqual({ dishImages: 22, loadedDishImages: 22, textPlaceholders: 0, infoLoaded: true })
  expect(errors).toEqual([])
  await mobile.screenshot({ path: `${outDir}/baoma-fixture-390x844.png`, fullPage: true })

  await mobile.locator('.menu-item:not(.no-image)').first().click()
  await mobile.waitForSelector('#img-lightbox.open.has-panel')
  await expect(mobile.locator('#lightbox-close')).toBeFocused()
  await expect(mobile.locator('#lightbox-img')).toHaveAttribute('src', /img\/baoma\/dishes\//)
  await expect(mobile.locator('#lightbox-price')).toContainText('₾')
  await expect(mobile.locator('#img-lightbox .ar-btn')).toHaveCount(0)
  await expect(mobile.locator('#lightbox-qty .qty-add-btn')).toBeVisible()
  await mobile.waitForTimeout(350)
  await mobile.screenshot({ path: `${outDir}/baoma-detail-photo-mobile-390x844.png`, fullPage: false })
  await mobile.keyboard.press('Escape')
  await expect(mobile.locator('#img-lightbox')).not.toHaveClass(/open/)

  await mobile.locator('.menu-item.no-image').first().click()
  await mobile.waitForSelector('#img-lightbox.open.has-panel.no-photo')
  await expect(mobile.locator('#lightbox-close')).toBeFocused()
  await expect(mobile.locator('#lightbox-name')).not.toHaveText('')
  await expect(mobile.locator('#lightbox-price')).toContainText('₾')
  await expect(mobile.locator('#lightbox-img')).not.toBeVisible()
  await expect(mobile.locator('#img-lightbox .ar-btn')).toHaveCount(0)
  await expect(mobile.locator('#lightbox-qty .qty-add-btn')).toBeVisible()
  await mobile.waitForTimeout(350)
  await mobile.screenshot({ path: `${outDir}/baoma-detail-text-mobile-390x844.png`, fullPage: false })
  await mobile.keyboard.press('Escape')
  await expect(mobile.locator('#img-lightbox')).not.toHaveClass(/open/)

  await mobile.locator('.group-btn[data-group="drink"]').click()
  await mobile.locator('.menu-item', { hasText: 'თეთრი მშრალი' }).click()
  await mobile.waitForSelector('#img-lightbox.open.has-panel.no-photo')
  await expect(mobile.locator('#lightbox-options .variant')).toHaveCount(4)
  await mobile.locator('#lightbox-options .variant', { hasText: '1.5 ლ' }).click()
  await expect(mobile.locator('#lightbox-price')).toContainText('60 ₾')
  await mobile.locator('#lightbox-qty .qty-add-btn').click()
  await mobile.keyboard.press('Escape')
  await expect(mobile.locator('#basket-bar')).toHaveClass(/visible/)
  await mobile.locator('#basket-bar').click()
  await expect(mobile.locator('#basket-panel')).toHaveClass(/active/)
  await expect(mobile.locator('#basket-items')).toContainText('1.5 ლ')
  await expect(mobile.locator('#basket-total')).toContainText('60')
  await mobile.locator('#basket-close').click()

  await mobile.locator('#lang-toggle').click()
  await mobile.waitForTimeout(300)
  expect(await mobile.evaluate(() => document.documentElement.lang)).toBe('en')

  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, serviceWorkers: 'block' })
  const desktop = await desktopContext.newPage()
  await desktop.addInitScript(() => localStorage.clear())
  const desktopFixtureRequests = watchFixtureRequests(desktop)
  errors = await collectErrors(desktop)
  await desktop.goto(`${base}/?tenant=b-main&fixture=baoma`, { waitUntil: 'domcontentloaded' })
  await desktop.waitForSelector('.menu-item')
  await scrollThroughPage(desktop)
  expect(await desktop.evaluate(() => ({
    items: window.__menuItems?.length || 0,
    categories: window.__categories?.length || 0,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    arButtons: document.querySelectorAll('.ar-btn').length
  }))).toEqual({ items: 155, categories: 16, overflow: false, arButtons: 0 })
  expect(desktopFixtureRequests.length).toBe(1)
  expect(await loadedImageCounts(desktop)).toEqual({ dishImages: 22, loadedDishImages: 22, textPlaceholders: 0, infoLoaded: true })
  expect(errors).toEqual([])
  await desktop.screenshot({ path: `${outDir}/baoma-fixture-1280x720.png`, fullPage: true })
  await desktop.locator('.menu-item:not(.no-image)').first().click()
  await desktop.waitForSelector('#img-lightbox.open.has-panel')
  await expect(desktop.locator('#lightbox-close')).toBeFocused()
  await expect(desktop.locator('#lightbox-img')).toHaveAttribute('src', /img\/baoma\/dishes\//)
  await expect(desktop.locator('#img-lightbox .ar-btn')).toHaveCount(0)
  await desktop.waitForTimeout(350)
  await desktop.screenshot({ path: `${outDir}/baoma-detail-photo-desktop-1280x720.png`, fullPage: false })
  await desktop.keyboard.press('Escape')
  await expect(desktop.locator('#img-lightbox')).not.toHaveClass(/open/)

  const noFixtureContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, serviceWorkers: 'block' })
  const noFixture = await noFixtureContext.newPage()
  await noFixture.addInitScript(() => localStorage.clear())
  const noFixtureRequests = watchFixtureRequests(noFixture)
  errors = await collectErrors(noFixture)
  await noFixture.goto(`${base}/?tenant=b-main`, { waitUntil: 'domcontentloaded' })
  await noFixture.waitForSelector('.baoma-empty')
  expect(await noFixture.evaluate(() => ({
    items: window.__menuItems?.length || 0,
    tenant: document.documentElement.dataset.tenant
  }))).toEqual({ items: 0, tenant: 'b-main' })
  expect(noFixtureRequests).toEqual([])
  expect(errors).toEqual([])

  const defaultContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, serviceWorkers: 'block' })
  const defaultRoute = await defaultContext.newPage()
  await defaultRoute.addInitScript(() => localStorage.clear())
  const defaultFixtureRequests = watchFixtureRequests(defaultRoute)
  errors = await collectErrors(defaultRoute)
  await defaultRoute.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
  await defaultRoute.waitForTimeout(500)
  expect(await defaultRoute.evaluate(() => ({
    tenant: document.documentElement.dataset.tenant || '',
    fixtureItems: window.__menuItems?.some(i => i.id >= 900000) || false,
    baomaVisible: getComputedStyle(document.querySelector('.baoma-shell')).display !== 'none'
  }))).toEqual({ tenant: '', fixtureItems: false, baomaVisible: false })
  expect(defaultFixtureRequests).toEqual([])
  expect(errors).toEqual([])
})
