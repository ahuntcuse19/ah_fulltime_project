// v2: who is involved and who holds which documents. Customer mode lives at
// the top of the admin's parcel view; operator mode mirrors it in case detail.
import { useState } from 'react'
import { CollaboratorForm } from './CollaboratorForm'
import { Button, Chip, Panel, parcelTone } from './ui'
import { PARCEL_STATUS_LABEL, ROLE_LABEL } from '../model/catalog'
import { parcelProgress, personParcels, structure } from '../model/selectors'
import { useStore } from '../state/Store'
import type { Actor } from '../state/reducer'

interface Props {
  caseId: string
  mode: 'customer' | 'operator'
  actorPersonId: Actor
}

export function StructurePanel({ caseId, mode, actorPersonId }: Props) {
  const s = useStore()
  const [form, setForm] = useState<{ mode: 'person' | 'entity'; presetEntityId?: string } | null>(null)
  const st = structure(s, caseId)
  const behalf = mode === 'operator' ? " on the customer's behalf" : ''

  return (
    <Panel
      title={mode === 'customer' ? 'People and entities' : 'Structure'}
      actions={
        <div className="flex gap-2">
          <Button size="sm" data-testid="add-person" onClick={() => setForm({ mode: 'person' })}>
            Add a person{behalf}
          </Button>
          <Button size="sm" data-testid="add-entity" onClick={() => setForm({ mode: 'entity' })}>
            Add an entity{behalf}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <table className="w-full">
          <thead className="text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="py-1 pr-3">Name</th>
              <th className="py-1 pr-3">Roles</th>
              <th className="py-1 pr-3">Jurisdiction</th>
              <th className="py-1 pr-3">Their request</th>
              <th className="py-1">Progress</th>
            </tr>
          </thead>
          <tbody>
            {st.people.map((p) => {
              const primary = personParcels(s, p.id, caseId)[0]
              const prog = primary ? parcelProgress(s, primary.id) : null
              return (
                <tr key={p.id} data-testid="structure-person" className="border-t border-ink-100">
                  <td className="py-1 pr-3 font-medium">{p.name}</td>
                  <td className="py-1 pr-3 text-ink-600">{p.roles.map((r) => ROLE_LABEL[r]).join(', ')}</td>
                  <td className="py-1 pr-3">{p.jurisdiction}</td>
                  <td className="py-1 pr-3">
                    {primary ? <Chip tone={parcelTone(primary.status)}>{PARCEL_STATUS_LABEL[primary.status]}</Chip> : <span className="text-ink-400">nothing needed</span>}
                  </td>
                  <td className="py-1 tabular-nums" data-testid="structure-progress">
                    {prog ? `${prog.accepted} of ${prog.total}` : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <table className="w-full">
          <thead className="text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="py-1 pr-3">Entity</th>
              <th className="py-1 pr-3">Jurisdiction</th>
              <th className="py-1 pr-3">Documents held by</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {st.entities.map((e) => (
              <tr key={e.entityId} data-testid="structure-entity" className="border-t border-ink-100">
                <td className="py-1 pr-3 font-medium">{e.legalName}</td>
                <td className="py-1 pr-3">{e.jurisdiction}</td>
                <td className="py-1 pr-3" data-testid="structure-holder">
                  {e.holder.name}
                </td>
                <td className="py-1 text-right">
                  <Button size="sm" onClick={() => setForm({ mode: 'person', presetEntityId: e.entityId })}>
                    Delegate
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && <CollaboratorForm caseId={caseId} actorPersonId={actorPersonId} mode={form.mode} presetEntityId={form.presetEntityId} onClose={() => setForm(null)} />}
    </Panel>
  )
}
