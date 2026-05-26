import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Burger Lions Admin',
  description: 'Admin panel for Burger Lions AR Menu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
