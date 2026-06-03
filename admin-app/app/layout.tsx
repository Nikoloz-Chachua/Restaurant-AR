import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '3D AR Menu Admin',
  description: 'Admin panel for 3D AR Menu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
