import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')

function cssRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'm'))
  assert.ok(match, `Missing CSS rule for ${selector}`)
  return match[1]
}

test('3D thumbnail upgrade exposes exactly one visual layer per loading state', () => {
  const viewerRule = cssRule('.thumb-wrap model-viewer')
  assert.match(viewerRule, /position:\s*absolute\b/)
  assert.match(viewerRule, /inset:\s*0\b/)
  assert.match(viewerRule, /opacity:\s*0\b/)
  assert.match(viewerRule, /visibility:\s*hidden\b/)

  const readyViewerRule = cssRule('.thumb-wrap.thumb-model-ready model-viewer')
  assert.match(readyViewerRule, /opacity:\s*1\b/)
  assert.match(readyViewerRule, /visibility:\s*visible\b/)

  const readyImgRule = cssRule('.thumb-wrap.thumb-model-ready .thumb-img')
  assert.match(readyImgRule, /visibility:\s*hidden\b/)

  const upgradeBlock = html.match(/function _upgradeThumb\(img\) \{([\s\S]*?)\n        \}\n\n        const _upgradeObserver/)
  assert.ok(upgradeBlock, 'Missing _upgradeThumb implementation')
  const upgrade = upgradeBlock[1]
  assert.ok(!/mv\.setAttribute\('poster'/.test(upgrade), 'Thumbnail model-viewer must not create a second poster layer')
  assert.match(upgrade, /wrap\.classList\.remove\('thumb-model-ready'\)/)
  assert.match(upgrade, /mv\.addEventListener\('load', \(\) => \{\s*wrap\.classList\.add\('thumb-model-ready'\);/m)
})

test('3D thumbnail frame clips media without stretching on phone and wider layouts', () => {
  const wrapRule = cssRule('.thumb-wrap')
  assert.match(wrapRule, /overflow:\s*hidden\b/)
  assert.match(wrapRule, /contain:\s*paint\b/)

  const imgRule = cssRule('.thumb-wrap .thumb-img')
  assert.match(imgRule, /object-fit:\s*cover\b/)
  assert.match(imgRule, /object-position:\s*center center\b/)

  assert.match(html, /\[data-phone-layout="twin"\] \.thumb-wrap \{[\s\S]*?aspect-ratio:\s*1 \/ 1;/)
  assert.match(html, /\[data-phone-layout="twin"\] \.thumb-wrap \.thumb-img,\s*\n\s*\[data-phone-layout="twin"\] \.thumb-wrap model-viewer \{[\s\S]*?height:\s*100%;/)
})

test('Monday Greens long 3D modal titles use tenant-gated fit styling', () => {
  const longTitleRule = cssRule('[data-tenant-slug="monday-greens"] #modal-title.modal-title-long')
  assert.match(longTitleRule, /transform:\s*translateY\(-8px\)/)
  assert.match(longTitleRule, /font-size:\s*clamp\(1\.28rem,\s*5\.8vw,\s*1\.75rem\)/)
  assert.match(longTitleRule, /max-height:\s*3\.15em\b/)

  assert.match(html, /document\.documentElement\.dataset\.tenantSlug = _tenant\.restaurant_slug/)
  assert.match(html, /modalTitle\.classList\.toggle\(\s*'modal-title-long',\s*document\.documentElement\.dataset\.tenantSlug === 'monday-greens' && modalName\.length >= 28\s*\)/)
})
