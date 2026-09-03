import { CaseDetailView } from './views/CaseDetailView'
import { ConsoleView } from './views/ConsoleView'
import { ParcelView } from './views/ParcelView'
import { TriageView } from './views/TriageView'
import { CustomerShell, OperatorShell } from './components/Shell'
import { useStore } from './state/Store'

export default function App() {
  const view = useStore().view
  if (view.kind === 'console' || view.kind === 'case') {
    return <OperatorShell>{view.kind === 'console' ? <ConsoleView /> : <CaseDetailView caseId={view.caseId} />}</OperatorShell>
  }
  if (view.kind === 'triage') {
    return (
      <CustomerShell>
        <TriageView />
      </CustomerShell>
    )
  }
  return (
    <CustomerShell wide>
      <ParcelView personId={view.personId} caseId={view.caseId} />
    </CustomerShell>
  )
}
