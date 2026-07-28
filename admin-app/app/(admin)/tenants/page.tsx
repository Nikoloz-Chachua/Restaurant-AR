'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlan } from '@/lib/usePlan'
import LockedCard from '@/components/LockedCard'
import { createClient } from '@/lib/supabase/client'
import { TEMPLATE_PRESETS, type StarterTemplateKey } from '@/lib/themePresets'
import { useLang } from '@/lib/useLang'
import { slugify } from '@/lib/adminUx'

type Restaurant = {
  id: number
  name: string
  slug: string
  status: string
  custom_domain: string | null
  managerEmails?: string[]
  managerCredentials?: AccountCredential[]
}

type Brand = {
  id: number
  name: string
  slug: string
  plan: 'ar_menu' | 'full' | 'premium'
  can_create_branches?: boolean | null
  created_at: string
  restaurants?: Restaurant[]
  adminEmails?: string[]
  adminCredentials?: AccountCredential[]
}

type AccountCredential = {
  email: string
  storedInitialPassword: string | null
}

type OneTimeCredentials = {
  brandName: string
  restaurantName: string
  adminEmail: string
  initialPassword: string
  previewUrl: string
}

type CreatedTenantResponse = {
  brand?: { id: number; name: string; slug: string; plan: Brand['plan'] }
  restaurant?: { id: number; name: string; slug: string; brand_id: number }
  adminUser?: { id: string; email: string } | null
  oneTimePassword?: string | null
  previewUrl?: string
  error?: string
}

type PlanUpdateResponse = {
  brand?: Pick<Brand, 'id' | 'name' | 'slug' | 'plan' | 'can_create_branches' | 'created_at'>
  error?: string
}

type AccountLogEntry = {
  id: string
  email: string
  appRole: string
  brandMemberships: {
    role: string
    brandId: number
    name: string
    slug: string
  }[]
  restaurantMemberships: {
    role: string
    restaurantId: number
    name: string
    slug: string
    brandName: string
    brandSlug: string
  }[]
  createdAt: string | null
  lastSignInAt: string | null
  storedInitialPassword: string | null
}

type TenantForm = {
  brandName: string
  plan: Brand['plan']
  templateKey: StarterTemplateKey
  primaryColor: string
  secondaryColor: string
  createStarterCategory: boolean
  adminEmail: string
  adminPassword: string
}
type BranchForm = {
  branchName: string
  branchArea: string
  branchSlug: string
  templateKey: StarterTemplateKey
  primaryColor: string
  secondaryColor: string
  createStarterCategory: boolean
}

const PLAN_LABELS: Record<Brand['plan'], string> = {
  ar_menu: 'AR Menu 300',
  full: 'Full 450',
  premium: 'Premium 900',
}

const PLAN_OPTIONS: { value: Brand['plan']; label: string; hint: string }[] = [
  { value: 'ar_menu', label: '300 GEL / AR Menu', hint: 'Menu, AR models, up to 5 items' },
  { value: 'full', label: '450 GEL / Full', hint: 'Theme and analytics, up to 7 items' },
  { value: 'premium', label: '900 GEL / Premium', hint: 'Unlimited menu items' },
]

const STARTER_TEMPLATE_OPTIONS = TEMPLATE_PRESETS

const CUSTOMER_APP_URL = (process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || 'https://restaurant-ar.pages.dev').replace(/\/$/, '')
const TENANT_DOMAIN_BASE = (process.env.NEXT_PUBLIC_TENANT_DOMAIN_BASE || 'betareal.ge').replace(/^https?:\/\//, '').replace(/\/$/, '')

function pagesTenantUrl(slug: string) {
  return `${CUSTOMER_APP_URL}/?tenant=${encodeURIComponent(slug)}`
}

function cleanDomain(value: string) {
  return value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\/$/, '').toLowerCase()
}

// Only subdomains that were manually added as Custom Domains on the Cloudflare
// Pages project actually resolve; every other *.betareal.ge URL hits Cloudflare
// error 1014 (CNAME Cross-User Banned) because the DNS zone and the Pages project
// live in different Cloudflare accounts. Add a slug here ONLY after its subdomain
// loads in a browser.
const WORKING_TENANT_SUBDOMAINS = new Set(['rhythm', 'monday-greens'])

function tenantPreviewUrl(restaurant: Pick<Restaurant, 'slug' | 'status' | 'custom_domain'> | string) {
  const slug = typeof restaurant === 'string' ? restaurant : restaurant.slug
  const customDomain = typeof restaurant === 'string' ? '' : cleanDomain(restaurant.custom_domain ?? '')
  if (customDomain && !customDomain.includes('pages.dev') && !customDomain.includes('localhost')) {
    return `https://${customDomain}/`
  }
  if (WORKING_TENANT_SUBDOMAINS.has(slug) && TENANT_DOMAIN_BASE && !TENANT_DOMAIN_BASE.includes('localhost')) {
    return `https://${slug}.${TENANT_DOMAIN_BASE}/`
  }
  return pagesTenantUrl(slug)
}

