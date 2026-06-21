import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FamilyKitchen',
  description: 'Madplanlægning og lagerstyring til familien',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  )
}
