'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Category = { id: number; name_en: string; name_ka: string; sort_order: number }
type MenuItem = {
  id: number; name_en: string; name_ka: string
  description_en: string; description_ka: string
  price: string; category_id: number | null; model: string
  sort_order: number; visible: boolean; ar_scale: number
}
const EMPTY_ITEM: Omit<MenuItem, 'id'> = {
  name_en: '', name_ka: '', description_en: '', description_ka: '',
  price: '', category_id: null, model: 'food.glb', sort_order: 0, visible: true, ar_scale: 1.0,
}
const MODELS = ['food.glb', 'Druidi.glb']

export default function MenuPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems]           = useState<MenuItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'items' | 'categories'>('items')

  // item modal state
  const [itemModal, setItemModal]   = useState(false)
  const [editItem, setEditItem]     = useState<MenuItem | null>(null)
  const [itemForm, setItemForm]     = useState<Omit<MenuItem, 'id'>>(EMPTY_ITEM)
  const [saving, setSaving]         = useState(false)
  const [deleteId, setDeleteId]     = useState<number | null>(null)

  // category modal state
  const [catModal, setCatModal]         = useState(false)
  const [editCat, setEditCat]           = useState<Category | null>(null)
  const [catForm, setCatForm]           = useState({ name_en: '', name_ka: '', sort_order: 0 })
  const [deleteCatId, setDeleteCatId]   = useState<number | null>(null)

  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // ── Item CRUD
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
      sort_order: item.sort_order, visible: item.visible, ar_scale: item.ar_scale ?? 1.0 })
    setItemModal(true)
  }
  async function saveItem() {
    setSaving(true)
    if (editItem) {
      await supabase.from('menu_items').update(itemForm).eq('id', editItem.id)
    } else {
      await supabase.from('menu_items').insert(itemForm)
    }
    setSaving(false); setItemModal(false); setUploadProgress(''); await load()
    flash(editItem ? 'Item updated.' : 'Item added.')
  }
  async function confirmDelete() {
    if (!deleteId) return
    await supabase.from('menu_items').delete().eq('id', deleteId)
    setDeleteId(null); await load(); flash('Item deleted.')
  }

  // ── Category CRUD
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
    flash(editCat ? 'Category updated.' : 'Category added.')
  }
  async function confirmDeleteCat() {
    if (!deleteCatId) return
    await supabase.from('categories').delete().eq('id', deleteCatId)
    setDeleteCatId(null); await load(); flash('Category deleted.')
  }

  const catName = (id: number | null) =>
    categories.find(c => c.id === id)?.name_en ?? '—'

  async function uploadGLB(file: File) {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setUploadProgress('Only .glb files are supported')
      return
    }
    setUploading(true)
    setUploadProgress('Uploading…')
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>Menu Editor</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--dim)' }}>
            Changes go live instantly on the AR menu
          </p>
        </div>
        {msg && (
          <span className="text-sm px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(76,175,125,0.15)', color: 'var(--success)' }}>
            {msg}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit"
           style={{ background: 'var(--card)' }}>
        {(['items', 'categories'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{ background: tab === t ? 'var(--gold)' : 'transparent',
                           color: tab === t ? '#0f0b07' : 'var(--dim)' }}>
            {t === 'items' ? `Menu Items (${items.length})` : `Categories (${categories.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--dim)' }}>Loading…</p>
      ) : tab === 'items' ? (
        <>
          <button onClick={openNewItem}
                  className="mb-4 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--gold)', color: '#0f0b07' }}>
            + Add Item
          </button>
          <div className="rounded-xl overflow-hidden"
               style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--card2)', borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Category', 'Price', 'Model', 'Visible', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium"
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
                        {item.visible ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEditItem(item)}
                                className="text-xs px-2.5 py-1 rounded"
                                style={{ background: 'var(--gold-dim, rgba(242,181,53,0.12))',
                                         color: 'var(--gold)' }}>
                          Edit
                        </button>
                        <button onClick={() => setDeleteId(item.id)}
                                className="text-xs px-2.5 py-1 rounded"
                                style={{ background: 'rgba(224,82,82,0.1)',
                                         color: 'var(--danger)' }}>
                          Delete
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
            + Add Category
          </button>
          <div className="rounded-xl overflow-hidden"
               style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--card2)', borderBottom: '1px solid var(--border)' }}>
                  {['Name (EN)', 'Name (KA)', 'Sort Order', 'Items', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium"
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
                          Edit
                        </button>
                        <button onClick={() => setDeleteCatId(cat.id)}
                                className="text-xs px-2.5 py-1 rounded"
                                style={{ background: 'rgba(224,82,82,0.1)',
                                         color: 'var(--danger)' }}>
                          Delete
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

      {/* Item Modal */}
      {itemModal && (
        <Modal title={editItem ? 'Edit Item' : 'Add Item'} onClose={() => setItemModal(false)}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name (English)">
              <input value={itemForm.name_en} onChange={e => setItemForm(f => ({ ...f, name_en: e.target.value }))} />
            </Field>
            <Field label="Name (Georgian)">
              <input value={itemForm.name_ka} onChange={e => setItemForm(f => ({ ...f, name_ka: e.target.value }))} />
            </Field>
            <Field label="Description (English)" className="col-span-2">
              <textarea rows={2} value={itemForm.description_en}
                        onChange={e => setItemForm(f => ({ ...f, description_en: e.target.value }))} />
            </Field>
            <Field label="Description (Georgian)" className="col-span-2">
              <textarea rows={2} value={itemForm.description_ka}
                        onChange={e => setItemForm(f => ({ ...f, description_ka: e.target.value }))} />
            </Field>
            <Field label="Price (e.g. 27.5 ₾)">
              <input value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} />
            </Field>
            <Field label="Category">
              <select value={itemForm.category_id ?? ''}
                      onChange={e => setItemForm(f => ({ ...f, category_id: Number(e.target.value) }))}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
              </select>
            </Field>
            <Field label="3D Model" className="col-span-2">
              <div className="space-y-2">
                {/* Built-in quick-select */}
                <div className="flex gap-2">
                  {MODELS.map(m => (
                    <button key={m} type="button"
                            onClick={() => { setItemForm(f => ({ ...f, model: m })); setUploadProgress('') }}
                            className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                            style={{
                              background: itemForm.model === m ? 'var(--gold)' : 'var(--card2)',
                              color: itemForm.model === m ? '#0f0b07' : 'var(--dim)',
                              border: '1px solid var(--border)',
                            }}>
                      {m}
                    </button>
                  ))}
                  <span className="text-xs self-center px-2" style={{ color: 'var(--dim)' }}>or</span>
                  {/* Upload button */}
                  <button type="button" disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded text-xs font-medium"
                          style={{ background: 'var(--card2)', color: 'var(--gold)',
                                   border: '1px solid var(--border)', opacity: uploading ? 0.5 : 1 }}>
                    {uploading ? 'Uploading…' : '↑ Upload .glb'}
                  </button>
                  <input ref={fileInputRef} type="file" accept=".glb" style={{ display: 'none' }}
                         onChange={e => { const f = e.target.files?.[0]; if (f) uploadGLB(f); e.target.value = '' }} />
                </div>
                {/* Current value display */}
                <div className="text-xs px-2 py-1.5 rounded truncate"
                     style={{ background: 'var(--card2)', color: 'var(--dim)', border: '1px solid var(--border)' }}>
                  {uploadProgress
                    ? <span style={{ color: uploadProgress.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>{uploadProgress}</span>
                    : itemForm.model.startsWith('http')
                      ? <span>Custom: <span style={{ color: 'var(--text)' }}>{itemForm.model.split('/').pop()}</span></span>
                      : <span>Built-in: <span style={{ color: 'var(--text)' }}>{itemForm.model}</span></span>
                  }
                </div>
              </div>
            </Field>
            <Field label="Sort Order">
              <input type="number" value={itemForm.sort_order}
                     onChange={e => setItemForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </Field>
            <Field label="AR Scale">
              <input type="number" min="0.01" max="10" step="0.05"
                     value={itemForm.ar_scale}
                     onChange={e => setItemForm(f => ({ ...f, ar_scale: Number(e.target.value) }))} />
              <p className="text-xs mt-1" style={{ color: 'var(--dim)' }}>
                1.0 = default (25cm). If model looks 2× too big → set 0.5. Too small → set 2.0.
              </p>
            </Field>
            <Field label="Visibility" className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={itemForm.visible} style={{ width: 'auto' }}
                       onChange={e => setItemForm(f => ({ ...f, visible: e.target.checked }))} />
                <span className="text-sm" style={{ color: 'var(--dim)' }}>Visible on menu</span>
              </label>
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setItemModal(false)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ color: 'var(--dim)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button onClick={saveItem} disabled={saving}
                    className="px-5 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--gold)', color: '#0f0b07', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* Category Modal */}
      {catModal && (
        <Modal title={editCat ? 'Edit Category' : 'Add Category'} onClose={() => setCatModal(false)}>
          <div className="space-y-4">
            <Field label="Name (English)">
              <input value={catForm.name_en} onChange={e => setCatForm(f => ({ ...f, name_en: e.target.value }))} />
            </Field>
            <Field label="Name (Georgian)">
              <input value={catForm.name_ka} onChange={e => setCatForm(f => ({ ...f, name_ka: e.target.value }))} />
            </Field>
            <Field label="Sort Order">
              <input type="number" value={catForm.sort_order}
                     onChange={e => setCatForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </Field>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setCatModal(false)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ color: 'var(--dim)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button onClick={saveCat} disabled={saving}
                    className="px-5 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--gold)', color: '#0f0b07', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete item confirm */}
      {deleteId && (
        <Modal title="Delete Item?" onClose={() => setDeleteId(null)}>
          <p className="text-sm mb-6" style={{ color: 'var(--dim)' }}>
            This will permanently delete the item. This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ color: 'var(--dim)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button onClick={confirmDelete}
                    className="px-5 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--danger)', color: '#fff' }}>
              Delete
            </button>
          </div>
        </Modal>
      )}

      {/* Delete category confirm */}
      {deleteCatId && (
        <Modal title="Delete Category?" onClose={() => setDeleteCatId(null)}>
          <p className="text-sm mb-6" style={{ color: 'var(--dim)' }}>
            Items in this category will have their category cleared but won't be deleted.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteCatId(null)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ color: 'var(--dim)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button onClick={confirmDeleteCat}
                    className="px-5 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--danger)', color: '#fff' }}>
              Delete
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
