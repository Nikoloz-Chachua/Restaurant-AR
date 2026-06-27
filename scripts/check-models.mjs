#!/usr/bin/env node
// check-models.mjs — verify every model/model_usdz/thumbnail URL referenced by
// the LIVE Supabase menu (visible items) actually resolves on R2.
//
// Why: on 2026-06-23 the visible menu_items rows pointed to R2 objects that had
// been removed, so the live menu served 404s for every 3D model while Supabase
// itself was healthy. The breakage was invisible until viewed on a real device.
// This turns that silent failure into a one-command check.
//
//   node scripts/check-models.mjs
//
// Exits 0 if all assets resolve, 1 if any are missing (CI / cron friendly).

const SUPABASE_URL  = 'https://lwdpegloznhpcecivhfy.supabase.co';
const SUPABASE_ANON = 'sb_publishable_65dKKpb-lxOr8JTjdj7yxw_LZzcJp5h';

const headers = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };

// A range request (0-0) is enough to confirm an object exists without downloading it.
async function exists(url) {
    try {
        const res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
        return res.status === 200 || res.status === 206;
    } catch {
        return false;
    }
}

const res = await fetch(
    `${SUPABASE_URL}/rest/v1/menu_items?select=id,name_en,model,model_usdz,thumbnail_url&visible=eq.true`,
    { headers }
);
if (!res.ok) {
    console.error(`✗ Could not read menu_items from Supabase (HTTP ${res.status})`);
    process.exit(1);
}
const items = await res.json();

// Build the full list of (item, field, url) tuples to check.
const checks = [];
for (const it of items) {
    for (const field of ['model', 'model_usdz', 'thumbnail_url']) {
        const url = it[field];
        if (url) checks.push({ id: it.id, name: it.name_en, field, url });
    }
}

const results = await Promise.all(
    checks.map(async c => ({ ...c, ok: await exists(c.url) }))
);

let bad = 0;
for (const r of results) {
    const mark = r.ok ? '✓' : '✗';
    if (!r.ok) bad++;
    console.log(`${mark} [${r.id}] ${r.name} · ${r.field}\n    ${r.url}`);
}

console.log(`\n${results.length - bad}/${results.length} assets OK across ${items.length} visible items.`);
if (bad) {
    console.error(`\n✗ ${bad} asset(s) missing — the live menu will show broken 3D/AR for these.`);
    process.exit(1);
}
console.log('✓ All live-menu assets resolve.');
