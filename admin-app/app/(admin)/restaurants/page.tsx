'use client'
import Link from 'next/link'
import { usePlan } from '@/lib/usePlan'
import LockedCard from '@/components/LockedCard'

const RESTAURANTS = [
  {
    name: 'Burger Lions',
    slug: 'burger-lions-main',
    brand: 'burger-lions',
    plan: 'premium',
    status: 'Live demo',
    menuUrl: 'https://3darmenu.pages.dev',
    analyticsUrl: '/dashboard',
    accent: '#f2b535',
    description: 'Original Burger Lions AR menu and restaurant analytics demo.',
  },
  {
    name: 'Aurora Cafe',
    slug: 'aurora-cafe-main',
    brand: 'aurora-cafe',
    plan: 'full',
    status: 'Dummy tenant',
    menuUrl: 'https://3darmenu.pages.dev/aurora-cafe.html',
    analyticsUrl: '/dev-analytics',
    accent: '#5edac4',
    description: 'Second dummy restaurant for testing multi-restaurant monitoring.',
  },
]

export default function RestaurantsPage() {
  const plan = usePlan()

  if (!plan.loading && !plan.canUseDeveloperAnalytics) {
    return (
      <LockedCard
        title="All restaurants are super-admin only"
        description="The restaurant control tower is for internal BetaReal super admins. Client users only see their own scoped menu, analytics, and theme tools."
        planLabel={plan.label}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold page-title" style={{ color: 'var(--gold)' }}>
            Access to All Restaurants
          </h1>
          <p className="text-sm mt-0.5 max-w-3xl" style={{ color: 'var(--dim)' }}>
            Transitional control tower for monitoring every AR menu tenant from one BetaReal panel.
            The real multitenant version will read this list from brands/restaurants.
          </p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-lg uppercase tracking-widest"
              style={{ background: 'var(--card)', color: 'var(--dim)', border: '1px solid var(--border)' }}>
          Super admin
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {RESTAURANTS.map(restaurant => (
          <div key={restaurant.slug}
               className="rounded-xl p-5"
               style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--dim)' }}>
                  {restaurant.status}
                </div>
                <h2 className="text-lg font-bold" style={{ color: restaurant.accent }}>
                  {restaurant.name}
                </h2>
                <p className="text-sm mt-2 leading-6" style={{ color: 'var(--dim)' }}>
                  {restaurant.description}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: 'var(--gold-dim, rgba(242,181,53,0.12))', color: 'var(--gold)' }}>
                {restaurant.plan}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm">
              <Info label="Brand" value={restaurant.brand} />
              <Info label="Branch" value={restaurant.slug} />
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              <a href={restaurant.menuUrl}
                 target="_blank"
                 rel="noreferrer"
                 className="px-4 py-2 rounded-lg text-sm font-semibold"
                 style={{ background: 'var(--gold)', color: '#0f0b07' }}>
                Open menu
              </a>
              <Link href={restaurant.analyticsUrl}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ color: 'var(--dim)', border: '1px solid var(--border)' }}>
                View analytics
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl p-4 text-sm leading-6"
           style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--dim)' }}>
        Today this page is a safe dummy directory. In the real BetaReal+ platform, these cards become rows from
        <span style={{ color: 'var(--text)' }}> brands </span>
        and
        <span style={{ color: 'var(--text)' }}> restaurants</span>, with analytics filtered by
        <span style={{ color: 'var(--text)' }}> restaurant_id</span>.
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'var(--card2)', border: '1px solid var(--border)' }}>
      <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--dim)' }}>
        {label}
      </div>
      <div className="font-mono mt-1" style={{ color: 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}
