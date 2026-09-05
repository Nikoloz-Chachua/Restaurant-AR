import { test, expect } from '@playwright/test'

// Local-only smoke for the hero video. Stubs theme_config so the clip can be
// exercised before anything is uploaded to R2, and screenshots the result --
// this hero has a history of passing every DOM check while showing the guest
// nothing, so the artifacts are the point.
//
// Staging (the clips are gitignored -- heavy assets belong in R2, not the repo):
//   mkdir .hero-video-smoke
//   cp <encoded clips + poster> .hero-video-smoke/
//   npm run dev
//   npm run smoke:hero-video
//
// Expects cheese-pull-wide.mp4, cheese-pull-square.mp4 and
// cheese-pull-poster.webp; any encoded clip of the same shape will do.
const baseUrl = process.env.HERO_BASE_URL || 'http://127.0.0.1:3000'

const THEME = {
  template_key: 'elegant_black',
  site_name: 'Corner By Eleven',
  hero_images: JSON.stringify(['./.hero-video-smoke/cheese-pull-poster.webp']),
  hero_video_url: './.hero-video-smoke/cheese-pull-wide.mp4',
  hero_video_mobile_url: './.hero-video-smoke/cheese-pull-square.mp4',
  hero_video_poster_url: './.hero-video-smoke/cheese-pull-poster.webp',
}

function stubTheme(page, overrides = {}) {
  const cfg = { ...THEME, ...overrides }
  return page.route('**/rest/v1/theme_config*', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(Object.entries(cfg)
      .filter(([, value]) => value !== null)
      .map(([key, value]) => ({ key, value }))),
  }))
}

test.use({ serviceWorkers: 'block' })

test('the hero video plays over the poster on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await stubTheme(page)
  await page.goto(`${baseUrl}/?tenant=corner-by-eleven-main`, { waitUntil: 'networkidle' })

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.heroVideo),
    { timeout: 15000 }).toBe('true')

  const vid = page.locator('#mg-hero-video')
  await expect(vid).toBeVisible()
  // Phones get the squarer cut, not the wide one.
  expect(await vid.evaluate(v => v.currentSrc)).toContain('cheese-pull-square.mp4')
  // Actually advancing, not merely attached.
  const first = await vid.evaluate(v => v.currentTime)
  await page.waitForTimeout(1200)
  expect(await vid.evaluate(v => v.currentTime)).toBeGreaterThan(first)
  expect(await vid.evaluate(v => v.paused)).toBe(false)
  expect(await vid.evaluate(v => v.muted)).toBe(true)

  await page.screenshot({ path: 'test-results/hero-video-phone.png' })
})

test('the clip is fetched after the menu, not alongside it', async ({ page }) => {
  // The whole case for a video hero is that it costs the first screen nothing.
  // That is a claim about ordering, so measure the ordering.
  await page.setViewportSize({ width: 390, height: 844 })
  await stubTheme(page)
  await page.goto(`${baseUrl}/?tenant=corner-by-eleven-main`, { waitUntil: 'networkidle' })

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.heroVideo),
    { timeout: 15000 }).toBe('true')

  const timing = await page.evaluate(() => {
    const res = performance.getEntriesByType('resource')
    const clip = res.find(r => r.name.includes('.mp4'))
    const poster = res.find(r => r.name.includes('cheese-pull-poster.webp'))
    const menu = res.find(r => r.name.includes('menu_items'))
    const nav = performance.getEntriesByType('navigation')[0]
    return {
      clip: clip ? clip.startTime : null,
      poster: poster ? poster.startTime : null,
      menu: menu ? menu.startTime : null,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
    }
  })

  expect(timing.clip).not.toBeNull()
  // The poster is the hero's real LCP candidate and must not be queued behind a megabyte.
  expect(timing.poster).toBeLessThan(timing.clip)
  // The menu data is the page. It goes first.
  expect(timing.menu).toBeLessThan(timing.clip)
  expect(timing.clip).toBeGreaterThan(timing.domContentLoaded)
})

test('desktop gets the wide cut', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await stubTheme(page)
  await page.goto(`${baseUrl}/?tenant=corner-by-eleven-main`, { waitUntil: 'networkidle' })

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.heroVideo),
    { timeout: 15000 }).toBe('true')
  expect(await page.locator('#mg-hero-video').evaluate(v => v.currentSrc)).toContain('cheese-pull-wide.mp4')
  await page.screenshot({ path: 'test-results/hero-video-desktop.png' })
})

test('reduced motion keeps the still and never fetches the clip', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await stubTheme(page)

  const videoRequests = []
  page.on('request', r => { if (/\.mp4/.test(r.url())) videoRequests.push(r.url()) })

  await page.goto(`${baseUrl}/?tenant=corner-by-eleven-main`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  expect(videoRequests).toEqual([])
  expect(await page.evaluate(() => document.documentElement.dataset.heroVideo)).toBeUndefined()
  // The band is still a hero, painted from the poster.
  expect(await page.evaluate(() => document.documentElement.dataset.genericHero)).toBe('true')
  expect(await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--hero-image'))).toContain('cheese-pull-poster.webp')

  await page.screenshot({ path: 'test-results/hero-video-reduced-motion.png' })
})

test('a tenant with a clip but no photos still gets a hero band', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await stubTheme(page, { hero_images: null, hero_video_poster_url: null })
  await page.goto(`${baseUrl}/?tenant=corner-by-eleven-main`, { waitUntil: 'networkidle' })

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.heroVideo),
    { timeout: 15000 }).toBe('true')
  expect(await page.evaluate(() => document.documentElement.dataset.genericHero)).toBe('true')
  await expect(page.locator('#mg-hero-video')).toBeVisible()
})
