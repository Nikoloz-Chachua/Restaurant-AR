'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/useLang'
import { usePlan } from '@/lib/usePlan'
import type { Object3D, Mesh, MeshStandardMaterial } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Convert a GLB File to a seated, scaled USDZ Blob entirely in the browser, using
// the same three.js exporter model-viewer runs on-device — but ONCE, at upload
// time, instead of on every iPhone tap. three is loaded lazily so it never weighs
// down the rest of the admin panel.
async function glbToUsdz(file: File, arScale: number): Promise<Blob> {
  const [THREE, { GLTFLoader }, { USDZExporter }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/exporters/USDZExporter.js'),
  ])
  const buffer = await file.arrayBuffer()
  const loader = new GLTFLoader()
  const gltf = await new Promise<GLTF>((resolve, reject) =>
    loader.parse(buffer, '', resolve, err => reject(err)),
  )
  const root = gltf.scene

  // Quick Look renders metallic far shinier than the on-screen WebGL view; zero it
  // so the iPhone model matches what people see in the menu.
  root.traverse((n: Object3D) => {
    const mesh = n as Mesh
    if (!mesh.isMesh || !mesh.material) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    mats.forEach(m => { const mat = m as MeshStandardMaterial; if ('metalness' in mat) mat.metalness = 0 })
  })

  // Bake ar_scale in, then seat the model so its bounding-box bottom sits at y=0.
  // Quick Look drops the raw origin onto the surface, so centred models would sink
  // halfway into the table without this.
  //
  // iPhone Quick Look plants models at true real-world size, which reads smaller than
  // the auto-framed Android view. IOS_AR_BOOST scales the USDZ up so the iPhone AR size
  // visually matches Android. Tune this one number if it's too big/small (re-upload to
  // apply). Android is unaffected — it never uses the USDZ.
  const IOS_AR_BOOST = 2.5
  const scale = (arScale || 1.0) * IOS_AR_BOOST
  root.scale.setScalar(scale)
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  if (isFinite(box.min.y)) {
    root.position.y -= box.min.y
    root.updateMatrixWorld(true)
  }

  const exporter = new USDZExporter()
  const data = await exporter.parseAsync(root)
  return new Blob([data as BlobPart], { type: 'model/vnd.usdz+zip' })
}

type Category = { id: number; name_en: string; name_ka: string; sort_order: number }
type MenuItem = {
  id: number; name_en: string; name_ka: string
  description_en: string; description_ka: string
  price: string; category_id: number | null; model: string; model_usdz: string
  sort_order: number; visible: boolean; ar_scale: number; thumbnail_url: string; thumb_3d: boolean
}
const EMPTY_ITEM: Omit<MenuItem, 'id'> = {
  name_en: '', name_ka: '', description_en: '', description_ka: '',
  price: '', category_id: null, model: '', model_usdz: '', sort_order: 0, visible: true, ar_scale: 1.0, thumbnail_url: '', thumb_3d: false,
}

function isActiveArItem(item: Pick<MenuItem, 'visible' | 'model'>) {
  return item.visible && item.model.trim().length > 0
}

