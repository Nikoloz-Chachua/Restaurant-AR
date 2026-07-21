import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('./admin.html', import.meta.url), 'utf8')

function overviewKpiGrid() {
  const match = html.match(/<div class="section-label" data-i18n="sec_overview">[\s\S]*?<div class="kpi-grid">([\s\S]*?)<div class="insight-row" id="insights">/)
  assert.ok(match, 'Missing overview KPI grid')
  return match[1]
}

test('tenant analytics overview omits attribution/device KPIs while keeping core cards', () => {
  const grid = overviewKpiGrid()

  assert.ok(!grid.includes('id="kv-ar-basket"'))
  assert.ok(!grid.includes('id="kv-3d-basket"'))
  assert.ok(!grid.includes('id="kv-ar-devices"'))
  assert.ok(!grid.includes('data-i18n="kpi_ar_basket"'))
  assert.ok(!grid.includes('data-i18n="kpi_3d_basket"'))
  assert.ok(!grid.includes('data-i18n="kpi_ar_devices"'))

  assert.match(grid, /data-i18n="kpi_adds"[\s\S]*id="kv-adds"/)
  assert.match(grid, /data-i18n="kpi_ar_dur"[\s\S]*id="kv-ar-dur"/)
})

test('removed overview KPI translations and DOM updates are not retained', () => {
  for (const token of [
    'kpi_ar_basket',
    'kpi_ar_basket_sub',
    'kpi_3d_basket',
    'kpi_3d_basket_sub',
    'kpi_ar_devices',
    'kpi_ar_devices_sub',
    "getElementById('kv-ar-basket')",
    "getElementById('kv-3d-basket')",
    "getElementById('kv-ar-devices')",
    'AR→Basket',
    '3D→Basket',
    'AR Devices',
    'AR→კალათი',
    '3D→კალათი',
    'AR მოწყობ.',
  ]) {
    assert.ok(!html.includes(token), `Removed KPI token should stay absent: ${token}`)
  }

  assert.match(html, /kpi_adds:'Basket Adds'/)
  assert.match(html, /kpi_ar_dur:'Avg AR Duration'/)
})
