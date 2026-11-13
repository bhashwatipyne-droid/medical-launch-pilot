'use client'

// The prototype's own entry (frontend/src/index.js), minus the in-browser demo
// server: requests now go to this site's /api, answered from Supabase.
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/index.css'
import '@/styles/mint-tokens.css'
import App from '@/App'
import { bootDemoFromUrl } from '@/demo/demoMode'

bootDemoFromUrl()

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
})

export default function ClientApp() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  )
}