export default function MenuPage() {
  const supabase = createClient()
  const [T] = useLang()
  const plan = usePlan()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems]           = useState<MenuItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'items' | 'categories'>('items')

  const [itemModal, setItemModal]   = useState(false)
  const [editItem, setEditItem]     = useState<MenuItem | null>(null)
  const [itemForm, setItemForm]     = useState<Omit<MenuItem, 'id'>>(EMPTY_ITEM)
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState<number | null>(null)

  const [catModal, setCatModal]         = useState(false)
  const [editCat, setEditCat]           = useState<Category | null>(null)
  const [catForm, setCatForm]           = useState({ name_en: '', name_ka: '', sort_order: 0 })
  const [deleteCatId, setDeleteCatId]   = useState<number | null>(null)

  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [thumbUploading, setThumbUploading] = useState(false)
  const [thumbProgress, setThumbProgress] = useState('')
  const thumbInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: cats }, { data: its }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('menu_items').select('*').order('category_id').order('sort_order'),
    ])
    setCategories(cats || [])
    setItems(its || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const activeArItemCount = items.filter(isActiveArItem).length
  const itemLimitLabel = plan.itemLimit === null ? 'Unlimited' : String(plan.itemLimit)
  const planLimitReached = plan.itemLimit !== null && activeArItemCount >= plan.itemLimit

  function activeCountWithForm() {
    const existingItems = editItem ? items.filter(item => item.id !== editItem.id) : items
    const formItem = { visible: itemForm.visible, model: itemForm.model }
    return existingItems.filter(isActiveArItem).length + (isActiveArItem(formItem) ? 1 : 0)
  }

  function openNewItem() {
    setEditItem(null)
    setItemForm({ ...EMPTY_ITEM, category_id: categories[0]?.id ?? null })
    setItemModal(true)
  }
  function openEditItem(item: MenuItem) {
    setEditItem(item)
    setItemForm({ name_en: item.name_en, name_ka: item.name_ka,
      description_en: item.description_en, description_ka: item.description_ka,
      price: item.price, category_id: item.category_id, model: item.model, model_usdz: item.model_usdz ?? '',
      sort_order: item.sort_order, visible: item.visible, ar_scale: item.ar_scale ?? 1.0,
      thumbnail_url: item.thumbnail_url ?? '', thumb_3d: item.thumb_3d ?? false })
    setItemModal(true)
  }
  async function saveItem() {
    if (plan.itemLimit !== null && activeCountWithForm() > plan.itemLimit) {
      flash(`Plan limit reached: ${activeArItemCount} / ${plan.itemLimit} active AR items.`)
      return
    }
    setSaving(true)
    if (editItem) {
      await supabase.from('menu_items').update(itemForm).eq('id', editItem.id)
    } else {
      await supabase.from('menu_items').insert(itemForm)
    }
    setSaving(false); setItemModal(false); setUploadProgress(''); setThumbProgress(''); await load()
    flash(editItem ? T.itemUpdated : T.itemAdded)
  }
  async function confirmDelete() {
    if (!deleteId) return
    await supabase.from('menu_items').delete().eq('id', deleteId)
    setDeleteId(null); await load(); flash(T.itemDeleted)
  }

  function openNewCat() {
    setEditCat(null)
    setCatForm({ name_en: '', name_ka: '', sort_order: categories.length + 1 })
    setCatModal(true)
  }
  function openEditCat(cat: Category) {
    setEditCat(cat)
    setCatForm({ name_en: cat.name_en, name_ka: cat.name_ka, sort_order: cat.sort_order })
    setCatModal(true)
  }
  async function saveCat() {
    setSaving(true)
    if (editCat) {
      await supabase.from('categories').update(catForm).eq('id', editCat.id)
    } else {
      await supabase.from('categories').insert(catForm)
    }
    setSaving(false); setCatModal(false); await load()
    flash(editCat ? T.catUpdated : T.catAdded)
  }
  async function confirmDeleteCat() {
    if (!deleteCatId) return
    await supabase.from('categories').delete().eq('id', deleteCatId)
    setDeleteCatId(null); await load(); flash(T.catDeleted)
  }

  const catName = (id: number | null) =>
    categories.find(c => c.id === id)?.name_en ?? '—'

  async function toWebP(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d')!.drawImage(img, 0, 0)
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Conversion failed')), 'image/webp', 0.88)
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')) }
      img.src = url
    })
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith('image/')) {
      setThumbProgress('Only image files supported (jpg, png, webp, avif…)')
      return
    }
    setThumbUploading(true)
    setThumbProgress(T.uploading)
    let blob: Blob
    try {
      blob = await toWebP(file)
    } catch {
      setThumbProgress('Could not process image')
      setThumbUploading(false)
      return
    }
    const filename = `thumb_${Date.now()}.webp`
    const { error } = await supabase.storage.from('thumbnails').upload(filename, blob, {
      contentType: 'image/webp',
      upsert: false,
    })
    if (error) {
      setThumbProgress(`Upload failed: ${error.message}`)
      setThumbUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(filename)
    setItemForm(f => ({ ...f, thumbnail_url: publicUrl }))
    setThumbProgress(`✓ ${file.name}`)
    setThumbUploading(false)
  }

  async function uploadGLB(file: File) {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setUploadProgress('Only .glb files are supported')
      return
    }
    setUploading(true)
    setUploadProgress(T.uploading)
    try {
      // Step 1: get a presigned URL from the server (no file data sent here)
      const res = await fetch('/api/r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }
      const { uploadUrl, publicUrl } = await res.json()

      // Step 2: upload directly to R2 — bypasses Next.js entirely, no size limit
      const upload = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'model/gltf-binary' },
        body: file,
      })
      if (!upload.ok) throw new Error(`R2 upload failed: ${upload.status}`)

      setItemForm(f => ({ ...f, model: publicUrl, model_usdz: '' }))
      setUploadProgress(`✓ ${file.name}`)

      // Step 3: convert GLB → USDZ in the browser for iOS Quick Look. Non-blocking:
      // the GLB is already saved above, so if conversion fails the menu still works
      // (iOS just falls back to the on-device path, same as before this feature).
      try {
        setUploadProgress(`✓ ${file.name} — building iPhone AR…`)
        const usdzBlob = await glbToUsdz(file, itemForm.ar_scale)
        const usdzName = file.name.replace(/\.glb$/i, '.usdz')
        const pres = await fetch('/api/r2-presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: usdzName }),
        })
        if (!pres.ok) throw new Error(`presign ${pres.status}`)
        const { uploadUrl: usdzUrl, publicUrl: usdzPublic } = await pres.json()
        const put = await fetch(usdzUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'model/vnd.usdz+zip' },
          body: usdzBlob,
        })
        if (!put.ok) throw new Error(`R2 upload ${put.status}`)
        setItemForm(f => ({ ...f, model_usdz: usdzPublic }))
        setUploadProgress(`✓ ${file.name} (+ iPhone AR ✓)`)
      } catch (e) {
        console.warn('USDZ conversion skipped:', e)
        setUploadProgress(`✓ ${file.name} (saved — iPhone AR conversion skipped)`)
      }
    } catch (e) {
      setUploadProgress(`Upload failed: ${e instanceof Error ? e.message : String(e)}`)
    }
    setUploading(false)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold page-title" style={{ color: 'var(--gold)' }}>{T.menuTitle}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--dim)' }}>{T.menuDesc}</p>
        </div>
        {msg && (
          <span className="text-sm px-3 py-1.5 rounded-lg shrink-0"
                style={{ background: 'rgba(76,175,125,0.15)', color: 'var(--success)' }}>
            {msg}
          </span>
        )}
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit"
           style={{ background: 'var(--card)' }}>
        {(['items', 'categories'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{ background: tab === t ? 'var(--gold)' : 'transparent',
                           color: tab === t ? '#0f0b07' : 'var(--dim)' }}>
            {t === 'items'
              ? `${T.tabItems} (${items.length})`
              : `${T.tabCategories} (${categories.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--dim)' }}>{T.loading}</p>
      ) : tab === 'items' ? (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button onClick={openNewItem}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--gold)', color: '#0f0b07' }}>
              {T.addItem}
            </button>
            <span className="text-sm px-3 py-2 rounded-lg"
                  style={{ background: 'var(--card)', color: 'var(--dim)', border: '1px solid var(--border)' }}>
              Active AR items: <span style={{ color: 'var(--text)' }}>{activeArItemCount} / {itemLimitLabel}</span>
            </span>
          </div>
          {planLimitReached && plan.itemLimit !== null && (
            <div className="mb-4 rounded-xl p-3 text-sm"
                 style={{ background: 'rgba(242,181,53,0.08)', color: 'var(--dim)', border: '1px solid var(--border)' }}>
              This plan is at its active AR item limit. Hide an existing AR item or upgrade before making another modeled item visible.
            </div>
          )}
          <div className="table-scroll rounded-xl"
               style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-sm" style={{ minWidth: '600px' }}>
              <thead>
                <tr style={{ background: 'var(--card2)', borderBottom: '1px solid var(--border)' }}>
                  {[T.colName, T.colCategory, T.colPrice, T.colModel, T.colVisible, ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left font-medium"
                        style={{ color: 'var(--dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id}
                      style={{ background: i % 2 ? 'var(--card)' : 'transparent',
                               borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.name_en}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--dim)' }}>{item.name_ka}</div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--dim)' }}>
                      {catName(item.category_id)}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--gold)' }}>
                      {item.price}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--dim)', fontSize: '0.75rem' }}>
                      {item.model}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: item.visible ? 'rgba(76,175,125,0.15)' : 'rgba(224,82,82,0.12)',
                                     color: item.visible ? 'var(--success)' : 'var(--danger)' }}>
                        {item.visible ? T.visible : T.hidden}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEditItem(item)}
                                className="text-xs px-2.5 py-1 rounded"
                                style={{ background: 'var(--gold-dim, rgba(242,181,53,0.12))',
                                         color: 'var(--gold)' }}>
                          {T.edit}
                        </button>
                        <button onClick={() => setDeleteId(item.id)}
                                className="text-xs px-2.5 py-1 rounded"
                                style={{ background: 'rgba(224,82,82,0.1)',
                                         color: 'var(--danger)' }}>
                          {T.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <button onClick={openNewCat}
                  className="mb-4 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--gold)', color: '#0f0b07' }}>
            {T.addCategory}
          </button>
          <div className="table-scroll rounded-xl"
               style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-sm" style={{ minWidth: '420px' }}>
              <thead>
                <tr style={{ background: 'var(--card2)', borderBottom: '1px solid var(--border)' }}>
                  {[T.nameEn, T.nameKa, T.colSortOrder, T.colItems, ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left font-medium"
                        style={{ color: 'var(--dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, i) => (
                  <tr key={cat.id}
                      style={{ background: i % 2 ? 'var(--card)' : 'transparent',
                               borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-medium">{cat.name_en}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--dim)' }}>{cat.name_ka}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--dim)' }}>{cat.sort_order}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--dim)' }}>
                      {items.filter(it => it.category_id === cat.id).length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEditCat(cat)}
                                className="text-xs px-2.5 py-1 rounded"
                                style={{ background: 'var(--gold-dim, rgba(242,181,53,0.12))',
                                         color: 'var(--gold)' }}>
                          {T.edit}
                        </button>
                        <button onClick={() => setDeleteCatId(cat.id)}
                                className="text-xs px-2.5 py-1 rounded"
                                style={{ background: 'rgba(224,82,82,0.1)',
                                         color: 'var(--danger)' }}>
                          {T.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {itemModal && (
        <Modal title={editItem ? T.editItemTitle : T.addItemTitle} onClose={() => setItemModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Field label={T.nameEn}>
              <input value={itemForm.name_en} onChange={e => setItemForm(f => ({ ...f, name_en: e.target.value }))} />
            </Field>
            <Field label={T.nameKa}>
              <input value={itemForm.name_ka} onChange={e => setItemForm(f => ({ ...f, name_ka: e.target.value }))} />
            </Field>
            <Field label={T.descEn} className="col-span-2">
              <textarea rows={2} value={itemForm.description_en}
                        onChange={e => setItemForm(f => ({ ...f, description_en: e.target.value }))} />
            </Field>
            <Field label={T.descKa} className="col-span-2">
              <textarea rows={2} value={itemForm.description_ka}
                        onChange={e => setItemForm(f => ({ ...f, description_ka: e.target.value }))} />
            </Field>
            <Field label={T.priceLabel}>
              <input value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} />
            </Field>
            <Field label={T.categoryLabel}>
              <select value={itemForm.category_id ?? ''}
                      onChange={e => setItemForm(f => ({ ...f, category_id: Number(e.target.value) }))}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
              </select>
            </Field>
            <Field label={T.model3d} className="col-span-2">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button type="button" disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded text-xs font-medium"
                          style={{ background: 'var(--card2)', color: 'var(--gold)',
                                   border: '1px solid var(--border)', opacity: uploading ? 0.5 : 1 }}>
                    {uploading ? T.uploading : T.uploadGlb}
                  </button>
                  <input ref={fileInputRef} type="file" accept=".glb" style={{ display: 'none' }}
                         onChange={e => { const f = e.target.files?.[0]; if (f) uploadGLB(f); e.target.value = '' }} />
                </div>
                <div className="text-xs px-2 py-1.5 rounded truncate"
                     style={{ background: 'var(--card2)', color: 'var(--dim)', border: '1px solid var(--border)' }}>
                  {uploadProgress
                    ? <span style={{ color: uploadProgress.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>{uploadProgress}</span>
                    : itemForm.model
                      ? <span>{T.current}<span style={{ color: 'var(--text)' }}>{itemForm.model.startsWith('http') ? itemForm.model.split('/').pop() : itemForm.model}</span></span>
                      : <span style={{ color: 'var(--dim)' }}>{T.noModel}</span>
                  }
                </div>
              </div>
            </Field>
            <Field label={T.thumbnailLabel} className="col-span-2">
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <button type="button" disabled={thumbUploading}
                          onClick={() => thumbInputRef.current?.click()}
                          className="px-3 py-1.5 rounded text-xs font-medium"
                          style={{ background: 'var(--card2)', color: 'var(--gold)',
                                   border: '1px solid var(--border)', opacity: thumbUploading ? 0.5 : 1 }}>
                    {thumbUploading ? T.uploading : T.uploadThumb}
                  </button>
                  {itemForm.thumbnail_url && (
                    <button type="button"
                            onClick={() => { setItemForm(f => ({ ...f, thumbnail_url: '', thumb_3d: false })); setThumbProgress('') }}
                            className="px-3 py-1.5 rounded text-xs font-medium"
                            style={{ background: 'rgba(224,82,82,0.1)', color: 'var(--danger)', border: '1px solid rgba(224,82,82,0.25)' }}>
                      {T.clearThumb}
                    </button>
                  )}
                  {itemForm.thumbnail_url && (
                    <img src={itemForm.thumbnail_url} alt="thumbnail preview"
                         style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6,
                                  border: '1px solid var(--border)' }} />
                  )}
                  <input ref={thumbInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                         onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = '' }} />
                </div>
                <div className="text-xs px-2 py-1.5 rounded truncate"
                     style={{ background: 'var(--card2)', color: 'var(--dim)', border: '1px solid var(--border)' }}>
                  {thumbProgress
                    ? <span style={{ color: thumbProgress.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>{thumbProgress}</span>
                    : itemForm.thumbnail_url
                      ? <span>{T.current}<span style={{ color: 'var(--text)' }}>{itemForm.thumbnail_url.split('/').pop()}</span></span>
                      : <span style={{ color: 'var(--dim)' }}>{T.noThumbnail}</span>
                  }
                </div>
              </div>
            </Field>
            {itemForm.thumbnail_url && (
              <Field label={T.thumb3dLabel} className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={itemForm.thumb_3d} style={{ width: 'auto' }}
                         onChange={e => setItemForm(f => ({ ...f, thumb_3d: e.target.checked }))} />
                  <span className="text-sm" style={{ color: 'var(--dim)' }}>{T.thumb3dHint}</span>
                </label>
              </Field>
            )}
            <Field label={T.sortOrder}>
              <input type="number" value={itemForm.sort_order}
                     onChange={e => setItemForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </Field>
            <Field label={T.arScale}>
              <input type="number" min="0.01" max="10" step="0.05"
                     value={itemForm.ar_scale}
                     onChange={e => setItemForm(f => ({ ...f, ar_scale: Number(e.target.value) }))} />
              <p className="text-xs mt-1" style={{ color: 'var(--dim)' }}>{T.arScaleHint}</p>
            </Field>
            <Field label={T.visibility} className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={itemForm.visible} style={{ width: 'auto' }}
                       onChange={e => {
                         const next = { ...itemForm, visible: e.target.checked }
                         const existingItems = editItem ? items.filter(item => item.id !== editItem.id) : items
                         const nextCount = existingItems.filter(isActiveArItem).length + (isActiveArItem(next) ? 1 : 0)
                         if (plan.itemLimit !== null && nextCount > plan.itemLimit) {
                           flash(`Plan limit reached: ${activeArItemCount} / ${plan.itemLimit} active AR items.`)
                           return
                         }
                         setItemForm(next)
                       }} />
                <span className="text-sm" style={{ color: 'var(--dim)' }}>{T.visibleOnMenu}</span>
              </label>
              {plan.itemLimit !== null && (
                <p className="text-xs mt-1" style={{ color: 'var(--dim)' }}>
                  Active AR items count only visible items with a 3D model.
                </p>
              )}
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setItemModal(false)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ color: 'var(--dim)', border: '1px solid var(--border)' }}>
              {T.cancel}
            </button>
            <button onClick={saveItem} disabled={saving}
                    className="px-5 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--gold)', color: '#0f0b07', opacity: saving ? 0.6 : 1 }}>
              {saving ? T.saving : T.save}
            </button>
          </div>
        </Modal>
      )}

      {catModal && (
        <Modal title={editCat ? T.editCatTitle : T.addCatTitle} onClose={() => setCatModal(false)}>
          <div className="space-y-4">
            <Field label={T.nameEn}>
              <input value={catForm.name_en} onChange={e => setCatForm(f => ({ ...f, name_en: e.target.value }))} />
            </Field>
            <Field label={T.nameKa}>
              <input value={catForm.name_ka} onChange={e => setCatForm(f => ({ ...f, name_ka: e.target.value }))} />
            </Field>
            <Field label={T.sortOrder}>
              <input type="number" value={catForm.sort_order}
                     onChange={e => setCatForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setCatModal(false)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ color: 'var(--dim)', border: '1px solid var(--border)' }}>
              {T.cancel}
            </button>
            <button onClick={saveCat} disabled={saving}
                    className="px-5 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--gold)', color: '#0f0b07', opacity: saving ? 0.6 : 1 }}>
              {saving ? T.saving : T.save}
            </button>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title={T.deleteItemTitle} onClose={() => setDeleteId(null)}>
          <p className="text-sm mb-6" style={{ color: 'var(--dim)' }}>{T.deleteItemText}</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ color: 'var(--dim)', border: '1px solid var(--border)' }}>
              {T.cancel}
            </button>
            <button onClick={confirmDelete}
                    className="px-5 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--danger)', color: '#fff' }}>
              {T.delete}
            </button>
          </div>
        </Modal>
      )}

      {deleteCatId && (
        <Modal title={T.deleteCatTitle} onClose={() => setDeleteCatId(null)}>
          <p className="text-sm mb-6" style={{ color: 'var(--dim)' }}>{T.deleteCatText}</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteCatId(null)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ color: 'var(--dim)', border: '1px solid var(--border)' }}>
              {T.cancel}
            </button>
            <button onClick={confirmDeleteCat}
                    className="px-5 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--danger)', color: '#fff' }}>
              {T.delete}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
           style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: 'var(--dim)' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs mb-1.5 uppercase tracking-widest"
             style={{ color: 'var(--dim)' }}>{label}</label>
      {children}
    </div>
  )
}
