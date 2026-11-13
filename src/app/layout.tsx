import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Launch Tracker',
  description: 'Medical product launch pipeline: sample to dispatch, with approvals.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
