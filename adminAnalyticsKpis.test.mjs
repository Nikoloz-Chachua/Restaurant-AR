import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const files = {
  tenant: readFileSync(new URL('./admin.html', import.meta.url), 'utf8'),
  developer: readFileSync(new URL('./dev-analytics.html', import.meta.url), 'utf8'),
}

function overviewKpiGrid(html) {
  const match = html.match(/<div class="section-label" data-i18n="sec_overview">[\s\S]*?<div class="kpi-grid">([\s\S]*?)<div class="insight-row" id="insights">/)
  assert.ok(match, 'Missing overview KPI grid')
  return match[1]
}

test('tenant analytics overview omits attribution/device KPIs while keeping core cards', () => {
  const grid = overviewKpiGrid(files.tenant)

  assert.ok(!grid.includes('id="kv-ar-basket"'))
  assert.ok(!grid.includes('id="kv-3d-basket"'))
  assert.ok(!grid.includes('id="kv-ar-devices"'))
  assert.ok(!grid.includes('data-i18n="kpi_ar_basket"'))
  assert.ok(!grid.includes('data-i18n="kpi_3d_basket"'))
  assert.ok(!grid.includes('data-i18n="kpi_ar_devices"'))

  assert.match(grid, /data-i18n="kpi_adds"[\s\S]*id="kv-adds"/)
  assert.match(grid, /data-i18n="kpi_ar_dur"[\s\S]*id="kv-ar-dur"/)
})

test('analytics overview includes unique visitor and new user cards in both pages', () => {
  for (const [name, html] of Object.entries(files)) {
    const grid = overviewKpiGrid(html)

    assert.match(grid, /data-i18n="kpi_sessions"[\s\S]*id="kv-sessions"/, `${name}: missing sessions KPI`)
    assert.match(grid, /data-i18n="kpi_unique_visitors"[\s\S]*id="kv-unique-visitors"/, `${name}: missing unique visitors KPI`)
    assert.match(grid, /data-i18n="kpi_new_users_today"[\s\S]*id="kv-new-users-today"/, `${name}: missing new users today KPI`)
    assert.match(html, /kpi_unique_visitors:'Unique Visitors'/, `${name}: missing English unique visitors label`)
    assert.match(html, /kpi_new_users_today:'New Users Today'/, `${name}: missing English new users today label`)
    assert.match(html, /kpi_unique_visitors:'უნიკალური ვიზიტორები'/, `${name}: missing Georgian unique visitors label`)
    assert.match(html, /kpi_new_users_today:'ახალი მომხმარებლები დღეს'/, `${name}: missing Georgian new users today label`)
  }
})

function metricFns(html) {
  const match = html.match(/function visitorMetricKey[\s\S]*?function countNewUsersToday\(sessions\) \{[\s\S]*?\n\}/)
  assert.ok(match, 'Missing visitor metric functions')
  const context = {}
  vm.createContext(context)
  vm.runInContext(match[0], context)
  return context
}

test('visitor metric helpers dedupe repeat page loads and count only first-time visitors today', () => {
  const today = new Date()
  const todayIso = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0).toISOString()
  const yesterdayIso = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 10, 0, 0).toISOString()
  const sessions = [
    { event: 'page_load', visitor_id: 'browser-a', session_id: 's1', created_at: todayIso, extra: { return_visitor: false } },
    { event: 'page_load', visitor_id: 'browser-a', session_id: 's2', created_at: todayIso, extra: { return_visitor: true } },
    { event: 'page_load', visitor_id: 'browser-b', session_id: 's3', created_at: todayIso, extra: { return_visitor: false } },
    { event: 'page_load', visitor_id: '', session_id: 'legacy-1', created_at: todayIso, extra: { return_visitor: false } },
    { event: 'page_load', visitor_id: null, session_id: 'legacy-1', created_at: todayIso, extra: { return_visitor: false } },
    { event: 'page_load', visitor_id: 'browser-c', session_id: 's4', created_at: yesterdayIso, extra: { return_visitor: false } },
    { event: 'page_load', visitor_id: 'browser-d', session_id: 's5', created_at: todayIso, extra: { return_visitor: true } },
    { event: 'page_load', visitor_id: '   ', session_id: '   ', created_at: todayIso, extra: { return_visitor: false } },
  ]

  for (const [name, html] of Object.entries(files)) {
    const { countUniqueVisitors, countNewUsersToday } = metricFns(html)
    assert.equal(countUniqueVisitors(sessions), 5, `${name}: unique visitors should dedupe visitor_id and legacy session_id`)
    assert.equal(countNewUsersToday(sessions), 3, `${name}: new users today should dedupe today's return_visitor=false page loads`)
  }
})

test('removed overview KPI translations and DOM updates are not retained', () => {
  const html = files.tenant
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
