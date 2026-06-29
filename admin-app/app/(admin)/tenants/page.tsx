'use client'
import { useCallback, useEffect, useState } from 'react'
import { usePlan } from '@/lib/usePlan'
import LockedCard from '@/components/LockedCard'

type Restaurant = {
  id: number
  name: string
  slug: string
  status: string
  custom_domain: string | null
}

type Brand = {
  id: number
  name: string
  slug: string
  plan: 'ar_menu' | 'full' | 'premium'
  created_at: string
  restaurants?: Restaurant[]
}

const PLAN_LABELS: Record<Brand['plan'], string> = {
  ar_menu: 'AR Menu 300',
  full: 'Full 450',
  premium: 'Premium 900',
}

const CUSTOMER_APP_URL = (process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || 'https://restaurant-ar.pages.dev').replace(/\/$/, '')

function tenantPreviewUrl(slug: string) {
  return `${CUSTOMER_APP_URL}/?tenant=${encodeURIComponent(slug)}`
}

function tenantAdminUrl(slug: string) {
  return `/menu?tenant=${encodeURIComponent(slug)}`
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function TenantsPage() {
  const access = usePlan()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    brandName: '',
    brandSlug: '',
    restaurantName: '',
    restaurantSlug: '',
    plan: 'ar_menu' as Brand['plan'],
    primaryColor: '',
    secondaryColor: '',
    createStarterCategory: true,
    adminEmail: '',
    adminPassword: '',
  })

  const load = useCallback(async () => {
    if (!access.canManageTenants) {
      setLoading(access.loading)
      return
    }
    setLoading(true)
    const res = await fetch('/api/tenants')
    const json = await res.json().catch(() => ({}))
    if (res.ok) setBrands(json.brands ?? [])
    else setMessage(json.error || 'Could not load tenants')
    setLoading(false)
  }, [access.canManageTenants, access.loading])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(current => {
      const next = { ...current, [key]: value }
      if (key === 'brandName' && !current.brandSlug) next.brandSlug = slugify(String(value))
      if ((key === 'brandName' || key === 'brandSlug') && !current.restaurantSlug) {
        next.restaurantSlug = `${slugify(key === 'brandSlug' ? String(value) : next.brandSlug)}-main`
      }
      if (key === 'restaurantName' && !current.restaurantName) next.restaurantName = String(value)
      return next
    })
  }

  async function createTenant() {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(json.error || 'Tenant creation failed')
      return
    }
    setMessage(`Created ${json.brand.name}. Live shared-template URL: ${json.previewUrl}`)
    setForm({
      brandName: '',
      brandSlug: '',
      restaurantName: '',
      restaurantSlug: '',
      plan: 'ar_menu',
      primaryColor: '',
      secondaryColor: '',
      createStarterCategory: true,
      adminEmail: '',
      adminPassword: '',
    })
    await load()
  }

  async function deleteTenant(brand: Brand) {
    if (brand.slug === 'burger-lions') {
      setMessage('Burger Lions is protected and cannot be deleted from this panel')
      return
    }
    if (!window.confirm(`Delete ${brand.name}? This removes its restaurants, menu, categories, theme rows, and live tenant link.`)) return
    setSaving(true)
    setMessage('')
    const res = await fetch(`/api/tenants?brandId=${brand.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(json.error || 'Tenant deletion failed')
      return
    }
    setMessage(`Deleted ${brand.name}`)
    await load()
  }

  if (!access.loading && !access.canManageTenants) {
    return (
      <LockedCard
        title="Tenant management is super-admin only"
        description="Creating restaurants, managing plans, and cross-tenant access belong to the BetaReal team role."
        planLabel={access.label}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold page-title" style={{ color: 'var(--gold)' }}>Tenants</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--dim)' }}>
            Create restaurants by database rows for the shared WebAR template.
          </p>
        </div>
        {message && (
          <span className="text-sm px-3 py-1.5 rounded-lg max-w-xl"
                style={{ background: 'rgba(242,181,53,0.1)', color: 'var(--gold)', border: '1px solid var(--border)' }}>
            {message}
          </span>
        )}
      </div>

      <section className="mb-8 p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>Create Tenant</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Brand name">
            <input value={form.brandName} onChange={e => update('brandName', e.target.value)} placeholder="New restaurant company" />
          </Field>
          <Field label="Brand slug">
            <input value={form.brandSlug} onChange={e => update('brandSlug', slugify(e.target.value))} placeholder="new-client" />
          </Field>
          <Field label="First branch name">
            <input value={form.restaurantName} onChange={e => update('restaurantName', e.target.value)} placeholder="Main branch" />
          </Field>
          <Field label="Branch slug">
            <input value={form.restaurantSlug} onChange={e => update('restaurantSlug', slugify(e.target.value))} placeholder="new-client-main" />
          </Field>
          <Field label="Plan">
            <select value={form.plan} onChange={e => update('plan', e.target.value as Brand['plan'])}>
              <option value="ar_menu">AR Menu 300</option>
              <option value="full">Full 450</option>
              <option value="premium">Premium 900</option>
            </select>
          </Field>
          <Field label="Starter content">
            <select
              value={form.createStarterCategory ? 'featured' : 'none'}
              onChange={e => update('createStarterCategory', e.target.value === 'featured')}
            >
              <option value="featured">Shared template starter category</option>
              <option value="none">No category yet</option>
            </select>
          </Field>
          <Field label="Primary color">
            <input value={form.primaryColor} onChange={e => update('primaryColor', e.target.value)} placeholder="#f2b535" />
          </Field>
          <Field label="Secondary color">
            <input value={form.secondaryColor} onChange={e => update('secondaryColor', e.target.value)} placeholder="#c07808" />
          </Field>
          <Field label="Admin email">
            <input
              type="email"
              value={form.adminEmail}
              onChange={e => update('adminEmail', e.target.value)}
              placeholder="owner@example.com"
            />
          </Field>
          <Field label="Admin password">
            <input
              type="password"
              value={form.adminPassword}
              onChange={e => update('adminPassword', e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={createTenant} disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--gold)', color: '#0f0b07', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Creating...' : 'Create tenant'}
          </button>
          <span className="text-xs" style={{ color: 'var(--dim)' }}>
            Creates DB rows and gives a working shared-template URL. Custom domains/Vercel aliases are separate infrastructure.
          </span>
        </div>
      </section>

      {loading ? (
        <p style={{ color: 'var(--dim)' }}>Loading...</p>
      ) : (
        <div className="table-scroll rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm" style={{ minWidth: '760px' }}>
            <thead>
              <tr style={{ background: 'var(--card2)', borderBottom: '1px solid var(--border)' }}>
                {['Brand', 'Plan', 'Branches', 'Shared-template URL', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: 'var(--dim)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brands.map((brand, i) => {
                const first = brand.restaurants?.[0]
                return (
                  <tr key={brand.id}
                      style={{ background: i % 2 ? 'var(--card)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      {first ? (
                        <a href={tenantAdminUrl(first.slug)} className="font-medium hover:underline" style={{ color: 'var(--text)' }}>
                          {brand.name}
                        </a>
                      ) : <div className="font-medium">{brand.name}</div>}
                      <div className="text-xs mt-0.5" style={{ color: 'var(--dim)' }}>{brand.slug}</div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--gold)' }}>{PLAN_LABELS[brand.plan]}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--dim)' }}>
                      {(brand.restaurants ?? []).length ? (brand.restaurants ?? []).map((r, idx) => (
                        <span key={r.id}>
                          {idx > 0 ? ', ' : ''}
                          <a href={tenantAdminUrl(r.slug)} className="hover:underline" style={{ color: 'var(--gold)' }}>
                            {r.name}
                          </a>
                        </span>
                      )) : 'None'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--dim)' }}>
                      {first ? (
                        <a href={tenantPreviewUrl(first.slug)} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>
                          {tenantPreviewUrl(first.slug)}
                        </a>
                      ) : 'Pending first branch'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: first?.status === 'active' ? 'rgba(76,175,125,0.15)' : 'rgba(224,82,82,0.12)',
                                     color: first?.status === 'active' ? 'var(--success)' : 'var(--danger)' }}>
                        {first?.status ?? 'none'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void deleteTenant(brand)}
                        disabled={saving || brand.slug === 'burger-lions'}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                          border: '1px solid rgba(224,82,82,0.35)',
                          color: brand.slug === 'burger-lions' ? 'var(--dim)' : 'var(--danger)',
                          opacity: saving || brand.slug === 'burger-lions' ? 0.5 : 1,
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs mb-1 uppercase" style={{ color: 'var(--dim)' }}>{label}</div>
      {children}
    </label>
  )
}
