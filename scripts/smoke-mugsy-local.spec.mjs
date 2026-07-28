import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const outDir = 'tmp/mugsy-qa'
const baseUrl = process.env.MUGSY_BASE_URL || 'http://127.0.0.1:3000'
const viewports = [
  { label: '320', width: 320, height: 844 },
  { label: '390', width: 390, height: 844 },
  { label: '1440', width: 1440, height: 1000 },
]

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
})