function tenantMenuUrl(slug: string) {
  return `/menu?tenant=${encodeURIComponent(slug)}`
}

function starterTemplate(templateKey: string) {
  return STARTER_TEMPLATE_OPTIONS.find(option => option.key === templateKey) ?? STARTER_TEMPLATE_OPTIONS[0]
}

function emptyBranchForm(): BranchForm {
  const template = starterTemplate('warm_gold')
  return {
    branchName: '',
    branchArea: '',
    branchSlug: '',
    templateKey: template.key,
    primaryColor: template.primaryColor,
    secondaryColor: template.secondaryColor,
    createStarterCategory: template.createStarterCategory,
  }
}

async function imageToWebP(file: File, loadFailedMessage: string) {
  const url = URL.createObjectURL(file)
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const maxSide = 900
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Logo conversion failed')), 'image/webp', 0.9)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(loadFailedMessage))
    }
    img.src = url
  })
}

export default function TenantsPage() {
  const access = usePlan()
  const [T] = useLang()
  const supabase = createClient()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [planDrafts, setPlanDrafts] = useState<Record<number, Brand['plan']>>({})
  const [updatingPlanBrandId, setUpdatingPlanBrandId] = useState<number | null>(null)
  const [updatingBranchEntitlementBrandId, setUpdatingBranchEntitlementBrandId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [accountLog, setAccountLog] = useState<AccountLogEntry[]>([])
  const [accountLogLoading, setAccountLogLoading] = useState(false)
  const [resettingEmail, setResettingEmail] = useState('')
  const [removingAccountId, setRemovingAccountId] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoStatus, setLogoStatus] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [credentials, setCredentials] = useState<OneTimeCredentials | null>(null)
  const [branchForm, setBranchForm] = useState<Record<number, BranchForm>>({})
  const [form, setForm] = useState<TenantForm>({
    brandName: '',
    plan: 'ar_menu' as Brand['plan'],
    templateKey: 'warm_gold',
    primaryColor: '#f2b535',
    secondaryColor: '#c07808',
    createStarterCategory: true,
    adminEmail: '',
    adminPassword: '',
  })
  const text = useCallback((template: string, values: Record<string, string | number>) => (
    Object.entries(values).reduce(
      (result, [key, value]) => result.replace(`{${key}}`, String(value)),
      template,
    )
  ), [])

  const load = useCallback(async () => {
    if (!access.canManageBranches) {
      setLoading(access.loading)
      return
    }
    setLoading(true)
    const res = await fetch(access.canManageTenants ? '/api/tenants' : '/api/branches')
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      const nextBrands = (json.brands ?? []) as Brand[]
      setBrands(nextBrands)
      setPlanDrafts(current => ({
        ...Object.fromEntries(nextBrands.map(brand => [brand.id, brand.plan])),
        ...Object.fromEntries(
          nextBrands
            .filter(brand => current[brand.id] && current[brand.id] !== brand.plan)
            .map(brand => [brand.id, current[brand.id]]),
        ),
      }))
    }
    else setMessage(json.error || T.tenantLoadFailed)
    setLoading(false)
  }, [access.canManageBranches, access.canManageTenants, access.loading, T.tenantLoadFailed])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const loadAccountLog = useCallback(async () => {
    if (!access.canManageTenants) {
      setAccountLog([])
      return
    }
    setAccountLogLoading(true)
    const res = await fetch('/api/account-log')
    const json = await res.json().catch(() => ({}))
    if (res.ok) setAccountLog(json.accounts ?? [])
    else setMessage(json.error || T.accountLogLoadFailed)
    setAccountLogLoading(false)
  }, [access.canManageTenants, T.accountLogLoadFailed])

  useEffect(() => { void Promise.resolve().then(loadAccountLog) }, [loadAccountLog])

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(current => {
      const next = { ...current, [key]: value }
      if (key === 'templateKey') {
        const template = starterTemplate(String(value))
        next.templateKey = template.key
        next.primaryColor = template.primaryColor
        next.secondaryColor = template.secondaryColor
        next.createStarterCategory = template.createStarterCategory
      }
      return next
    })
  }

  async function uploadTenantLogo(file: File, restaurant: { id: number; slug: string }) {
    if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
      throw new Error(T.svgLogosUnsupported)
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      throw new Error(T.logoTypesUnsupported)
    }
    setLogoStatus(T.uploadingLogo)
    const blob = await imageToWebP(file, T.logoLoadFailed).catch(error => {
      throw new Error(`${T.logoConversionFailed}: ${error instanceof Error ? error.message : String(error)}`)
    })
    const filename = file.name.replace(/\.[^.]+$/i, '.webp')
    const presign = await fetch('/api/r2-presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, restaurantId: restaurant.id, restaurantSlug: restaurant.slug }),
    })
    if (!presign.ok) {
      const err = await presign.json().catch(() => ({}))
      throw new Error(`Logo presign failed: ${err.error || presign.status}`)
    }
    const { uploadUrl, publicUrl } = await presign.json()
    let upload: Response
    try {
      upload = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/webp' },
        body: blob,
      })
    } catch (error) {
      throw new Error(`R2 upload failed before the server responded: ${error instanceof Error ? error.message : String(error)}. Check R2 CORS for browser PUT from this admin origin.`)
    }
    if (!upload.ok) throw new Error(`R2 upload failed: HTTP ${upload.status} ${upload.statusText || ''}`.trim())
    const { error } = await supabase.from('theme_config').upsert(
      { restaurant_id: restaurant.id, key: 'logo_url', value: publicUrl },
      { onConflict: 'restaurant_id,key' },
    )
    if (error) throw new Error(`Theme save failed: ${error.message}`)
    setLogoStatus(T.logoUploaded)
  }

  async function createTenant() {
    setSaving(true)
    setMessage('')
    setLogoStatus('')
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json().catch(() => ({})) as CreatedTenantResponse
    if (!res.ok) {
      setSaving(false)
      setMessage(json.error || T.tenantCreationFailed)
      return
    }
    let logoNote = ''
    if (logoFile && json.restaurant?.id && json.restaurant.slug) {
      try {
        await uploadTenantLogo(logoFile, { id: json.restaurant.id, slug: json.restaurant.slug })
        logoNote = T.logoAdded
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e)
        logoNote = text(T.logoUploadSkipped, { reason })
        setLogoStatus(text(T.logoUploadFailed, { reason }))
      }
    }
    setSaving(false)
    setMessage(text(T.tenantCreated, { name: json.brand?.name ?? T.tenantCredential, url: json.previewUrl ?? '', logoNote }))
    if (json.adminUser?.email && json.oneTimePassword) {
      setCredentials({
        brandName: json.brand?.name ?? '',
        restaurantName: json.restaurant?.name ?? '',
        adminEmail: json.adminUser.email,
        initialPassword: json.oneTimePassword,
        previewUrl: json.previewUrl ?? '',
      })
    } else {
      setCredentials(null)
    }
    setForm({
      brandName: '',
      plan: 'ar_menu',
      templateKey: 'warm_gold',
      primaryColor: '#f2b535',
      secondaryColor: '#c07808',
      createStarterCategory: true,
      adminEmail: '',
      adminPassword: '',
    })
    setLogoFile(null)
    if (logoInputRef.current) logoInputRef.current.value = ''
    await load()
    await loadAccountLog()
  }

  async function createBranch(brand: Brand) {
    const current = branchForm[brand.id] ?? emptyBranchForm()
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: brand.id, ...current }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(json.error || T.branchCreationFailed)
      return
    }
    setMessage(text(T.branchCreated, { name: json.restaurant.name, url: json.adminUrl }))
    setBranchForm(forms => ({
      ...forms,
      [brand.id]: emptyBranchForm(),
    }))
    await load()
  }

  async function updateTenantPlan(brand: Brand) {
    const nextPlan = planDrafts[brand.id] ?? brand.plan
    if (nextPlan === brand.plan) return

    setUpdatingPlanBrandId(brand.id)
    setMessage('')
    const res = await fetch('/api/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: brand.id, plan: nextPlan }),
    })
    const json = await res.json().catch(() => ({})) as PlanUpdateResponse
    setUpdatingPlanBrandId(null)
    if (!res.ok || !json.brand) {
      setMessage(json.error || T.planUpdateFailed)
      return
    }

    setBrands(current => current.map(item => (
      item.id === brand.id ? { ...item, plan: json.brand!.plan } : item
    )))
    setPlanDrafts(current => ({ ...current, [brand.id]: json.brand!.plan }))
    setMessage(text(T.planUpdated, { name: json.brand.name, plan: PLAN_LABELS[json.brand.plan] }))
    await load()
  }

  async function updateBranchEntitlement(brand: Brand, canCreateBranches: boolean) {
    setUpdatingBranchEntitlementBrandId(brand.id)
    setMessage('')
    const res = await fetch('/api/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId: brand.id, canCreateBranches }),
    })
    const json = await res.json().catch(() => ({})) as PlanUpdateResponse
    setUpdatingBranchEntitlementBrandId(null)
    if (!res.ok || !json.brand) {
      setMessage(json.error || T.branchPermissionUpdateFailed)
      return
    }

    setBrands(current => current.map(item => (
      item.id === brand.id ? { ...item, can_create_branches: json.brand!.can_create_branches === true } : item
    )))
    setMessage(`${T.branchCreationPermission}: ${json.brand.can_create_branches ? T.enabled : T.disabled}`)
    await load()
  }

  async function sendPasswordReset(email: string) {
    setResettingEmail(email)
    setMessage('')
    const res = await fetch('/api/account-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const json = await res.json().catch(() => ({}))
    setResettingEmail('')
    if (!res.ok) {
      setMessage(json.error || T.passwordResetEmailFailed)
      return
    }
    setMessage(text(T.passwordResetEmailSentTo, { email }))
  }

  async function removeAccount(account: AccountLogEntry) {
    if (!window.confirm(text(T.removeAccountConfirm, { email: account.email }))) return
    setRemovingAccountId(account.id)
    setMessage('')
    const res = await fetch('/api/account-log', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: account.id }),
    })
    const json = await res.json().catch(() => ({}))
    setRemovingAccountId('')
    if (!res.ok) {
      setMessage(json.error || T.accountRemovalFailed)
      return
    }
    setMessage(text(T.accountRemoved, { email: account.email }))
    await loadAccountLog()
    await load()
  }

  function updateBranchForm(brand: Brand, key: keyof BranchForm, value: string | boolean) {
    setBranchForm(forms => {
      const current = forms[brand.id] ?? emptyBranchForm()
      const next = { ...current, [key]: value }
      if (key === 'templateKey') {
        const template = starterTemplate(String(value))
        next.templateKey = template.key
        next.primaryColor = template.primaryColor
        next.secondaryColor = template.secondaryColor
        next.createStarterCategory = template.createStarterCategory
      }
      if ((key === 'branchArea' || key === 'branchName') && !current.branchSlug) {
        const area = String(key === 'branchArea' ? value : next.branchArea || value)
        next.branchSlug = slugify(`${brand.slug}-${area}`)
      }
      if (key === 'branchSlug') next.branchSlug = slugify(String(value))
      return { ...forms, [brand.id]: next }
    })
  }

  async function deleteTenant(brand: Brand) {
    if (!window.confirm(text(T.deleteTenantConfirm, { name: brand.name }))) return
    setSaving(true)
    setMessage('')
    const res = await fetch(`/api/tenants?brandId=${brand.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(json.error || T.tenantDeletionFailed)
      return
    }
    setMessage(text(T.tenantDeleted, { name: brand.name }))
    await load()
  }

  if (!access.loading && !access.canManageBranches) {
    return (
      <LockedCard
        title={T.branchManagementLockedTitle}
        description={T.branchManagementLockedDesc}
        planLabel={access.label}
      />
    )
  }

  const pageTitle = access.canManageTenants ? T.tenantsTitle : T.branchesTitle
  const canShowCreateTenant = access.canManageTenants

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold page-title" style={{ color: 'var(--gold)' }}>{pageTitle}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--dim)' }}>
            {access.canManageTenants
              ? T.tenantsDesc
              : access.canCreateBranches
                ? T.branchesCreateDesc
                : T.branchesOpenDesc}
          </p>
        </div>
        {message && (
          <span className="text-sm px-3 py-1.5 rounded-lg max-w-xl"
                style={{ background: 'rgba(242,181,53,0.1)', color: 'var(--gold)', border: '1px solid var(--border)' }}>
            {message}
          </span>
        )}
      </div>

      {credentials && (
        <section className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(242,181,53,0.08)', border: '1px solid var(--border)' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--gold)' }}>{T.initialAdminCredentials}</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--dim)' }}>
                {T.temporaryPasswordVisibility}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--dim)' }}>
                {T.oldPasswordsUnavailable}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(`Email: ${credentials.adminEmail}\nPassword: ${credentials.initialPassword}\nURL: ${credentials.previewUrl}`)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--gold)', color: '#0f0b07' }}
            >
              {T.copy}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
            <Credential label={T.tenantCredential} value={`${credentials.brandName} / ${credentials.restaurantName}`} />
            <Credential label={T.adminEmail} value={credentials.adminEmail} />
            <Credential label={T.initialPassword} value={credentials.initialPassword} secret />
          </div>
        </section>
      )}

      {canShowCreateTenant && (
      <section className="mb-8 p-4 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>{T.createTenant}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={T.brandName}>
            <input value={form.brandName} onChange={e => update('brandName', e.target.value)} placeholder={T.brandNamePlaceholder} />
          </Field>
          <Field label={T.plan}>
            <select value={form.plan} onChange={e => update('plan', e.target.value as Brand['plan'])}>
              <option value="ar_menu">AR Menu 300</option>
              <option value="full">Full 450</option>
              <option value="premium">Premium 900</option>
            </select>
          </Field>
          <Field label={T.starterTemplate}>
            <select
              value={form.templateKey}
              onChange={e => update('templateKey', e.target.value as StarterTemplateKey)}
            >
              {STARTER_TEMPLATE_OPTIONS.map(option => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-3">
              <TemplateSwatch templateKey={form.templateKey} />
              <div className="text-xs leading-5" style={{ color: 'var(--dim)' }}>
                {starterTemplate(form.templateKey).description}
              </div>
            </div>
          </Field>
          <Field label={T.primaryColor}>
            <input value={form.primaryColor} onChange={e => update('primaryColor', e.target.value)} placeholder="#f2b535" />
          </Field>
          <Field label={T.secondaryColor}>
            <input value={form.secondaryColor} onChange={e => update('secondaryColor', e.target.value)} placeholder="#c07808" />
          </Field>
          <Field label={T.adminEmail}>
            <input
              type="email"
              value={form.adminEmail}
              onChange={e => update('adminEmail', e.target.value)}
              placeholder="owner@example.com"
            />
          </Field>
          <Field label={T.adminPassword}>
            <input
              type="text"
              value={form.adminPassword}
              onChange={e => update('adminPassword', e.target.value)}
              placeholder={T.adminPasswordPlaceholder}
              autoComplete="new-password"
            />
          </Field>
          <Field label={T.addLogo}>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={e => setLogoFile(e.target.files?.[0] ?? null)}
              />
              {logoFile && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoFile(null)
                    setLogoStatus('')
                    if (logoInputRef.current) logoInputRef.current.value = ''
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ border: '1px solid var(--border)', color: 'var(--dim)' }}
                >
                  {T.clear}
                </button>
              )}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--dim)' }}>
              {T.logoHint}
            </div>
            {logoStatus && (
              <div className="text-xs mt-1" style={{ color: logoStatus.includes('failed') ? 'var(--danger)' : 'var(--success)' }}>
                {logoStatus}
              </div>
            )}
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={createTenant} disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--gold)', color: '#0f0b07', opacity: saving ? 0.6 : 1 }}>
            {saving ? T.creating : T.createTenantButton}
          </button>
          <span className="text-xs" style={{ color: 'var(--dim)' }}>
            {T.createTenantHint}
          </span>
        </div>
      </section>
      )}

      {access.canManageTenants && (
        <AccountLog
          accounts={accountLog}
          loading={accountLogLoading}
          resettingEmail={resettingEmail}
          removingAccountId={removingAccountId}
          onReset={email => void sendPasswordReset(email)}
          onRemove={account => void removeAccount(account)}
        />
      )}

      {loading ? (
        <p style={{ color: 'var(--dim)' }}>{T.loading}</p>
      ) : (
        <div className="table-scroll rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm" style={{ minWidth: '1120px' }}>
            <thead>
              <tr style={{ background: 'var(--card2)', borderBottom: '1px solid var(--border)' }}>
                {[T.brandColumn, T.plan, ...(access.canManageTenants ? [T.branchCreationPermission] : []), T.adminsColumn, T.branchesColumn, T.statusColumn, T.actionsColumn].map(h => (
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
                        <a href={tenantMenuUrl(first.slug)} className="font-medium hover:underline" style={{ color: 'var(--text)' }}>
                          {brand.name}
                        </a>
                      ) : <div className="font-medium">{brand.name}</div>}
                      <div className="text-xs mt-0.5" style={{ color: 'var(--dim)' }}>{brand.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      {access.canManageTenants ? (
                        <PlanEditor
                          brand={brand}
                          value={planDrafts[brand.id] ?? brand.plan}
                          saving={updatingPlanBrandId === brand.id}
                          onChange={plan => setPlanDrafts(current => ({ ...current, [brand.id]: plan }))}
                          onSave={() => void updateTenantPlan(brand)}
                        />
                      ) : (
                        <span style={{ color: 'var(--gold)' }}>{PLAN_LABELS[brand.plan]}</span>
                      )}
                    </td>
                    {access.canManageTenants && (
                      <td className="px-4 py-3">
                        <BranchEntitlementToggle
                          brand={brand}
                          saving={updatingBranchEntitlementBrandId === brand.id}
                          onChange={enabled => void updateBranchEntitlement(brand, enabled)}
                          label={T.branchCreationPermission}
                          enabledLabel={T.enabled}
                          disabledLabel={T.disabled}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3" style={{ color: 'var(--dim)' }}>
                      {(brand.adminCredentials ?? []).length ? (
                        <CredentialList credentials={brand.adminCredentials ?? []} />
                      ) : (brand.adminEmails ?? []).length ? (
                        <EmailList emails={brand.adminEmails ?? []} />
                      ) : (
                        <span className="text-xs">{T.noLinkedAdmin}</span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--dim)' }}>
                      {(brand.restaurants ?? []).length ? (
                        <div className="space-y-2">
                          {(brand.restaurants ?? []).map(r => (
                            <div key={r.id}>
                              <a href={tenantMenuUrl(r.slug)} className="hover:underline font-medium" style={{ color: 'var(--gold)' }}>
                                {r.name}
                              </a>
                              <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--dim)' }}>{r.slug}</div>
                              <a href={tenantPreviewUrl(r)} target="_blank" rel="noreferrer" className="block text-xs font-mono mt-1 break-all hover:underline" style={{ color: 'var(--gold)' }}>
                                {T.webPage}: {tenantPreviewUrl(r)}
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : T.none}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {(brand.restaurants ?? []).map(r => (
                          <span key={r.id} className="block text-xs px-2 py-0.5 rounded-full w-fit"
                                style={{ background: r.status === 'active' ? 'rgba(76,175,125,0.15)' : 'rgba(224,82,82,0.12)',
                                         color: r.status === 'active' ? 'var(--success)' : 'var(--danger)' }}>
                            {r.status}
                          </span>
                        ))}
                        {!(brand.restaurants ?? []).length && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(224,82,82,0.12)', color: 'var(--danger)' }}>
                            {T.statusNone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-3 min-w-56">
                        {(access.canManageTenants || (access.canCreateBranches && brand.can_create_branches === true)) && (
                          <BranchCreator
                            brand={brand}
                            saving={saving}
                            value={branchForm[brand.id] ?? emptyBranchForm()}
                            onChange={updateBranchForm}
                            onCreate={() => void createBranch(brand)}
                          />
                        )}
                        {access.canManageTenants && (
                          <button
                            onClick={() => void deleteTenant(brand)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{
                              border: '1px solid rgba(224,82,82,0.35)',
                              color: 'var(--danger)',
                              opacity: saving ? 0.5 : 1,
                            }}
                          >
                            {T.delete}
                          </button>
                        )}
                      </div>
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

function AccountLog({
  accounts,
  loading,
  resettingEmail,
  removingAccountId,
  onReset,
  onRemove,
}: {
  accounts: AccountLogEntry[]
  loading: boolean
  resettingEmail: string
  removingAccountId: string
  onReset: (email: string) => void
  onRemove: (account: AccountLogEntry) => void
}) {
  const [T] = useLang()

  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{T.accountLog}</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--dim)' }}>
            {T.accountLogDesc}
          </p>
        </div>
      </div>
      <div className="table-scroll rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-xs" style={{ minWidth: '1240px' }}>
          <thead>
            <tr style={{ background: 'var(--card2)', borderBottom: '1px solid var(--border)' }}>
              {[T.emailColumn, T.appRole, T.brandTenant, T.restaurantBranch, T.temporaryPasswordVisibility, T.createdColumn, T.lastSignIn, T.actionsColumn].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: 'var(--dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3" colSpan={8} style={{ color: 'var(--dim)' }}>{T.loadingAccountLog}</td>
              </tr>
            ) : accounts.length ? accounts.map((account, i) => (
              <tr
                key={account.id}
                style={{ background: i % 2 ? 'var(--card)' : 'transparent', borderBottom: '1px solid var(--border)' }}
              >
                <td className="px-3 py-2 font-mono break-all" style={{ color: 'var(--text)' }}>{account.email}</td>
                <td className="px-3 py-2" style={{ color: 'var(--gold)' }}>{account.appRole || 'none'}</td>
                <td className="px-3 py-2" style={{ color: 'var(--dim)' }}>
                  {account.brandMemberships.length ? (
                    <div className="space-y-1">
                      {account.brandMemberships.map(membership => (
                        <div key={`${account.id}-brand-${membership.brandId}`}>
                          <span style={{ color: 'var(--text)' }}>{membership.name || membership.slug || membership.brandId}</span>
                          <span className="font-mono"> / {membership.slug || 'no-slug'}</span>
                          <div>{membership.role}</div>
                        </div>
                      ))}
                    </div>
                  ) : T.none}
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--dim)' }}>
                  {account.restaurantMemberships.length ? (
                    <div className="space-y-1">
                      {account.restaurantMemberships.map(membership => (
                        <div key={`${account.id}-restaurant-${membership.restaurantId}`}>
                          <span style={{ color: 'var(--text)' }}>{membership.name || membership.slug || membership.restaurantId}</span>
                          <span className="font-mono"> / {membership.slug || 'no-slug'}</span>
                          <div>{membership.role}</div>
                        </div>
                      ))}
                    </div>
                  ) : T.none}
                </td>
                <td className="px-3 py-2">
                  <div className="text-[11px] uppercase" style={{ color: 'var(--dim)' }}>{T.storedInitialPassword}</div>
                  <div className="font-mono break-all" style={{ color: account.storedInitialPassword ? 'var(--gold)' : 'var(--dim)' }}>
                    {account.storedInitialPassword || T.unknown}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--dim)' }}>{formatDate(account.createdAt, T.never)}</td>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--dim)' }}>{formatDate(account.lastSignInAt, T.never)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onReset(account.email)}
                      disabled={resettingEmail === account.email || removingAccountId === account.id}
                      className="px-3 py-1.5 rounded-lg font-semibold"
                      style={{ border: '1px solid var(--border)', color: 'var(--gold)', opacity: resettingEmail === account.email ? 0.6 : 1 }}
                    >
                      {resettingEmail === account.email ? T.sending : T.sendReset}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(account)}
                      disabled={removingAccountId === account.id || resettingEmail === account.email}
                      className="px-3 py-1.5 rounded-lg font-semibold"
                      style={{ border: '1px solid rgba(224,82,82,0.35)', color: 'var(--danger)', opacity: removingAccountId === account.id ? 0.6 : 1 }}
                    >
                      {removingAccountId === account.id ? T.removing : T.removeAccount}
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="px-3 py-3" colSpan={8} style={{ color: 'var(--dim)' }}>{T.noAuthAccounts}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function formatDate(value: string | null, neverLabel: string) {
  if (!value) return neverLabel
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs mb-1 uppercase" style={{ color: 'var(--dim)' }}>{label}</div>
      {children}
    </label>
  )
}

function TemplateSwatch({ templateKey, compact = false }: { templateKey: string; compact?: boolean }) {
  const values = starterTemplate(templateKey).values
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-lg ${compact ? 'h-10 w-14' : 'h-14 w-20'}`}
      style={{
        background: values.day_bg_image ?? `linear-gradient(135deg, ${values.day_bg}, ${values.day_bg2 ?? values.day_bg})`,
        border: `1px solid ${values.day_border ?? 'var(--border)'}`,
      }}
      aria-hidden="true"
    >
      <span
        className={`absolute rounded-md ${compact ? 'left-1.5 top-1.5 h-6 w-8' : 'left-2 top-2 h-8 w-11'}`}
        style={{
          background: values.day_card_bg ?? `linear-gradient(135deg, ${values.day_card}, ${values.day_card2 ?? values.day_card})`,
          boxShadow: values.day_item_shadow ?? '0 4px 12px rgba(0,0,0,0.12)',
        }}
      />
      <span
        className={`absolute rounded-full ${compact ? 'bottom-1.5 right-1.5 h-2.5 w-6' : 'bottom-2 right-2 h-4 w-9'}`}
        style={{ background: values.day_cta_bg ?? values.day_accent }}
      />
    </span>
  )
}

