import { test, expect } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const outDir = 'tmp/mugsy-qa'
const baseUrl = process.env.MUGSY_BASE_URL || 'http://127.0.0.1:3000'
const mugsyFixture = JSON.parse(readFileSync(new URL('../data/fixtures/mugsy-menu.fixture.json', import.meta.url), 'utf8'))
const viewports = [
  { label: '320', width: 320, height: 844 },
  { label: '360', width: 360, height: 844 },
  { label: '390', width: 390, height: 844 },
  { label: '430', width: 430, height: 844 },
  { label: '768', width: 768, height: 844 },
  { label: '1440', width: 1440, height: 1000 },
]
const phoneViewports = viewports.filter(viewport => ['320', '360', '390', '430'].includes(viewport.label))
const railDesktopViewports = [
  { label: '768', width: 768, height: 844 },
  { label: '1440', width: 1440, height: 1000 },
]
const basketViewports = viewports.filter(viewport => ['320', '390', '430'].includes(viewport.label))
const footerViewports = viewports
const themeViewports = [
  { label: '320', width: 320, height: 844 },
  { label: '390', width: 390, height: 844 },
  { label: '1440', width: 1440, height: 1000 },
]

test.use({ serviceWorkers: 'block' })

function overlap(a, b) {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
}

function rgbParts(value) {
  const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return match ? match.slice(1, 4).map(Number) : [0, 0, 0]
}

function brightness(value) {
  const [r, g, b] = rgbParts(value)
  return (r * 299 + g * 587 + b * 114) / 1000
}

function alphaPart(value) {
  const match = String(value).match(/rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*([0-9.]+))?/)
  return match && match[1] != null ? Number(match[1]) : 1
}

function channel(v) {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(value) {
  const [r, g, b] = rgbParts(value)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

async function gotoMugsyWithTheme(page, viewport, theme, route3d = false) {
  if (route3d) {
    await page.route('**/mugsy-menu.fixture.json', route => {
      const fixture = structuredClone(mugsyFixture)
      fixture.menu_items[0] = {
        ...fixture.menu_items[0],
        name_en: 'Cheesy 3D Table Preview',
        name_ka: 'Cheesy 3D Table Preview',
        is_3d: true,
        model: 'food.glb',
        model_usdz: 'food.usdz',
        thumb_3d: false,
      }
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) })
    })
  }
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await page.addInitScript(mode => {
    localStorage.clear()
    if (mode === 'night') localStorage.setItem('bl-theme:mugsy-main', 'night')
  }, theme)
  await page.goto(`${baseUrl}/?tenant=mugsy-main&fixture=mugsy`, { waitUntil: 'networkidle' })
}

async function overlayState(page) {
  return page.evaluate(() => {
    const visible = el => {
      if (!el) return false
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0
    }
    const modal = document.querySelector('#modal')
    const lightbox = document.querySelector('#img-lightbox')
    const basketPanel = document.querySelector('#basket-panel')
    return {
      modalActive: modal?.classList.contains('active') || false,
      modalDisplayed: visible(modal),
      lightboxOpen: lightbox?.classList.contains('open') || false,
      lightboxPanel: lightbox?.classList.contains('has-panel') || false,
      lightboxDisplayed: visible(lightbox),
      basketActive: basketPanel?.classList.contains('active') || false,
      basketDisplayed: visible(basketPanel),
    }
  })
}

async function expectNoOpenOverlay(page) {
  expect(await overlayState(page)).toEqual({
    modalActive: false,
    modalDisplayed: false,
    lightboxOpen: false,
    lightboxPanel: false,
    lightboxDisplayed: false,
    basketActive: false,
    basketDisplayed: false,
  })
}

function inside(outer, inner, tolerance = 1) {
  return inner.left >= outer.left - tolerance &&
    inner.right <= outer.right + tolerance &&
    inner.top >= outer.top - tolerance &&
    inner.bottom <= outer.bottom + tolerance
}

async function overlayVisualState(page, selector) {
  return page.evaluate(sel => {
    const root = document.querySelector(sel)
    if (!root) return null
    const style = getComputedStyle(root)
    const animations = root.getAnimations({ subtree: true }).map(animation => ({
      playState: animation.playState,
      currentTime: animation.currentTime,
      effectTarget: animation.effect?.target?.id || animation.effect?.target?.className || animation.effect?.target?.tagName || '',
      transitionProperty: animation.transitionProperty || '',
      animationName: animation.animationName || '',
    }))
    return {
      opacity: Number(style.opacity),
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      display: style.display,
      visibility: style.visibility,
      animationCount: animations.length,
      runningAnimations: animations.filter(animation => !['finished', 'idle'].includes(animation.playState)).length,
      animations,
    }
  }, selector)
}

async function waitForOverlaySettled(page, selector) {
  await page.evaluate(async sel => {
    const root = document.querySelector(sel)
    if (!root) return
    const animations = root.getAnimations({ subtree: true })
    await Promise.allSettled(animations.map(animation => animation.finished))
    await new Promise(resolve => setTimeout(resolve, 380))
  }, selector)
  await page.waitForFunction(sel => {
    const root = document.querySelector(sel)
    if (!root) return false
    const style = getComputedStyle(root)
    return Number(style.opacity) === 1 &&
      root.getAnimations({ subtree: true }).every(animation => ['finished', 'idle'].includes(animation.playState))
  }, selector)
}

