'use client'

import dynamic from 'next/dynamic'

// The app runs entirely in the browser (hash routes like /#/dashboard), as in the prototype.
const ClientApp = dynamic(() => import('./ClientApp'), { ssr: false })

export default function Page() {
  return <ClientApp />
}
