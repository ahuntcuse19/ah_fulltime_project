import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { SurfaceProvider } from './surface/SurfaceContext'
import { AnalyticsOverlay } from './components/analytics/AnalyticsOverlay'
import { DEMO_TEAM_ID } from './data'
import SmsEntryPage from './pages/SmsEntryPage'
import TeamPage from './pages/TeamPage'
import InitiativeDetailPage from './pages/InitiativeDetailPage'
import HandoffPage from './pages/HandoffPage'
import MockGivingPage from './pages/MockGivingPage'
import KioskPage from './pages/KioskPage'
import PilotPage from './pages/PilotPage'

function MobileLayout() {
  return (
    <SurfaceProvider surface="mobile">
      <Outlet />
    </SurfaceProvider>
  )
}

function KioskLayout() {
  return (
    <SurfaceProvider surface="kiosk">
      <Outlet />
    </SurfaceProvider>
  )
}

export default function App() {
  return (
    <>
      <AnalyticsOverlay />
      <Routes>
      <Route path="/" element={<SmsEntryPage />} />
      <Route element={<MobileLayout />}>
        <Route path="/m/team/:teamId" element={<TeamPage />} />
        <Route path="/m/initiative/:initiativeId" element={<InitiativeDetailPage />} />
        <Route path="/m/handoff/:initiativeId" element={<HandoffPage />} />
      </Route>
      <Route element={<KioskLayout />}>
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="/kiosk/initiative/:initiativeId" element={<KioskPage />} />
      </Route>
      {/* Outside both surfaces: this route plays the school's own platform. */}
      <Route path="/give/:initiativeId" element={<MockGivingPage />} />
      {/* Reviewer-facing, footer-linked from the entry screen only. */}
      <Route path="/pilot" element={<PilotPage />} />
      <Route path="*" element={<Navigate to={`/m/team/${DEMO_TEAM_ID}`} replace />} />
      </Routes>
    </>
  )
}