function Credential({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="text-xs uppercase mb-1" style={{ color: 'var(--dim)' }}>{label}</div>
      <div className="font-mono text-xs break-all" style={{ color: secret ? 'var(--gold)' : 'var(--text)' }}>{value}</div>
    </div>
  )
}

function EmailList({ emails }: { emails: string[] }) {
  return (
    <span className="inline-flex flex-col gap-0.5">
      {emails.map(email => (
        <span key={email} className="font-mono text-xs break-all">{email}</span>
      ))}
    </span>
  )
}

function CredentialList({
  credentials,
  onUnlink,
  disabled = false,
}: {
  credentials: AccountCredential[]
  onUnlink?: (email: string) => void
  disabled?: boolean
}) {
  const [T] = useLang()

  return (
    <span className="inline-flex flex-col gap-1">
      {credentials.map(credential => (
        <span key={credential.email} className="block">
          <span className="font-mono text-xs break-all" style={{ color: 'var(--text)' }}>{credential.email}</span>
          <span className="block font-mono text-[11px] break-all" style={{ color: credential.storedInitialPassword ? 'var(--gold)' : 'var(--dim)' }}>
            {T.storedInitialPassword}: {credential.storedInitialPassword || T.unknown}
          </span>
          {onUnlink && (
            <button
              type="button"
              onClick={() => onUnlink(credential.email)}
              disabled={disabled}
              className="mt-1 px-2 py-1 rounded text-[11px] font-semibold"
              style={{ border: '1px solid rgba(224,82,82,0.35)', color: 'var(--danger)', opacity: disabled ? 0.55 : 1 }}
            >
              {T.delete}
            </button>
          )}
        </span>
      ))}
    </span>
  )
}

