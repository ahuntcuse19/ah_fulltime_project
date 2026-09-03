import { useEffect, useMemo, useState } from 'react'
import { Button, Field, Modal, Select, inputClass } from './ui'
import { DOWNSTREAM_PARTIES, PARTY_LABEL, PARTY_PHRASE, REQUIREMENTS, REQ_BY_KEY } from '../model/catalog'
import { adminOf } from '../model/rules'
import { caseItems, caseParcels, subjectName } from '../model/selectors'
import type { DownstreamParty, RequirementKey, SubjectKind } from '../model/types'
import { useDispatch, useStore } from '../state/Store'
import type { NewItemSpec } from '../state/reducer'

interface Row {
  subjectKind: SubjectKind
  subjectId: string
  requirementKey: RequirementKey
}

export function ReRequestModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const s = useStore()
  const dispatch = useDispatch()
  const c = s.cases[caseId]
  const org = s.orgs[c.organizationId]
  const admin = adminOf(org, s.people)

  const [party, setParty] = useState<DownstreamParty>('bank_partner')
  const [reason, setReason] = useState('')
  const [moveIds, setMoveIds] = useState<string[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [recipient, setRecipient] = useState(admin.id)
  const [recipientTouched, setRecipientTouched] = useState(false)

  const movable = caseItems(s, caseId).filter(
    (it) => it.status === 'more_info_needed' && !caseParcels(s, caseId).some((p) => p.isReRequest && p.itemIds.includes(it.id)),
  )

  const subjects = useMemo(
    () => [
      { kind: 'organization' as SubjectKind, id: org.id, name: org.legalName },
      ...org.legalEntityIds.map((id) => ({ kind: 'legalEntity' as SubjectKind, id, name: s.entities[id].legalName })),
      ...org.personIds.map((id) => ({ kind: 'person' as SubjectKind, id, name: s.people[id].name })),
    ],
    [org, s.entities, s.people],
  )

  // Default recipient: the subject person if every chosen item is about one
  // person; that entity's delegate if every item is about one entity; else admin.
  const chosen = [
    ...moveIds.map((id) => ({ subjectKind: s.items[id].subjectKind, subjectId: s.items[id].subjectId })),
    ...rows.map((r) => ({ subjectKind: r.subjectKind, subjectId: r.subjectId })),
  ]
  const defaultRecipient = (() => {
    if (chosen.length === 0) return admin.id
    const first = chosen[0]
    const same = chosen.every((x) => x.subjectKind === first.subjectKind && x.subjectId === first.subjectId)
    if (same && first.subjectKind === 'person') return first.subjectId
    if (same && first.subjectKind === 'legalEntity') return s.entities[first.subjectId].delegatePersonId ?? admin.id
    return admin.id
  })()
  useEffect(() => {
    if (!recipientTouched) setRecipient(defaultRecipient)
  }, [defaultRecipient, recipientTouched])

  const addRow = () => setRows((r) => [...r, { subjectKind: 'legalEntity', subjectId: org.legalEntityIds[0], requirementKey: 'entity_good_standing' }])
  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) =>
      rs.map((r, j) => {
        if (j !== i) return r
        const next = { ...r, ...patch }
        if (REQ_BY_KEY[next.requirementKey].subjectKind !== next.subjectKind) {
          next.requirementKey = REQUIREMENTS.find((q) => q.subjectKind === next.subjectKind)!.key
        }
        return next
      }),
    )

  const valid = reason.trim().length > 0 && moveIds.length + rows.length > 0

  return (
    <Modal title="Raise a re-request" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-sm">
          <span className="mb-1 block font-medium">Raised by</span>
          <div className="flex gap-4">
            {DOWNSTREAM_PARTIES.map((p) => (
              <label key={p} className="flex items-center gap-1">
                <input type="radio" name="party" checked={party === p} onChange={() => setParty(p)} /> {PARTY_LABEL[p]}
              </label>
            ))}
          </div>
        </div>
        <Field label="Reason, in plain language" hint="This is shown to the recipient word for word.">
          <textarea className={`${inputClass} h-20`} value={reason} data-testid="rr-reason" onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="text-sm">
          <span className="mb-1 block font-medium">Items to send back</span>
          {movable.length === 0 ? (
            <span className="text-xs text-ink-400">No items are currently marked as needing more information.</span>
          ) : (
            <ul className="space-y-1">
              {movable.map((it) => (
                <li key={it.id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={moveIds.includes(it.id)}
                      onChange={(e) => setMoveIds((ids) => (e.target.checked ? [...ids, it.id] : ids.filter((x) => x !== it.id)))}
                    />
                    {REQ_BY_KEY[it.requirementKey].label} · {subjectName(s, it)}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="text-sm">
          <span className="mb-1 block font-medium">Ask for something new</span>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <Select data-testid="rr-requirement" value={r.requirementKey} onChange={(e) => updateRow(i, { requirementKey: e.target.value as RequirementKey })}>
                  {REQUIREMENTS.filter((q) => q.subjectKind === r.subjectKind).map((q) => (
                    <option key={q.key} value={q.key}>
                      {q.label}
                    </option>
                  ))}
                </Select>
                <Select
                  data-testid="rr-subject"
                  value={`${r.subjectKind}:${r.subjectId}`}
                  onChange={(e) => {
                    const [kind, id] = e.target.value.split(':') as [SubjectKind, string]
                    updateRow(i, { subjectKind: kind, subjectId: id })
                  }}
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={`${sub.kind}:${sub.id}`}>
                      {sub.name}
                    </option>
                  ))}
                </Select>
                <Button variant="ghost" size="sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          <Button size="sm" className="mt-2" data-testid="rr-add-row" onClick={addRow}>
            + Add row
          </Button>
        </div>
        <Field label="Send to">
          <Select
            data-testid="rr-recipient"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value)
              setRecipientTouched(true)
            }}
          >
            {org.personIds.map((id) => (
              <option key={id} value={id}>
                {s.people[id].name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="rounded border border-ink-200 bg-ink-100 px-3 py-2 text-sm" data-testid="rr-preview">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">What this does</div>
          {moveIds.length + rows.length === 0
            ? <span className="text-ink-400">Pick at least one item.</span>
            : `Sends ${moveIds.length + rows.length} item${moveIds.length + rows.length === 1 ? '' : 's'} to ${s.people[recipient]?.name ?? 'the recipient'} as "One more thing from our ${PARTY_PHRASE[party]}". Nothing already accepted is touched.`}
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!valid}
            data-testid="rr-submit"
            onClick={() => {
              const newItems: NewItemSpec[] = rows.map((r) => ({ requirementKey: r.requirementKey, subjectKind: r.subjectKind, subjectId: r.subjectId }))
              dispatch({ type: 'case/raiseReRequest', caseId, raisedBy: party, reason, recipientPersonId: recipient, newItems, moveItemIds: moveIds })
              onClose()
            }}
          >
            Raise re-request
          </Button>
        </div>
      </div>
    </Modal>
  )
}
