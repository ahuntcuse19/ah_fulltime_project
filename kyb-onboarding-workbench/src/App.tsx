// Temporary phase-0 shell: proves the seed builds. Replaced in phase 1.
import { useStore } from './state/Store'

export default function App() {
  const s = useStore()
  return <pre className="p-6 text-xs">{JSON.stringify({ cases: Object.keys(s.cases).length, items: Object.keys(s.items).length, parcels: Object.keys(s.parcels).length, log: s.log.length }, null, 2)}</pre>
}