test.describe('Mugsy public visual QA', () => {
  test.beforeAll(() => {
    mkdirSync(outDir, { recursive: true })
  })

  test('global night alone still yields Mugsy day, scoped night persists, other tenants keep global theme', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
    await context.addInitScript(() => {
      if (sessionStorage.getItem('mugsy-seeded')) return
      localStorage.clear()
      localStorage.setItem('bl-theme', 'night')
      sessionStorage.setItem('mugsy-seeded', '1')
    })
    const page = await context.newPage()
    await page.goto(`${baseUrl}/?tenant=mugsy-main&fixture=mugsy`, { waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
    expect(await page.evaluate(() => localStorage.getItem('bl-theme:mugsy-main'))).toBeNull()
    await page.locator('#theme-toggle').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
    expect(await page.evaluate(() => ({
      global: localStorage.getItem('bl-theme'),
      scoped: localStorage.getItem('bl-theme:mugsy-main'),
    }))).toEqual({ global: 'night', scoped: 'night' })
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
    await context.close()

    const other = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
    await other.addInitScript(() => {
      localStorage.clear()
      localStorage.setItem('bl-theme', 'night')
    })
    const otherPage = await other.newPage()
    await otherPage.goto(`${baseUrl}/?tenant=burger-bar-main`, { waitUntil: 'domcontentloaded' })
    await expect(otherPage.locator('html')).toHaveAttribute('data-theme', 'night')
    await other.close()
  })

  for (const viewport of themeViewports) {
    for (const theme of ['day', 'night']) {
      test(`Mugsy ${theme} mode recolors primary journey surfaces at ${viewport.label}px`, async ({ page }) => {
        const errors = []
        page.on('console', message => {
          if (message.type() === 'error') errors.push(message.text())
        })
        page.on('pageerror', error => errors.push(error.message))

        await gotoMugsyWithTheme(page, viewport, theme, true)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expect(page.locator('#theme-toggle')).toBeVisible()
        await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', /day|night|დღის|ღამის|მუქი|ნათელი/i)

        await expectNoOpenOverlay(page)
        await expect(page.locator('#basket-bar')).not.toHaveClass(/visible/)

        const metrics = await page.evaluate(() => {
          const styleForEl = el => {
            const s = getComputedStyle(el)
            const r = el.getBoundingClientRect()
            return {
              bg: s.backgroundColor,
              bgImage: s.backgroundImage,
              color: s.color,
              border: s.borderTopColor,
              display: s.display,
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom,
              width: r.width,
              height: r.height,
            }
          }
          const styleFor = selector => styleForEl(document.querySelector(selector))
          const cards = [...document.querySelectorAll('.menu-item')]
          const phoneCards = cards
            .slice(0, 2)
            .map(el => {
              const r = el.getBoundingClientRect()
              return { left: r.left, right: r.right, top: r.top, width: r.width }
            })
          return {
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            phoneLayout: document.documentElement.dataset.phoneLayout,
            body: styleFor('body'),
            topbar: styleFor('.mugsy-topbar'),
            themeToggle: styleFor('#theme-toggle'),
            lang: styleFor('#lang-toggle'),
            pill: styleFor('.cat-pill'),
            ordinaryCard: styleForEl(cards[1]),
            card3d: styleForEl(cards[0]),
            stage: styleForEl(cards[0].querySelector('.thumb-wrap')),
            description: styleForEl(cards[1].querySelector('.ingredients')),
            price: styleForEl(cards[1].querySelector('.price')),
            cart: styleForEl(cards[1].querySelector('.qty-stepper.visible, .qty-add-btn')),
            cta: styleForEl(cards[0].querySelector('.ar-btn')),
            badge: styleForEl(cards[0].querySelector('.badge-3d')),
            location: styleFor('.mugsy-location'),
            footer: styleFor('.site-footer'),
            modal: styleFor('#modal'),
            basketBarVisible: document.querySelector('#basket-bar').classList.contains('visible'),
            overlayState: {
              modalActive: document.querySelector('#modal').classList.contains('active'),
              lightboxOpen: document.querySelector('#img-lightbox').classList.contains('open'),
              lightboxPanel: document.querySelector('#img-lightbox').classList.contains('has-panel'),
              basketActive: document.querySelector('#basket-panel').classList.contains('active'),
            },
            menuGridColumns: getComputedStyle(document.querySelector('.menu-list')).gridTemplateColumns.split(' ').length,
            railDisplay: getComputedStyle(document.querySelector('#mugsy-delivery-rail')).display,
            railHidden: document.querySelector('#mugsy-delivery-rail').hidden,
            phoneCards,
          }
        })

        expect(metrics.overflow).toBe(0)
        expect(metrics.themeToggle.width).toBeGreaterThanOrEqual(44)
        expect(metrics.themeToggle.height).toBeGreaterThanOrEqual(44)
        expect(overlap(metrics.themeToggle, metrics.lang), 'theme/language overlap').toBe(0)
        expect(metrics.basketBarVisible).toBe(false)
        expect(metrics.overlayState).toEqual({
          modalActive: false,
          lightboxOpen: false,
          lightboxPanel: false,
          basketActive: false,
        })
        expect(errors).toEqual([])

        if (theme === 'day') {
          expect(brightness(metrics.body.bg)).toBeGreaterThan(210)
          expect(brightness(metrics.topbar.bg)).toBeGreaterThan(210)
          expect(brightness(metrics.location.bg)).toBeGreaterThan(210)
        } else {
          for (const [name, surface] of Object.entries({
            body: metrics.body,
            topbar: metrics.topbar,
            ordinaryCard: metrics.ordinaryCard,
            card3d: metrics.card3d,
            stage: metrics.stage,
            location: metrics.location,
          })) {
            const bg = surface.bg === 'rgba(0, 0, 0, 0)' ? surface.bgImage : surface.bg
            expect(brightness(bg), `${name} should not remain cream in night`).toBeLessThan(120)
          }
          expect(metrics.modal.bgImage, 'modal should include the dark Mugsy night base').toMatch(/rgb\(22, 13, 10\)|rgb\(42, 26, 19\)/)
          for (const [name, surface] of Object.entries({
            description: metrics.description,
            price: metrics.price,
            cart: metrics.cart,
            footer: metrics.footer,
          })) {
            expect(brightness(surface.color), `${name} text should be readable in night`).toBeGreaterThan(120)
          }
          for (const [name, surface] of Object.entries({
            cta: metrics.cta,
            badge: metrics.badge,
          })) {
            expect(contrast(surface.color, surface.bg), `${name} text should contrast its CTA surface`).toBeGreaterThan(3)
          }
        }

        if (viewport.width < 640) {
          expect(metrics.phoneLayout).toBe('twin')
          expect(metrics.menuGridColumns).toBe(2)
          expect(metrics.railHidden).toBe(true)
        } else if (viewport.width >= 768) {
          expect(metrics.railDisplay).toBe('flex')
          expect(metrics.railHidden).toBe(false)
        }

        await page.screenshot({ path: `${outDir}/mugsy-theme-${theme}-${viewport.label}.png`, fullPage: false })
        writeFileSync(`${outDir}/mugsy-theme-${theme}-${viewport.label}-metrics.json`, JSON.stringify(metrics, null, 2))
      })
    }
  }

  for (const viewport of themeViewports) {
    for (const theme of ['day', 'night']) {
      test(`Mugsy ${theme} 3D modal is opaque and contained at ${viewport.label}px`, async ({ page }) => {
        const errors = []
        page.on('console', message => {
          if (message.type() === 'error') errors.push(message.text())
        })
        page.on('pageerror', error => errors.push(error.message))

        await gotoMugsyWithTheme(page, viewport, theme, true)
        await expectNoOpenOverlay(page)
        await page.locator('.menu-item').first().locator('.ar-btn').click()
        await expect(page.locator('#modal')).toHaveClass(/active/)
        const immediateVisual = await overlayVisualState(page, '#modal')
        await page.screenshot({ path: `${outDir}/mugsy-modal-3d-${theme}-${viewport.label}-immediate.png`, fullPage: false })
        await waitForOverlaySettled(page, '#modal')
        const settledVisual = await overlayVisualState(page, '#modal')
        if (viewport.width >= 640) {
          await page.locator('#modal-drawer').click()
          await expect(page.locator('#modal-drawer')).toHaveClass(/expanded/)
          await waitForOverlaySettled(page, '#modal')
        }

        const metrics = await page.evaluate(() => {
          const rectForEl = el => {
            const r = el.getBoundingClientRect()
            const s = getComputedStyle(el)
            const cx = Math.max(0, Math.min(innerWidth - 1, r.left + r.width / 2))
            const cy = Math.max(0, Math.min(innerHeight - 1, r.top + r.height / 2))
            const topEl = document.elementFromPoint(cx, cy)
            return {
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom,
              width: r.width,
              height: r.height,
              display: s.display,
              visibility: s.visibility,
              bg: s.backgroundColor,
              bgImage: s.backgroundImage,
              color: s.color,
              text: el.textContent.trim(),
              topmostInModal: !!topEl?.closest?.('#modal'),
            }
          }
          const rectFor = selector => rectForEl(document.querySelector(selector))
          const titleSelector = innerWidth < 640 ? '#modal-title' : '#modal-title-d'
          const controls = [titleSelector, '#modal-price', '#modal-description', '#modal-qty-ctrl', '#modal-ar-btn']
          const unrelated = [...document.querySelectorAll('.menu-item, .category-header')]
            .filter(el => {
              const r = el.getBoundingClientRect()
              return r.bottom > 0 && r.top < innerHeight
            })
            .map(rectForEl)
          return {
            overlay: {
              modalActive: document.querySelector('#modal').classList.contains('active'),
              lightboxOpen: document.querySelector('#img-lightbox').classList.contains('open'),
              basketActive: document.querySelector('#basket-panel').classList.contains('active'),
              basketBarVisible: document.querySelector('#basket-bar').classList.contains('visible'),
            },
            modal: rectFor('#modal'),
            panel: rectFor(innerWidth < 640 ? '#modal' : '#modal-drawer'),
            title: rectFor(titleSelector),
            price: rectFor('#modal-price'),
            description: rectFor('#modal-description'),
            qty: rectFor('#modal-qty-ctrl'),
            ar: rectFor('#modal-ar-btn'),
            closeButtons: [...document.querySelectorAll('#modal .close-btn')]
              .filter(btn => getComputedStyle(btn).display !== 'none' && btn.getBoundingClientRect().width > 0)
              .map(rectForEl),
            controls: Object.fromEntries(controls.map(selector => [selector, rectFor(selector)])),
            unrelated,
            activeElementBlockedByModal: document.elementFromPoint(Math.floor(innerWidth / 2), Math.floor(innerHeight / 2))?.closest('#modal') != null,
            visualTiming: { immediate: null, settled: null },
          }
        })
        metrics.visualTiming = { immediate: immediateVisual, settled: settledVisual }

        expect(metrics.overlay).toEqual({
          modalActive: true,
          lightboxOpen: false,
          basketActive: false,
          basketBarVisible: false,
        })
        expect(alphaPart(metrics.modal.bg)).toBe(1)
        expect(alphaPart(metrics.panel.bg)).toBe(1)
        expect(metrics.visualTiming.settled.opacity).toBe(1)
        expect(alphaPart(metrics.visualTiming.settled.backgroundColor)).toBe(1)
        expect(metrics.closeButtons).toHaveLength(1)
        expect(metrics.title.text).toBe('Cheesy 3D Table Preview')
        expect(metrics.description.text.length).toBeGreaterThan(0)
        expect(metrics.price.text.length).toBeGreaterThan(0)
        for (const [name, rect] of Object.entries(metrics.controls)) {
          expect(rect.display, `${name} should be displayed`).not.toBe('none')
          expect(rect.visibility, `${name} should be visible`).toBe('visible')
          expect(rect.width, `${name} should have width`).toBeGreaterThan(0)
          expect(rect.height, `${name} should have height`).toBeGreaterThan(0)
          expect(inside(metrics.modal, rect), `${name} should fit inside modal`).toBe(true)
          expect(inside(metrics.panel, rect), `${name} should fit inside visible panel`).toBe(true)
          expect(rect.topmostInModal, `${name} center should be owned by modal`).toBe(true)
          for (const underlying of metrics.unrelated) {
            if (overlap(rect, underlying) > 0) {
              expect(rect.topmostInModal, `${name} overlap must be visually covered by modal`).toBe(true)
            }
          }
        }
        expect(metrics.activeElementBlockedByModal).toBe(true)
        expect(errors).toEqual([])

        await page.screenshot({ path: `${outDir}/mugsy-modal-3d-${theme}-${viewport.label}.png`, fullPage: false })
        writeFileSync(`${outDir}/mugsy-modal-3d-${theme}-${viewport.label}-metrics.json`, JSON.stringify(metrics, null, 2))
      })

      test(`Mugsy ${theme} photo detail lightbox is opaque and contained at ${viewport.label}px`, async ({ page }) => {
        const errors = []
        page.on('console', message => {
          if (message.type() === 'error') errors.push(message.text())
        })
        page.on('pageerror', error => errors.push(error.message))

        await gotoMugsyWithTheme(page, viewport, theme)
        await expectNoOpenOverlay(page)
        await page.locator('.menu-item').filter({
          has: page.locator('.item-name', { hasText: /^Bacon Smash$/ }),
        }).first().click()
        await expect(page.locator('#img-lightbox')).toHaveClass(/open/)
        await expect(page.locator('#img-lightbox')).toHaveClass(/has-panel/)
        const immediateVisual = await overlayVisualState(page, '#img-lightbox')
        await page.screenshot({ path: `${outDir}/mugsy-modal-photo-${theme}-${viewport.label}-immediate.png`, fullPage: false })
        await waitForOverlaySettled(page, '#img-lightbox')
        const settledVisual = await overlayVisualState(page, '#img-lightbox')

        const metrics = await page.evaluate(() => {
          const rectForEl = el => {
            const r = el.getBoundingClientRect()
            const s = getComputedStyle(el)
            const cx = Math.max(0, Math.min(innerWidth - 1, r.left + r.width / 2))
            const cy = Math.max(0, Math.min(innerHeight - 1, r.top + r.height / 2))
            const topEl = document.elementFromPoint(cx, cy)
            return {
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom,
              width: r.width,
              height: r.height,
              display: s.display,
              visibility: s.visibility,
              bg: s.backgroundColor,
              bgImage: s.backgroundImage,
              color: s.color,
              text: el.textContent.trim(),
              topmostInLightbox: !!topEl?.closest?.('#img-lightbox'),
            }
          }
          const rectFor = selector => rectForEl(document.querySelector(selector))
          const controls = ['#lightbox-name', '#lightbox-img', '#lightbox-panel', '#lightbox-desc', '#lightbox-price', '#lightbox-qty']
          const unrelated = [...document.querySelectorAll('.menu-item, .category-header')]
            .filter(el => {
              const r = el.getBoundingClientRect()
              return r.bottom > 0 && r.top < innerHeight
            })
            .map(rectForEl)
          return {
            overlay: {
              modalActive: document.querySelector('#modal').classList.contains('active'),
              lightboxOpen: document.querySelector('#img-lightbox').classList.contains('open'),
              lightboxPanel: document.querySelector('#img-lightbox').classList.contains('has-panel'),
              basketActive: document.querySelector('#basket-panel').classList.contains('active'),
              basketBarVisible: document.querySelector('#basket-bar').classList.contains('visible'),
            },
            lightbox: rectFor('#img-lightbox'),
            panel: rectFor('#lightbox-panel'),
            name: rectFor('#lightbox-name'),
            desc: rectFor('#lightbox-desc'),
            price: rectFor('#lightbox-price'),
            qty: rectFor('#lightbox-qty'),
            closeButtons: [...document.querySelectorAll('#img-lightbox .close-btn')]
              .filter(btn => getComputedStyle(btn).display !== 'none' && btn.getBoundingClientRect().width > 0)
              .map(rectForEl),
            controls: Object.fromEntries(controls.map(selector => [selector, rectFor(selector)])),
            unrelated,
            visualTiming: { immediate: null, settled: null },
          }
        })
        metrics.visualTiming = { immediate: immediateVisual, settled: settledVisual }

        expect(metrics.overlay).toEqual({
          modalActive: false,
          lightboxOpen: true,
          lightboxPanel: true,
          basketActive: false,
          basketBarVisible: false,
        })
        expect(alphaPart(metrics.lightbox.bg)).toBe(1)
        expect(alphaPart(metrics.panel.bg)).toBe(1)
        expect(metrics.visualTiming.settled.opacity).toBe(1)
        expect(alphaPart(metrics.visualTiming.settled.backgroundColor)).toBe(1)
        expect(metrics.closeButtons).toHaveLength(1)
        expect(metrics.name.text).toBe('Bacon Smash')
        expect(metrics.desc.text.length).toBeGreaterThan(0)
        expect(metrics.price.text.length).toBeGreaterThan(0)
        for (const [name, rect] of Object.entries(metrics.controls)) {
          expect(rect.display, `${name} should be displayed`).not.toBe('none')
          expect(rect.visibility, `${name} should be visible`).toBe('visible')
          expect(rect.width, `${name} should have width`).toBeGreaterThan(0)
          expect(rect.height, `${name} should have height`).toBeGreaterThan(0)
          expect(inside(metrics.lightbox, rect), `${name} should fit inside lightbox`).toBe(true)
          expect(rect.topmostInLightbox, `${name} center should be owned by lightbox`).toBe(true)
          for (const underlying of metrics.unrelated) {
            if (overlap(rect, underlying) > 0) {
              expect(rect.topmostInLightbox, `${name} overlap must be visually covered by lightbox`).toBe(true)
            }
          }
        }
        expect(errors).toEqual([])

        await page.screenshot({ path: `${outDir}/mugsy-modal-photo-${theme}-${viewport.label}.png`, fullPage: false })
        writeFileSync(`${outDir}/mugsy-modal-photo-${theme}-${viewport.label}-metrics.json`, JSON.stringify(metrics, null, 2))
      })
    }
  }

  for (const viewport of viewports) {
    test(`sticky header controls fit without overlap at ${viewport.label}px`, async ({ page }) => {
      const errors = []
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', error => errors.push(error.message))

      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`${baseUrl}/?tenant=mugsy-main&fixture=mugsy`, { waitUntil: 'networkidle' })

      await page.screenshot({ path: `${outDir}/mugsy-${viewport.label}-viewport.png`, fullPage: false })
      await page.screenshot({ path: `${outDir}/mugsy-${viewport.label}-full.png`, fullPage: true })

      const metrics = await page.evaluate(() => {
        const rectFor = selector => {
          const el = document.querySelector(selector)
          if (!el) return null
          const r = el.getBoundingClientRect()
          return {
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
            text: el.textContent.trim(),
          }
        }
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          cards: document.querySelectorAll('.menu-item').length,
          arButtons: document.querySelectorAll('.ar-btn').length,
          lang: rectFor('#lang-toggle'),
          logo: rectFor('.mugsy-topbar-logo'),
          menu: rectFor('.mugsy-menu-jump'),
          order: rectFor('.mugsy-order-main'),
        }
      })

      expect(metrics.logo).toBeTruthy()
      expect(metrics.logo.left).toBeGreaterThanOrEqual(0)
      expect(metrics.logo.right).toBeLessThanOrEqual(viewport.width)

      const controls = [metrics.lang, metrics.menu, metrics.order]
      for (const rect of controls) {
        expect(rect).toBeTruthy()
        expect(rect.width).toBeGreaterThanOrEqual(44)
        expect(rect.height).toBeGreaterThanOrEqual(44)
        expect(rect.left).toBeGreaterThanOrEqual(0)
        expect(rect.right).toBeLessThanOrEqual(viewport.width)
      }

      expect(overlap(metrics.logo, metrics.menu), 'logo/menu overlap').toBe(0)
      expect(overlap(metrics.logo, metrics.lang), 'logo/language overlap').toBe(0)
      expect(overlap(metrics.logo, metrics.order), 'logo/order overlap').toBe(0)
      expect(overlap(metrics.menu, metrics.lang), 'menu/language overlap').toBe(0)
      expect(overlap(metrics.menu, metrics.order), 'menu/order overlap').toBe(0)
      expect(overlap(metrics.lang, metrics.order), 'language/order overlap').toBe(0)
      expect(metrics.overflow).toBe(0)
      expect(metrics.cards).toBe(21)
      expect(metrics.arButtons).toBe(0)
      expect(errors).toEqual([])

      writeFileSync(`${outDir}/mugsy-${viewport.label}-metrics.json`, JSON.stringify(metrics, null, 2))
    })
  }

  for (const viewport of phoneViewports) {
    test(`phone menu cards render as Mugsy twin view at ${viewport.label}px`, async ({ page }) => {
      const errors = []
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', error => errors.push(error.message))

      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`${baseUrl}/?tenant=mugsy-main&fixture=mugsy`, { waitUntil: 'networkidle' })

      const burgerSection = page.locator('.cat-section').first()
      const first = burgerSection.locator('.menu-item').nth(0)
      const second = burgerSection.locator('.menu-item').nth(1)
      await expect(first).toBeVisible()
      await expect(second).toBeVisible()
      await first.locator('.qty-add-btn').click()
      await expect(first.locator('.qty-stepper')).toHaveClass(/visible/)
      await first.locator('.qty-inc').click()
      await expect(first.locator('.qty-num')).toHaveText('2')

      const metrics = await page.evaluate(() => {
        const rect = el => {
          const r = el.getBoundingClientRect()
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
        }
        const rectFor = (selector, root = document) => {
          const el = root.querySelector(selector)
          return el ? rect(el) : null
        }
        const firstSectionCards = [...document.querySelector('.cat-section').querySelectorAll('.menu-item')]
        const firstCard = firstSectionCards[0]
        const secondCard = firstSectionCards[1]
        const section = firstCard?.closest('.cat-section') || document
        const header = section.querySelector('.category-header')
        const visibleControls = [...document.querySelectorAll('.menu-item .qty-add-btn, .menu-item .qty-stepper.visible, .menu-item .ar-btn')]
          .filter(el => getComputedStyle(el).display !== 'none')
          .map(el => ({ className: el.className, rect: rect(el), text: el.textContent.trim() }))
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          phoneLayout: document.documentElement.dataset.phoneLayout,
          menuGrid: getComputedStyle(document.querySelector('.menu-list')).gridTemplateColumns,
          firstNameText: firstCard.querySelector('.item-name').textContent.trim(),
          secondNameText: secondCard.querySelector('.item-name').textContent.trim(),
          first: rect(firstCard),
          second: rect(secondCard),
          header: rect(header),
          firstImage: rectFor('.thumb-wrap', firstCard),
          firstImageFit: getComputedStyle(firstCard.querySelector('.thumb-img')).objectFit,
          firstName: rectFor('.item-name', firstCard),
          firstPrice: rectFor('.price', firstCard),
          firstQty: rectFor('.qty-stepper.visible', firstCard),
          secondImage: rectFor('.thumb-wrap', secondCard),
          secondName: rectFor('.item-name', secondCard),
          secondPrice: rectFor('.price', secondCard),
          secondCart: rectFor('.qty-add-btn', secondCard),
          controls: visibleControls,
        }
      })

      expect(metrics.phoneLayout).toBe('twin')
      expect(metrics.overflow).toBe(0)
      expect(metrics.menuGrid.split(' ')).toHaveLength(2)
      expect(Math.abs(metrics.first.top - metrics.second.top)).toBeLessThanOrEqual(2)
      expect(metrics.first.left).toBeLessThan(metrics.second.left)
      expect(metrics.first.right).toBeLessThanOrEqual(metrics.second.left)
      expect(metrics.first.width).toBeLessThanOrEqual((viewport.width - 24 - 12) / 2 + 1)
      expect(metrics.second.width).toBeLessThanOrEqual((viewport.width - 24 - 12) / 2 + 1)
      expect(metrics.first.left).toBeGreaterThanOrEqual(0)
      expect(metrics.second.right).toBeLessThanOrEqual(viewport.width)
      expect(metrics.header.left).toBeLessThanOrEqual(metrics.first.left)
      expect(metrics.header.right).toBeGreaterThanOrEqual(metrics.second.right)
      expect(metrics.firstImageFit).toBe('cover')
      expect(overlap(metrics.firstImage, metrics.firstName), 'first image/name overlap').toBe(0)
      expect(overlap(metrics.firstName, metrics.firstPrice), 'first name/price overlap').toBe(0)
      expect(overlap(metrics.firstPrice, metrics.firstQty), 'first price/quantity overlap').toBe(0)
      expect(overlap(metrics.secondImage, metrics.secondName), 'second image/name overlap').toBe(0)
      expect(overlap(metrics.secondName, metrics.secondPrice), 'second name/price overlap').toBe(0)
      expect(overlap(metrics.secondPrice, metrics.secondCart), 'second price/cart overlap').toBe(0)
      for (const control of metrics.controls) {
        expect(control.rect.height).toBeGreaterThanOrEqual(44)
        expect(control.rect.left).toBeGreaterThanOrEqual(metrics.first.left - 1)
        expect(control.rect.right).toBeLessThanOrEqual(metrics.second.right + 1)
      }
      expect(errors).toEqual([])

      await page.screenshot({ path: `${outDir}/mugsy-twin-${viewport.label}x844.png`, fullPage: false })
      writeFileSync(`${outDir}/mugsy-twin-${viewport.label}-metrics.json`, JSON.stringify(metrics, null, 2))
    })
  }

  for (const viewport of phoneViewports) {
    test(`Mugsy 3D card CTA fits the phone twin column at ${viewport.label}px`, async ({ page }) => {
      const errors = []
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', error => errors.push(error.message))
      await page.route('**/mugsy-menu.fixture.json', route => {
        const fixture = structuredClone(mugsyFixture)
        fixture.menu_items[0] = {
          ...fixture.menu_items[0],
          name_en: 'Cheesy 3D Table Preview',
          name_ka: 'Cheesy 3D Table Preview',
          is_3d: true,
          model: 'food.glb',
          model_usdz: 'food.usdz',
          thumb_3d: false,
        }
        route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) })
      })

      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`${baseUrl}/?tenant=mugsy-main&fixture=mugsy`, { waitUntil: 'networkidle' })
      const card = page.locator('.menu-item').filter({ has: page.locator('.item-name', { hasText: /Cheesy 3D Table Preview/ }) }).first()
      await expect(card.locator('.ar-btn')).toBeVisible()

      const metrics = await card.evaluate(cardEl => {
        const rect = el => {
          const r = el.getBoundingClientRect()
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
        }
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          card: rect(cardEl),
          image: rect(cardEl.querySelector('.thumb-wrap')),
          name: rect(cardEl.querySelector('.item-name')),
          price: rect(cardEl.querySelector('.price')),
          cart: rect(cardEl.querySelector('.qty-add-btn')),
          ar: rect(cardEl.querySelector('.ar-btn')),
          arText: cardEl.querySelector('.ar-btn').textContent.trim(),
        }
      })

      expect(metrics.overflow).toBe(0)
      expect(metrics.card.right).toBeLessThanOrEqual(viewport.width)
      expect(metrics.ar.height).toBeGreaterThanOrEqual(44)
      expect(metrics.ar.left).toBeGreaterThanOrEqual(metrics.card.left)
      expect(metrics.ar.right).toBeLessThanOrEqual(metrics.card.right)
      expect(metrics.arText.length).toBeGreaterThan(0)
      expect(overlap(metrics.image, metrics.name), '3D image/name overlap').toBe(0)
      expect(overlap(metrics.name, metrics.price), '3D name/price overlap').toBe(0)
      expect(overlap(metrics.price, metrics.cart), '3D price/cart overlap').toBe(0)
      expect(overlap(metrics.cart, metrics.ar), '3D cart/CTA overlap').toBe(0)
      expect(errors).toEqual([])

      await page.screenshot({ path: `${outDir}/mugsy-twin-3d-${viewport.label}x844.png`, fullPage: false })
      writeFileSync(`${outDir}/mugsy-twin-3d-${viewport.label}-metrics.json`, JSON.stringify(metrics, null, 2))
    })
  }

  for (const viewport of railDesktopViewports) {
    test(`Mugsy larger-screen menu grid remains unchanged at ${viewport.label}px`, async ({ page }) => {
      const errors = []
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', error => errors.push(error.message))

      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`${baseUrl}/?tenant=mugsy-main&fixture=mugsy`, { waitUntil: 'networkidle' })

      const metrics = await page.evaluate(() => {
        const rect = el => {
          const r = el.getBoundingClientRect()
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
        }
        const cards = [...document.querySelectorAll('.menu-item')]
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          columns: getComputedStyle(document.querySelector('.menu-list')).gridTemplateColumns.split(' ').length,
          first: rect(cards[0]),
          second: rect(cards[1]),
          third: rect(cards[2]),
          header: rect(document.querySelector('.category-header')),
        }
      })

      expect(metrics.overflow).toBe(0)
      expect(metrics.columns).toBe(viewport.width >= 1040 ? 3 : 2)
      expect(Math.abs(metrics.first.top - metrics.second.top)).toBeLessThanOrEqual(2)
      expect(metrics.header.right).toBeGreaterThanOrEqual(metrics.second.right)
      if (viewport.width >= 1040) {
        expect(Math.abs(metrics.first.top - metrics.third.top)).toBeLessThanOrEqual(2)
        expect(metrics.header.right).toBeGreaterThanOrEqual(metrics.third.right)
      }
      expect(errors).toEqual([])

      await page.screenshot({ path: `${outDir}/mugsy-grid-${viewport.label}x844.png`, fullPage: false })
      writeFileSync(`${outDir}/mugsy-grid-${viewport.label}-metrics.json`, JSON.stringify(metrics, null, 2))
    })
  }

  for (const viewport of basketViewports) {
    test(`basket shows Cheesy thumbnail without mobile overflow at ${viewport.label}px`, async ({ page }) => {
      const errors = []
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', error => errors.push(error.message))

      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`${baseUrl}/?tenant=mugsy-main&fixture=mugsy`, { waitUntil: 'networkidle' })

      const cheesyCard = page.locator('.menu-item').filter({
        has: page.locator('.item-name', { hasText: /^Cheesy$/ }),
      }).first()
      await expect(cheesyCard).toBeVisible()
      await cheesyCard.locator('.qty-add-btn').click()
      await expect(page.locator('#basket-bar')).toHaveClass(/visible/)
      await page.locator('#basket-bar').click()
      await expect(page.locator('#basket-panel')).toHaveClass(/active/)
      await expect(page.locator('#basket-items .basket-item')).toHaveCount(1)
      await expect(page.locator('#basket-items .basket-item-name')).toHaveText('Cheesy')
      await expect(page.locator('#basket-items .basket-item-thumb')).toHaveAttribute('src', /assets\/mugsy\/items-webp\/cheesy\.webp/)

      await page.locator('#basket-items .qty-btn[data-delta="1"]').click()
      await expect(page.locator('#basket-items .qty-count')).toHaveText('2')
      await page.locator('#basket-items .qty-btn[data-delta="-1"]').click()
      await expect(page.locator('#basket-items .qty-count')).toHaveText('1')

      await page.waitForFunction(() => {
        const img = document.querySelector('#basket-items .basket-item-thumb')
        return img && img.complete && img.naturalWidth > 0
      })

      const metrics = await page.evaluate(() => {
        const rectFor = selector => {
          const el = document.querySelector(selector)
          if (!el) return null
          const r = el.getBoundingClientRect()
          return {
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
            text: el.textContent.trim(),
          }
        }
        const img = document.querySelector('#basket-items .basket-item-thumb')
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          row: rectFor('#basket-items .basket-item'),
          image: rectFor('#basket-items .basket-item-media'),
          name: rectFor('#basket-items .basket-item-name'),
          qty: rectFor('#basket-items .basket-qty'),
          price: rectFor('#basket-items .basket-item-price'),
          qtyButtons: [...document.querySelectorAll('#basket-items .qty-btn')].map(btn => {
            const r = btn.getBoundingClientRect()
            return { width: r.width, height: r.height }
          }),
          naturalWidth: img ? img.naturalWidth : 0,
          naturalHeight: img ? img.naturalHeight : 0,
          imageSrc: img ? img.currentSrc : '',
        }
      })

      expect(metrics.naturalWidth).toBeGreaterThan(0)
      expect(metrics.naturalHeight).toBeGreaterThan(0)
      expect(metrics.image.width).toBeGreaterThanOrEqual(52)
      expect(metrics.image.height).toBeGreaterThanOrEqual(52)
      expect(metrics.overflow).toBe(0)
      expect(metrics.row.left).toBeGreaterThanOrEqual(0)
      expect(metrics.row.right).toBeLessThanOrEqual(viewport.width)
      expect(overlap(metrics.image, metrics.name), 'image/name overlap').toBe(0)
      expect(overlap(metrics.name, metrics.qty), 'name/quantity overlap').toBe(0)
      expect(overlap(metrics.qty, metrics.price), 'quantity/price overlap').toBe(0)
      for (const button of metrics.qtyButtons) {
        expect(button.width).toBeGreaterThanOrEqual(26)
        expect(button.height).toBeGreaterThanOrEqual(26)
      }
      expect(errors).toEqual([])

      await page.screenshot({ path: `${outDir}/mugsy-basket-${viewport.label}x844.png`, fullPage: false })
      writeFileSync(`${outDir}/mugsy-basket-${viewport.label}-metrics.json`, JSON.stringify(metrics, null, 2))
    })
  }

  for (const viewport of footerViewports) {
    test(`footer signature is centered and linked without overflow at ${viewport.label}px`, async ({ page }) => {
      const errors = []
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', error => errors.push(error.message))

      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`${baseUrl}/?tenant=mugsy-main&fixture=mugsy`, { waitUntil: 'networkidle' })
      await page.locator('.site-footer').scrollIntoViewIfNeeded()
      await expect(page.locator('.site-footer')).toHaveClass(/show/)
      await page.waitForFunction(() => {
        const visibleLogo = [...document.querySelectorAll('.site-footer .footer-logo')]
          .find(img => getComputedStyle(img).display !== 'none')
        return visibleLogo && visibleLogo.complete && visibleLogo.naturalWidth > 0
      })

      const metrics = await page.evaluate(() => {
        const rectFor = selector => {
          const el = document.querySelector(selector)
          if (!el) return null
          const r = el.getBoundingClientRect()
          return {
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
            centerX: r.left + r.width / 2,
            text: el.textContent.trim(),
          }
        }
        const footer = document.querySelector('.site-footer')
        const link = document.querySelector('.site-footer .footer-brand-link')
        const visibleLogo = [...document.querySelectorAll('.site-footer .footer-logo')]
          .find(img => getComputedStyle(img).display !== 'none')
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          footer: rectFor('.site-footer'),
          brandLink: rectFor('.site-footer .footer-brand-link'),
          visibleLogo: visibleLogo ? rectFor(`.${[...visibleLogo.classList].join('.')}`) : null,
          logoComplete: visibleLogo ? visibleLogo.complete : false,
          logoNaturalWidth: visibleLogo ? visibleLogo.naturalWidth : 0,
          logoNaturalHeight: visibleLogo ? visibleLogo.naturalHeight : 0,
          email: rectFor('.site-footer .footer-email'),
          copy: rectFor('.site-footer .footer-copy'),
          href: link ? link.getAttribute('href') : '',
          target: link ? link.getAttribute('target') : null,
          ariaLabel: link ? link.getAttribute('aria-label') : '',
          deliveryLinksInFooter: [...document.querySelectorAll('.site-footer a')]
            .filter(a => /wolt|glovo/i.test(a.textContent) || /wolt|glovo/i.test(a.href))
            .map(a => a.href),
        }
      })

      const pageCenter = viewport.width / 2
      expect(metrics.footer).toBeTruthy()
      expect(metrics.brandLink).toBeTruthy()
      expect(metrics.visibleLogo).toBeTruthy()
      expect(metrics.logoComplete).toBe(true)
      expect(metrics.logoNaturalWidth).toBeGreaterThan(0)
      expect(metrics.logoNaturalHeight).toBeGreaterThan(0)
      expect(Math.abs(metrics.footer.centerX - pageCenter)).toBeLessThanOrEqual(1)
      expect(Math.abs(metrics.brandLink.centerX - pageCenter)).toBeLessThanOrEqual(1)
      expect(Math.abs(metrics.email.centerX - pageCenter)).toBeLessThanOrEqual(1)
      expect(Math.abs(metrics.copy.centerX - pageCenter)).toBeLessThanOrEqual(1)
      expect(metrics.href).toBe('https://betareal.ge')
      expect(metrics.target).toBeNull()
      expect(metrics.ariaLabel).toBe('Visit BetaReal')
      expect(metrics.deliveryLinksInFooter).toEqual([])
      expect(metrics.overflow).toBe(0)
      expect(errors).toEqual([])

      await page.screenshot({ path: `${outDir}/mugsy-footer-${viewport.label}x844.png`, fullPage: false })
      writeFileSync(`${outDir}/mugsy-footer-${viewport.label}-metrics.json`, JSON.stringify(metrics, null, 2))
    })
  }

  for (const viewport of phoneViewports) {
    test(`delivery rail is removed from phone interaction space at ${viewport.label}px`, async ({ page }) => {
      const errors = []
      const deliveryAssetRequests = []
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', error => errors.push(error.message))
      page.on('request', request => {
        if (/assets\/mugsy\/deliveries\/(wolt|glovo)\.(jpg|png)/.test(request.url())) {
          deliveryAssetRequests.push(request.url())
        }
      })

      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`${baseUrl}/?tenant=mugsy-main&fixture=mugsy`, { waitUntil: 'networkidle' })

      const metrics = await page.evaluate(async () => {
        const rectFor = selector => {
          const el = document.querySelector(selector)
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
        }
        const rail = document.querySelector('#mugsy-delivery-rail')
        const links = [...document.querySelectorAll('#mugsy-delivery-rail a')]
        const focusables = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
          .filter(el => !el.disabled && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden')
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          railHidden: rail ? rail.hidden : null,
          rail: rectFor('#mugsy-delivery-rail'),
          links: links.map(a => ({ href: a.href, ariaLabel: a.getAttribute('aria-label'), tabIndex: a.tabIndex })),
          imgs: [...document.querySelectorAll('#mugsy-delivery-rail img')].map(img => img.getAttribute('src')),
          sideDeliveryFocusables: focusables
            .filter(el => el.closest('#mugsy-delivery-rail'))
            .map(el => ({ tag: el.tagName, href: el.href || '', ariaLabel: el.getAttribute('aria-label') || '' })),
        }
      })

      await page.keyboard.press('Tab')
      const activeDeliveryControl = await page.evaluate(() => {
        const el = document.activeElement
        return Boolean(el && el.closest('#mugsy-delivery-rail'))
      })

      expect(metrics.overflow).toBe(0)
      expect(metrics.railHidden).toBe(true)
      expect(metrics.rail).toEqual(expect.objectContaining({ width: 0, height: 0 }))
      expect(metrics.links).toEqual([])
      expect(metrics.imgs).toEqual([])
      expect(metrics.sideDeliveryFocusables).toEqual([])
      expect(activeDeliveryControl).toBe(false)
      expect(deliveryAssetRequests).toEqual([])
      expect(errors).toEqual([])

      await page.screenshot({ path: `${outDir}/mugsy-delivery-rail-hidden-${viewport.label}x844.png`, fullPage: false })
      writeFileSync(`${outDir}/mugsy-delivery-rail-hidden-${viewport.label}-metrics.json`, JSON.stringify(metrics, null, 2))
    })
  }

  for (const viewport of railDesktopViewports) {
    test(`delivery rail uses local icons and keeps desktop links at ${viewport.label}px`, async ({ page }) => {
      const errors = []
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', error => errors.push(error.message))

      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`${baseUrl}/?tenant=mugsy-main&fixture=mugsy`, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => {
        const imgs = [...document.querySelectorAll('#mugsy-delivery-rail img')]
        return imgs.length === 2 && imgs.every(img => img.complete && img.naturalWidth > 0)
      })

      const initialMetrics = await page.evaluate(() => {
        const rectFor = selector => {
          const el = document.querySelector(selector)
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, centerY: r.top + r.height / 2 }
        }
        const rail = document.querySelector('#mugsy-delivery-rail')
        const links = [...document.querySelectorAll('#mugsy-delivery-rail a')]
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          railHidden: rail ? rail.hidden : null,
          railDisplay: rail ? getComputedStyle(rail).display : '',
          rail: rectFor('#mugsy-delivery-rail'),
          header: rectFor('.mugsy-topbar'),
          lang: rectFor('#lang-toggle'),
          links: links.map(a => ({
            href: a.href,
            ariaLabel: a.getAttribute('aria-label'),
            rect: rectFor(`#${rail.id} a:nth-child(${links.indexOf(a) + 1})`),
            imgSrc: a.querySelector('img')?.getAttribute('src') || '',
            naturalWidth: a.querySelector('img')?.naturalWidth || 0,
            naturalHeight: a.querySelector('img')?.naturalHeight || 0,
          })),
        }
      })

      expect(initialMetrics.overflow).toBe(0)
      expect(initialMetrics.railHidden).toBe(false)
      expect(initialMetrics.railDisplay).toBe('flex')
      expect(initialMetrics.rail).toBeTruthy()
      expect(Math.abs(initialMetrics.rail.centerY - viewport.height / 2)).toBeLessThanOrEqual(4)
      expect(initialMetrics.rail.right).toBeLessThanOrEqual(viewport.width)
      expect(initialMetrics.rail.left).toBeGreaterThanOrEqual(0)
      expect(initialMetrics.links).toHaveLength(2)
      expect(initialMetrics.links[0].href).toContain('https://wolt.com/en/geo/tbilisi/restaurant/magsys-burger')
      expect(initialMetrics.links[0].ariaLabel).toBe('Wolt delivery')
      expect(initialMetrics.links[0].imgSrc).toBe('./assets/mugsy/deliveries/wolt.jpg')
      expect(initialMetrics.links[0].naturalWidth).toBeGreaterThan(0)
      expect(initialMetrics.links[0].naturalHeight).toBeGreaterThan(0)
      expect(initialMetrics.links[1].href).toBe('https://glovoapp.com/en/ge/tbilisi/stores/mugsy-s-burger-tbi')
      expect(initialMetrics.links[1].ariaLabel).toBe('Glovo delivery')
      expect(initialMetrics.links[1].imgSrc).toBe('./assets/mugsy/deliveries/glovo.png')
      expect(initialMetrics.links[1].naturalWidth).toBeGreaterThan(0)
      expect(initialMetrics.links[1].naturalHeight).toBeGreaterThan(0)
      expect(overlap(initialMetrics.rail, initialMetrics.header), 'rail/header overlap').toBe(0)
      expect(overlap(initialMetrics.rail, initialMetrics.lang), 'rail/language overlap').toBe(0)

      await page.locator('.menu-item').first().scrollIntoViewIfNeeded()
      const menuMetrics = await page.evaluate(() => {
        const rail = document.querySelector('#mugsy-delivery-rail').getBoundingClientRect()
        const buttons = [...document.querySelectorAll('.menu-item .qty-add-btn, .menu-item .qty-stepper')]
          .filter(el => {
            const r = el.getBoundingClientRect()
            return r.bottom > 0 && r.top < innerHeight
          })
          .map(el => {
            const r = el.getBoundingClientRect()
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
          })
        const catControls = [...document.querySelectorAll('#cat-bar button, #cat-filter [role="button"], #cat-filter .cat-pill')]
          .filter(el => {
            const r = el.getBoundingClientRect()
            return r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).display !== 'none'
          })
          .map(el => {
            const r = el.getBoundingClientRect()
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
          })
        return {
          rail: { left: rail.left, right: rail.right, top: rail.top, bottom: rail.bottom, width: rail.width, height: rail.height },
          catControls,
          buttons,
        }
      })
      for (const control of menuMetrics.catControls) {
        expect(overlap(menuMetrics.rail, control), 'rail/category control overlap').toBe(0)
      }
      for (const button of menuMetrics.buttons) {
        expect(overlap(menuMetrics.rail, button), 'rail/add button overlap').toBe(0)
      }

      await page.locator('.menu-item').filter({
        has: page.locator('.item-name', { hasText: /^Cheesy$/ }),
      }).first().locator('.qty-add-btn').click()
      await expect(page.locator('#basket-bar')).toHaveClass(/visible/)
      const basketMetrics = await page.evaluate(() => {
        const rectFor = selector => {
          const r = document.querySelector(selector).getBoundingClientRect()
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
        }
        return {
          rail: rectFor('#mugsy-delivery-rail'),
          basket: rectFor('#basket-bar'),
        }
      })
      expect(overlap(basketMetrics.rail, basketMetrics.basket), 'rail/basket overlap').toBe(0)

      await page.locator('#mugsy-locations').scrollIntoViewIfNeeded()
      const locationMetrics = await page.evaluate(() => {
        const rail = document.querySelector('#mugsy-delivery-rail').getBoundingClientRect()
        const directions = [...document.querySelectorAll('.mugsy-location span:last-child')]
          .filter(el => {
            const r = el.getBoundingClientRect()
            return r.bottom > 0 && r.top < innerHeight
          })
          .map(el => {
            const r = el.getBoundingClientRect()
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
          })
        return {
          rail: { left: rail.left, right: rail.right, top: rail.top, bottom: rail.bottom, width: rail.width, height: rail.height },
          directions,
        }
      })
      for (const direction of locationMetrics.directions) {
        expect(overlap(locationMetrics.rail, direction), 'rail/location link overlap').toBe(0)
      }
      expect(errors).toEqual([])

      await page.screenshot({ path: `${outDir}/mugsy-delivery-rail-${viewport.label}x844.png`, fullPage: false })
      writeFileSync(`${outDir}/mugsy-delivery-rail-${viewport.label}-metrics.json`, JSON.stringify({ initialMetrics, menuMetrics, basketMetrics, locationMetrics }, null, 2))
    })
  }
})
