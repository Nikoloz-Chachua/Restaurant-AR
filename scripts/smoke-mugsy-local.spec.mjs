import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const outDir = 'tmp/mugsy-qa'
const baseUrl = process.env.MUGSY_BASE_URL || 'http://127.0.0.1:3000'
const viewports = [
  { label: '320', width: 320, height: 844 },
  { label: '390', width: 390, height: 844 },
  { label: '430', width: 430, height: 844 },
  { label: '1440', width: 1440, height: 1000 },
]
const phoneViewports = viewports.filter(viewport => ['320', '390', '430'].includes(viewport.label))
const railDesktopViewports = [
  { label: '768', width: 768, height: 844 },
  { label: '1440', width: 1440, height: 1000 },
]
const basketViewports = viewports.filter(viewport => ['320', '390', '430'].includes(viewport.label))
const footerViewports = viewports

function overlap(a, b) {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
}

test.describe('Mugsy public visual QA', () => {
  test.beforeAll(() => {
    mkdirSync(outDir, { recursive: true })
  })

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
