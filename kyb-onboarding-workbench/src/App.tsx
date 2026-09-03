import { CaseDetailView } from './views/CaseDetailView'
import { ConsoleView } from './views/ConsoleView'
import { ParcelView } from './views/ParcelView'
import { TriageView } from './views/TriageView'
import { AppShell } from './components/Shell'
import { useStore } from './state/Store'

export default function App() {
  const view = useStore().view
  if (view.kind === 'console') return <AppShell mode="operator"><ConsoleView /></AppShell>
  if (view.kind === 'case') return <AppShell mode="operator"><CaseDetailView caseId={view.caseId} /></AppShell>
  if (view.kind === 'triage') return <AppShell mode="operator"><TriageView /></AppShell>
  return (
    <AppShell mode="customer" wide>
      <ParcelView personId={view.personId} caseId={view.caseId} />
    </AppShell>
  )
}
