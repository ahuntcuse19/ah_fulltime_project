// v2: add a person (subject or document holder) or an entity to a live case,
// with the delta previewed by running the real reducer before dispatching.
import { useMemo, useState } from 'react'
import { Button, Field, Modal, Select, inputClass } from './ui'
import { TIER_LABEL } from '../model/catalog'
import { adminOf } from '../model/rules'
import { JURISDICTIONS, type Jurisdiction, type PersonRole } from '../model/types'
import { preview, type Action, type Actor } from '../state/reducer'
import { useDispatch, useStore } from '../state/Store'

type Mode = 'person' | 'entity'

interface Props {
  caseId: string
  actorPersonId: Actor
  mode: Mode
  onClose: () => void
  presetEntityId?: string // "Delegate" on an entity row: pre-tick that entity
}

export function CollaboratorForm({ caseId, actorPersonId, mode, onClose, presetEntityId }: Props) {
  const s = useStore()
  const dispatch = useDispatch()
  const c = s.cases[caseId]
  const org = s.orgs[c.organizationId]
  const admin = adminOf(org, s.people)
  const holders = org.personIds.map((id) => s.people[id]).filter((p) => p.roles.includes('advisor'))

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roles, setRoles] = useState<PersonRole[]>(presetEntityId ? ['advisor'] : [])
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(org.primaryJurisdiction)
  const [ownership, setOwnership] = useState('')
  const [holdsOrg, setHoldsOrg] = useState(false)
  const [holdsEntities, setHoldsEntities] = useState<string[]>(presetEntityId ? [presetEntityId] : [])
  const [legalName, setLegalName] = useState('')
  const [holder, setHolder] = useState('')

  const toggleRole = (r: PersonRole) => setRoles((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]))

  const action: Extract<Action, { type: 'case/addCollaborator' | 'case/addEntity' }> =
    mode === 'person'
      ? {
          type: 'case/addCollaborator',
          caseId,
          actorPersonId,
          draft: { name, email, roles, jurisdiction, ownershipPercent: ownership === '' ? undefined : Number(ownership) },
          delegateFor: { org: roles.includes('advisor') && holdsOrg, entityIds: roles.includes('advisor') ? holdsEntities : [] },
        }
      : { type: 'case/addEntity', caseId, actorPersonId, legalName, jurisdiction, delegatePersonId: holder || undefined }

  const p = useMemo(() => preview(s, action), [s, action])

  const problem = (() => {
    if (mode === 'person') {
      if (!name.trim()) return 'Name is required.'
      if (!email.trim()) return 'Email is required.'
      if (org.personIds.some((id) => s.people[id].email.toLowerCase() === email.trim().toLowerCase())) return 'Someone with that email is already on this case.'
      if (roles.length === 0) return 'Pick at least one role.'
      if (roles.includes('ubo') && !(Number(ownership) >= 1 && Number(ownership) <= 100)) return 'Ownership must be between 1 and 100.'
    } else if (!legalName.trim()) return 'Legal name is required.'
    return p.valid ? null : 'Nothing would change.'
  })()

  const subjectName = mode === 'person' ? name.trim() || 'this person' : legalName.trim() || 'this entity'
  const holderName = mode === 'entity' ? (holder ? s.people[holder].name : admin.name) : name.trim() || 'them'
  const lines: string[] = []
  if (p.valid) {
    if (p.newItemCount > 0)
      lines.push(mode === 'person' ? `Creates ${p.newItemCount} items in a new request sent to ${subjectName}.` : `Adds ${p.newItemCount} items to ${holderName}'s request.`)
    if (p.movedItemCount > 0) lines.push(`Moves ${p.movedItemCount} items out of ${p.movedFromName ?? admin.name}'s list.`)
    if (p.ownershipChartAdded) lines.push(`Adds an ownership structure chart to ${admin.name}'s request.`)
    if (p.tierBefore !== p.tierAfter) lines.push(`Changes the case from ${TIER_LABEL[p.tierBefore]} to ${TIER_LABEL[p.tierAfter]}.`)
    if (lines.length === 0) lines.push(`Adds ${subjectName} with nothing to request.`)
  }

  return (
    <Modal title={mode === 'person' ? 'Add a person' : 'Add an entity'} onClose={onClose} width="max-w-xl">
      <div className="space-y-4">
        {mode === 'person' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name">
                <input data-testid="cf-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Email">
                <input data-testid="cf-email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
            <div className="text-sm">
              <span className="mb-1 block font-medium">Roles</span>
              <div className="flex gap-4">
                {(['ubo', 'officer', 'advisor'] as PersonRole[]).map((r) => (
                  <label key={r} className="flex items-center gap-1">
                    <input type="checkbox" data-testid={`cf-role-${r}`} checked={roles.includes(r)} onChange={() => toggleRole(r)} />
                    {r === 'ubo' ? 'Beneficial owner' : r === 'officer' ? 'Officer' : 'Document holder'}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Jurisdiction">
                <Select data-testid="cf-jurisdiction" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}>
                  {JURISDICTIONS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </Select>
              </Field>
              {roles.includes('ubo') && (
                <Field label="Ownership %">
                  <input data-testid="cf-ownership" type="number" min={1} max={100} className={inputClass} value={ownership} onChange={(e) => setOwnership(e.target.value)} />
                </Field>
              )}
            </div>
            {roles.includes('advisor') && (
              <div className="text-sm">
                <span className="mb-1 block font-medium">Holds documents for</span>
                <div className="space-y-1">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" data-testid="cf-holds-org" checked={holdsOrg} onChange={(e) => setHoldsOrg(e.target.checked)} />
                    {org.legalName} <span className="text-xs text-ink-400">(organisation-level documents)</span>
                  </label>
                  {org.legalEntityIds.map((eid) => (
                    <label key={eid} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        data-testid={`cf-holds-${eid}`}
                        checked={holdsEntities.includes(eid)}
                        onChange={(e) => setHoldsEntities((ids) => (e.target.checked ? [...ids, eid] : ids.filter((x) => x !== eid)))}
                      />
                      {s.entities[eid].legalName}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <Field label="Legal name">
              <input data-testid="cf-legal-name" className={inputClass} value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Jurisdiction">
                <Select data-testid="cf-jurisdiction" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}>
                  {JURISDICTIONS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Documents held by">
                <Select data-testid="cf-holder" value={holder} onChange={(e) => setHolder(e.target.value)}>
                  <option value="">{admin.name} (admin)</option>
                  {holders.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </>
        )}

        <div data-testid="cf-preview" className="rounded border border-ink-200 bg-ink-100 px-3 py-2 text-sm">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">What this does</div>
          {problem && !p.valid ? <div className="text-ink-400">Fill in the form to see the effect.</div> : lines.map((l) => <div key={l}>{l}</div>)}
        </div>

        <div className="flex items-center justify-end gap-3">
          {problem && <span className="text-xs text-ink-400">{problem}</span>}
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            data-testid="cf-submit"
            disabled={!!problem}
            onClick={() => {
              dispatch(action)
              onClose()
            }}
          >
            {p.valid && p.newParcel ? 'Add and send request' : 'Add'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
