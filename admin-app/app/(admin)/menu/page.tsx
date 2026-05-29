'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/useLang'

type Category = { id: number; name_en: string; name_ka: string; sort_order: number }
type MenuItem = {
  id: number; name_en: string; name_ka: string
  description_en: string; description_ka: string
  price: string; category_id: number | null; model: string
  sort_order: number; visible: boolean; ar_scale: number; thumbnail_url: string
}
const EMPTY_ITEM: Omit<MenuItem, 'id'> = {
  name_en: '', name_ka: '', description_en: '', description_ka: '',
  price: '', category_id: null, model: '', sort_order: 0, visible: true, ar_scale: 1.0, thumbnail_url: '',
}

export default function MenuPage() {
  const supabase = createClient()
  const [T] = useLang()
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

  useEffect(() => { load() }, [load])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  function openNewItem() {
    setEditItem(null)
    setItemForm({ ...EMPTY_ITEM, category_id: categories[0]?.id ?? null })
    setItemModal(true)
  }
  function openEditItem(item: MenuItem) {
    setEditItem(item)
    setItemForm({ name_en: item.name_en, name_ka: item.name_ka,
      description_en: item.description_en, description_ka: item.description_ka,
      price: item.price, category_id: item.category_id, model: item.model,
      sort_order: item.sort_order, visible: item.visible, ar_scale: item.ar_scale ?? 1.0,
      thumbnail_url: item.thumbnail_url ?? '' })
    setItemModal(true)
  }
  async function saveItem() {
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

  async function uploadImage(file: File) {
    if (!file.type.startsWith('image/')) {
      setThumbProgress('Only image files supported (jpg, png, webp, avif…)')
      return
    }
    setThumbUploading(true)
    setThumbProgress(T.uploading)
    const filename = `thumb_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('models').upload(filename, file, {
      contentType: file.type,
      upsert: false,
    })
    if (error) {
      setThumbProgress(`Upload failed: ${error.message}`)
      setThumbUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('models').getPublicUrl(filename)
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
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('models').upload(filename, file, {
      contentType: 'model/gltf-binary',
      upsert: false,
    })
    if (error) {
      setUploadProgress(`Upload failed: ${error.message}`)
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('models').getPublicUrl(filename)
    setItemForm(f => ({ ...f, model: publicUrl }))
    setUploadProgress(`✓ ${file.name}`)
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
          <button onClick={openNewItem}
                  className="mb-4 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--gold)', color: '#0f0b07' }}>
            {T.addItem}
          </button>
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
                       onChange={e => setItemForm(f => ({ ...f, visible: e.target.checked }))} />
                <span className="text-sm" style={{ color: 'var(--dim)' }}>{T.visibleOnMenu}</span>
              </label>
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