function PlanEditor({
  brand,
  value,
  saving,
  onChange,
  onSave,
}: {
  brand: Brand
  value: Brand['plan']
  saving: boolean
  onChange: (plan: Brand['plan']) => void
  onSave: () => void
}) {
  const [T] = useLang()
  const selected = PLAN_OPTIONS.find(option => option.value === value) ?? PLAN_OPTIONS[0]
  const changed = value !== brand.plan

  return (
    <div className="space-y-2 min-w-48">
      <select
        value={value}
        onChange={e => onChange(e.target.value as Brand['plan'])}
        disabled={saving}
        aria-label={`Plan for ${brand.name}`}
      >
        {PLAN_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <div className="text-xs leading-5" style={{ color: 'var(--dim)' }}>
        {selected.hint}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || !changed}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{
          background: changed ? 'var(--gold)' : 'transparent',
          border: changed ? '1px solid var(--gold)' : '1px solid var(--border)',
          color: changed ? '#0f0b07' : 'var(--dim)',
          opacity: saving || !changed ? 0.6 : 1,
        }}
      >
        {saving ? T.saving : changed ? T.savePlan : PLAN_LABELS[brand.plan]}
      </button>
    </div>
  )
}

function BranchEntitlementToggle({
  brand,
  saving,
  onChange,
  label,
  enabledLabel,
  disabledLabel,
}: {
  brand: Brand
  saving: boolean
  onChange: (enabled: boolean) => void
  label: string
  enabledLabel: string
  disabledLabel: string
}) {
  const [T] = useLang()
  const enabled = brand.can_create_branches === true

  return (
    <div className="space-y-2 min-w-44">
      <label className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--text)' }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={event => onChange(event.target.checked)}
        />
        <span>{enabled ? enabledLabel : disabledLabel}</span>
      </label>
      <div className="text-xs leading-5" style={{ color: 'var(--dim)' }}>
        {label}
      </div>
      {saving && (
        <div className="text-xs" style={{ color: 'var(--gold)' }}>{T.saving}</div>
      )}
    </div>
  )
}

