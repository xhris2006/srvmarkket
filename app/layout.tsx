import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BottomNav } from '@/components/ui/BottomNav'
import { ToastProvider } from '@/components/ui/Toast'
import { IncomingCallOverlay } from '@/components/calls/IncomingCallOverlay'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'ServMarket — Global Service Marketplace',
  description: 'Find trusted service providers near you. Book, chat, and pay securely.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'ServMarket' },
}

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>
          <IncomingCallOverlay />
          <main className="min-h-screen">{children}</main>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  )
}
