import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { isMisconfigured } from '@/lib/supabase'
import ConfigErrorPage from '@/pages/ConfigErrorPage'

createRoot(document.getElementById('root')).render(
  isMisconfigured ? (
    <ConfigErrorPage />
  ) : (
    <StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </StrictMode>
  ),
)
