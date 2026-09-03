// v2: who is involved and who holds which documents. Customer mode lives at
// the top of the admin's parcel view; operator mode mirrors it in case detail.
import { useState } from 'react'
import { CollaboratorForm } from './CollaboratorForm'
import { Button, Chip, Panel, parcelTone } from './ui'
import { CUSTOMER_PARCEL_STATUS_LABEL, PARCEL_STATUS_LABEL, ROLE_LABEL } from '../model/catalog'
import { blockedOn, parcelProgress, personParcels, structure } from '../model/selectors'
import { useStore } from '../state/Store'
import type { Actor } from '../state/reducer'

interface Props {
  caseId: string
  mode: 'customer' | 'operator'
  actorPersonId: Actor
  summary?: boolean // customer mode: collapse to one line unless the admin is alone
}

export function StructurePanel({ caseId, mode, actorPersonId, summary = false }: Props) {
  const s = useStore()
  const [form, setForm] = useState<{ mode: 'person' | 'entity'; presetEntityId?: string } | null>(null)
  const st = structure(s, caseId)
  const alone = st.people.length <= 1
  const [open, setOpen] = useState(!summary || alone)
  const others = st.people.filter((p) => !p.roles.includes('admin')).length
  const stillToDo = blockedOn(s, caseId).filter((b) => !s.people[b.personId].roles.includes('admin')).length

  if (summary && !open) {
    return (
      <div data-testid="structure-summary" className="flex items-center justify-between rounded-[16px] bg-white px-5 py-2.5 text-sm shadow-card">
        <span>
          {mode === 'customer'
            ? `${others} ${others === 1 ? 'person is' : 'people are'} helping · ${stillToDo} still ${stillToDo === 1 ? 'has' : 'have'} things to do`
            : `${st.people.length} people · ${st.entities.length} ${st.entities.length === 1 ? 'entity' : 'entities'} · ${st.entities.filter((e) => !e.holder.roles.includes('admin')).length} delegated`}
        </span>
        <Button size="sm" variant="ghost" data-testid="structure-toggle" onClick={() => setOpen(true)}>
          {mode === 'customer' ? "Who's involved" : 'Structure'}
        </Button>
      </div>
    )
  }

  return (
    <Panel
      title={mode === 'customer' ? 'Who else is helping' : 'Structure'}
      actions={
        <div className="flex gap-2">
          {summary && !alone && (
            <Button size="sm" variant="ghost" data-testid="structure-hide" onClick={() => setOpen(false)}>
              Hide
            </Button>
          )}
          <Button size="sm" data-testid="add-person" onClick={() => setForm({ mode: 'person' })}>
            Add person
          </Button>
          <Button size="sm" data-testid="add-entity" onClick={() => setForm({ mode: 'entity' })}>
            Add entity
          </Button>
        </div>
      }
    >
      <div className="space-y-4 overflow-x-auto text-sm">
        {mode === 'operator' && <p className="text-xs text-ink-400">Anything added here is added on the customer's behalf and logged as the operator.</p>}
        {mode === 'customer' && (
          <p className="text-ink-600">
            {alone
              ? 'Who else owns 25% or more, or signs for the business? Add them and we will ask them directly. You do not need to collect anything from them.'
              : 'We ask each person directly for what is theirs. You only see your own list.'}
          </p>
        )}
        <table className="w-full min-w-[520px]">
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
                    {primary ? <Chip tone={parcelTone(primary.status)}>{(mode === 'customer' ? CUSTOMER_PARCEL_STATUS_LABEL : PARCEL_STATUS_LABEL)[primary.status]}</Chip> : <span className="text-ink-400">nothing needed</span>}
                  </td>
                  <td className="py-1 tabular-nums" data-testid="structure-progress">
                    {prog ? `${prog.accepted} of ${prog.total}` : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <table className="w-full min-w-[520px]">
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
                  <Button size="sm" variant="ghost" onClick={() => setForm({ mode: 'person', presetEntityId: e.entityId })}>
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