function BranchCreator({
  brand,
  value,
  saving,
  onChange,
  onCreate,
}: {
  brand: Brand
  value: BranchForm
  saving: boolean
  onChange: (brand: Brand, key: keyof BranchForm, value: string | boolean) => void
  onCreate: () => void
}) {
  const [T] = useLang()
  const disabled = saving

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2">
        <input
          value={value.branchName}
          onChange={e => onChange(brand, 'branchName', e.target.value)}
          placeholder={T.branchName}
          disabled={disabled}
        />
        <input
          value={value.branchArea}
          onChange={e => onChange(brand, 'branchArea', e.target.value)}
          placeholder={T.branchAreaPlaceholder}
          disabled={disabled}
        />
        <input
          value={value.branchSlug}
          onChange={e => onChange(brand, 'branchSlug', e.target.value)}
          placeholder={`${brand.slug}-saburtalo`}
          disabled={disabled}
        />
      </div>
      <label className="block">
        <div className="text-xs mb-1 uppercase" style={{ color: 'var(--dim)' }}>{T.starterTemplate}</div>
        <select
          value={value.templateKey}
          onChange={e => onChange(brand, 'templateKey', e.target.value)}
          disabled={disabled}
        >
          {STARTER_TEMPLATE_OPTIONS.map(option => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
        <div className="mt-2 flex items-center gap-2">
          <TemplateSwatch templateKey={value.templateKey} compact />
          <div className="text-xs leading-5" style={{ color: 'var(--dim)' }}>
            {starterTemplate(value.templateKey).description}
          </div>
        </div>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <div className="text-xs mb-1 uppercase" style={{ color: 'var(--dim)' }}>{T.primary}</div>
          <input
            value={value.primaryColor}
            onChange={e => onChange(brand, 'primaryColor', e.target.value)}
            placeholder="#f2b535"
            disabled={disabled}
          />
        </label>
        <label className="block">
          <div className="text-xs mb-1 uppercase" style={{ color: 'var(--dim)' }}>{T.secondary}</div>
          <input
            value={value.secondaryColor}
            onChange={e => onChange(brand, 'secondaryColor', e.target.value)}
            placeholder="#c07808"
            disabled={disabled}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={disabled || !value.branchName.trim()}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ background: 'var(--gold)', color: '#0f0b07', opacity: disabled || !value.branchName.trim() ? 0.55 : 1 }}
      >
        {T.addBranch}
      </button>
    </div>
  )
}
