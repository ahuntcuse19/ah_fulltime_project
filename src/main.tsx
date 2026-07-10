import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
    {/* Vercel page-view analytics; no-op outside Vercel deployments.
        Separate concern from the in-app demo funnel overlay. */}
    <Analytics />
  </StrictMode>,
)
