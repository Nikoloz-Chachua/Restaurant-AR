export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--gold)' }}>Analytics</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--dim)' }}>
        Live data from Supabase — all visitor events
      </p>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <iframe
          src="https://golden-dodol-0efadd.netlify.app/admin.html"
          className="w-full"
          style={{ height: 'calc(100vh - 140px)', border: 'none' }}
          title="Analytics Dashboard"
        />
      </div>
    </div>
  )
}
