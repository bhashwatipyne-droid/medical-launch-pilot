import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Launch Tracker',
  description: 'Medical product launch pipeline',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg', apple: '/pmt-notification-icon.png' },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#000000' }

// Same fonts as the prototype's index.html (Inter + Manrope).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600&display=swap" />
      </head>
      <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
