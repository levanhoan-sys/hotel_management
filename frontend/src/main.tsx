import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import { AuthProvider } from './lib/auth'
import './styles/base.css'
import './styles/customer-modern.css'
import './styles/tokens.css'
import './styles/shared.css'
import './styles/customer.css'
import './styles/reception.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider><BrowserRouter><App /><Toaster richColors position="top-right" /></BrowserRouter></AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
