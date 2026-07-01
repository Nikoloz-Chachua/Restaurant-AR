import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BetaReal Admin',
  description: 'Admin panel for BetaReal restaurant menus',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
