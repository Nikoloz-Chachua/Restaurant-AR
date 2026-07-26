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

async function screenshotInfoSection(page, path) {
  await page.evaluate(() => {
    const info = document.querySelector('.baoma-info')
    window.scrollTo(0, Math.max(0, info.offsetTop - 180))
  })
  await page.waitForTimeout(180)
  await page.locator('.baoma-info').screenshot({ path })
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

function rgb(cssColor) {
  if (cssColor.startsWith('#')) {
    const hex = cssColor.slice(1)
    const full = hex.length === 3 ? hex.split('').map(ch => ch + ch).join('') : hex
    return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
  }
  const nums = cssColor.match(/[\d.]+/g)?.map(Number) || []
  return nums.slice(0, 3)
}

function colorDistance(a, b) {
  const ar = rgb(a)
  const br = rgb(b)
  return Math.sqrt(ar.reduce((sum, v, i) => sum + Math.pow(v - (br[i] || 0), 2), 0))
}

function luminance(color) {
  const [r, g, b] = rgb(color).map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a, b) {
  const l1 = luminance(a)
  const l2 = luminance(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

async function baomaVisualMetrics(page) {
  return page.evaluate(() => {
    const title = document.querySelector('.baoma-info-title')
    const text = document.querySelector('.baoma-info-text')
    const bodyStyle = getComputedStyle(document.body)
    const rootStyle = getComputedStyle(document.documentElement)
    const shellStyle = getComputedStyle(document.querySelector('.baoma-shell'))
    const cardStyle = getComputedStyle(document.querySelector('.menu-item:not(.no-image)'))
    const textCardStyle = getComputedStyle(document.querySelector('.menu-item.no-image'))
    const infoStyle = getComputedStyle(document.querySelector('.baoma-info'))
    const textStyle = getComputedStyle(text)
    const buttonStyle = getComputedStyle(document.querySelector('.baoma-info-link.primary'))
    const modalStyle = getComputedStyle(document.querySelector('#img-lightbox.has-panel #lightbox-panel') || document.querySelector('#basket-panel'))
    const titleRect = title.getBoundingClientRect()
    const textRect = text.getBoundingClientRect()
    return {
      gap: Math.round((textRect.top - titleRect.bottom) * 10) / 10,
      titleBottom: Math.round(titleRect.bottom * 10) / 10,
      textTop: Math.round(textRect.top * 10) / 10,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      bodyBg: bodyStyle.backgroundColor,
      bgToken: rootStyle.getPropertyValue('--baoma-bg').trim(),
      cardToken: rootStyle.getPropertyValue('--baoma-card').trim(),
      modalToken: rootStyle.getPropertyValue('--baoma-lightbox-surface').trim(),
      shellBg: shellStyle.backgroundColor,
      cardBg: cardStyle.backgroundColor,
      textCardBg: textCardStyle.backgroundColor,
      infoBorder: infoStyle.borderTopColor,
      text: textStyle.color,
      buttonBg: buttonStyle.backgroundColor,
      buttonText: buttonStyle.color,
      modalBg: modalStyle.backgroundColor
    }
  })
}

async function assertInfoGapAt(browser, width, theme, lang = 'ka') {
  const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: width < 640, serviceWorkers: 'block' })
  const page = await context.newPage()
  await page.addInitScript(({ theme, lang }) => {
    localStorage.clear()
    localStorage.setItem('bl-theme', theme)
    localStorage.setItem('bl-lang', lang)
  }, { theme, lang })
  const errors = await collectErrors(page)
  await page.goto(`${base}/?tenant=b-main&fixture=baoma`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.menu-item')
  await page.locator('.baoma-info').scrollIntoViewIfNeeded()
  await page.waitForTimeout(250)
  const metrics = await baomaVisualMetrics(page)
  expect(metrics.gap).toBeGreaterThanOrEqual(10)
  expect(metrics.overflow).toBe(false)
  expect(errors).toEqual([])
  await context.close()
  return metrics.gap
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
  await mobile.addInitScript(() => {
    if (!sessionStorage.getItem('baoma-smoke-init')) {
      localStorage.clear()
      sessionStorage.setItem('baoma-smoke-init', '1')
    }
  })
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
  await screenshotInfoSection(mobile, `${outDir}/baoma-info-day-390x844.png`)
  const dayMetrics = await baomaVisualMetrics(mobile)
  expect(dayMetrics.gap).toBeGreaterThanOrEqual(10)
  expect(contrastRatio(dayMetrics.text, dayMetrics.bodyBg)).toBeGreaterThan(4.5)

  await mobile.locator('#theme-toggle').click()
  await mobile.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'night')
  const nightMetrics = await baomaVisualMetrics(mobile)
  expect(colorDistance(dayMetrics.bodyBg, nightMetrics.bodyBg)).toBeGreaterThan(80)
  expect(colorDistance(dayMetrics.cardToken, nightMetrics.cardToken)).toBeGreaterThan(45)
  expect(colorDistance(dayMetrics.modalToken, nightMetrics.modalToken)).toBeGreaterThan(45)
  expect(colorDistance(dayMetrics.buttonBg, nightMetrics.buttonBg)).toBeGreaterThan(45)
  expect(contrastRatio(nightMetrics.text, nightMetrics.bodyBg)).toBeGreaterThan(4.5)
  expect(contrastRatio(nightMetrics.buttonText, nightMetrics.buttonBg)).toBeGreaterThan(4.5)
  await mobile.reload({ waitUntil: 'domcontentloaded' })
  await mobile.waitForSelector('.menu-item')
  expect(await mobile.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('night')
  await scrollThroughPage(mobile)
  await mobile.screenshot({ path: `${outDir}/baoma-night-fixture-390x844.png`, fullPage: true })
  await screenshotInfoSection(mobile, `${outDir}/baoma-info-night-390x844.png`)

  await mobile.locator('.menu-item:not(.no-image)').first().click()
  await mobile.waitForSelector('#img-lightbox.open.has-panel')
  await expect(mobile.locator('#lightbox-close')).toBeFocused()
  await expect(mobile.locator('#lightbox-img')).toHaveAttribute('src', /img\/baoma\/dishes\//)
  await expect(mobile.locator('#lightbox-price')).toContainText('₾')
  await expect(mobile.locator('#img-lightbox .ar-btn')).toHaveCount(0)
  await expect(mobile.locator('#lightbox-qty .qty-add-btn')).toBeVisible()
  await mobile.waitForTimeout(350)
  await mobile.screenshot({ path: `${outDir}/baoma-night-detail-photo-mobile-390x844.png`, fullPage: false })
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
  await mobile.screenshot({ path: `${outDir}/baoma-night-detail-text-mobile-390x844.png`, fullPage: false })
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
  await mobile.screenshot({ path: `${outDir}/baoma-night-basket-panel-390x844.png`, fullPage: false })
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
  await desktop.locator('#theme-toggle').click()
  await desktop.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'night')
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
  const desktopNightMetrics = await baomaVisualMetrics(desktop)
  expect(desktopNightMetrics.gap).toBeGreaterThanOrEqual(10)
  expect(contrastRatio(desktopNightMetrics.text, desktopNightMetrics.bodyBg)).toBeGreaterThan(4.5)
  await desktop.screenshot({ path: `${outDir}/baoma-night-fixture-1280x720.png`, fullPage: true })
  await desktop.locator('.menu-item:not(.no-image)').first().click()
  await desktop.waitForSelector('#img-lightbox.open.has-panel')
  await expect(desktop.locator('#lightbox-close')).toBeFocused()
  await expect(desktop.locator('#lightbox-img')).toHaveAttribute('src', /img\/baoma\/dishes\//)
  await expect(desktop.locator('#img-lightbox .ar-btn')).toHaveCount(0)
  await desktop.waitForTimeout(350)
  await desktop.screenshot({ path: `${outDir}/baoma-night-detail-photo-desktop-1280x720.png`, fullPage: false })
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

  const gaps = {
    day320Ka: await assertInfoGapAt(browser, 320, 'day', 'ka'),
    night320Ka: await assertInfoGapAt(browser, 320, 'night', 'ka'),
    day390Ka: dayMetrics.gap,
    night390Ka: nightMetrics.gap,
    day390En: await assertInfoGapAt(browser, 390, 'day', 'en'),
    night390En: await assertInfoGapAt(browser, 390, 'night', 'en'),
    day1280Ka: await assertInfoGapAt(browser, 1280, 'day', 'ka'),
    night1280Ka: desktopNightMetrics.gap
  }
  console.log('BAOMA info title-to-paragraph gaps:', JSON.stringify(gaps))
})
