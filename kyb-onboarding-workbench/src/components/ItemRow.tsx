import { useState } from 'react'
import { Button, Chip, Muted, UploadButton, inputClass, itemTone } from '../components/ui'
import { CUSTOMER_ITEM_STATUS_LABEL, ITEM_STATUS_LABEL, PLACEHOLDER, REQ_BY_KEY } from '../model/catalog'
import type { Item } from '../model/types'
import { useDispatch, useStore } from '../state/Store'

interface Props {
  item: Item
  mode: 'operator' | 'customer'
  actorPersonId?: string
}

export function ItemRow({ item, mode, actorPersonId }: Props) {
  const s = useStore()
  const dispatch = useDispatch()
  const req = REQ_BY_KEY[item.requirementKey]
  const [note, setNote] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const actor = mode === 'operator' ? 'operator' : (actorPersonId ?? item.assignedPersonId)

  const provide = (value: string) => {
    if (!value.trim()) return
    dispatch({ type: 'item/provide', itemId: item.id, value: req.key === 'tax_id' ? 'provided' : value, actorPersonId: actor })
    setDraft('')
    setEditing(false)
  }

  const truncated = item.value && item.value.length > 40 ? `${item.value.slice(0, 40)}…` : item.value

  if (mode === 'operator') {
    const reviewable = item.status === 'provided' || item.status === 'in_review'
    return (
      <li data-testid="item-row" data-status={item.status} data-key={item.requirementKey} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 border-b border-ink-100 py-2 text-sm last:border-b-0 md:grid-cols-[minmax(0,1fr)_112px_112px_128px] md:gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="font-medium">{req.label}</span>
            {req.provenance === 'assumed' && <Muted>assumed</Muted>}
          </div>
          {item.value && (
            <div className="truncate text-xs text-ink-600" data-testid="item-value">
              {truncated}
            </div>
          )}
          {item.reviewerNote && (
            <div className="mt-1 rounded border border-warn-600/30 bg-warn-100 px-2 py-1 text-xs text-warn-600" data-testid="reviewer-note">
              {item.reviewerNote}
            </div>
          )}
          {note !== null && (
            <div className="mt-2 flex items-start gap-2">
              <textarea className={`${inputClass} h-16`} value={note} placeholder="What is still needed, in plain language" onChange={(e) => setNote(e.target.value)} />
              <Button
                size="sm"
                disabled={!note.trim()}
                data-testid="send-back"
                onClick={() => {
                  dispatch({ type: 'item/moreInfo', itemId: item.id, note })
                  setNote(null)
                }}
              >
                Send back
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setNote(null)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div className="order-3 text-xs text-ink-600 md:order-none md:truncate">{s.people[item.assignedPersonId]?.name}</div>
        <div>
          <Chip tone={itemTone(item.status)}>{ITEM_STATUS_LABEL[item.status]}</Chip>
        </div>
        <div className="order-4 col-span-2 flex justify-end gap-1 md:order-none md:col-span-1">
          {reviewable && (
            <>
              <Button size="sm" data-testid="accept-item" onClick={() => dispatch({ type: 'item/accept', itemId: item.id })}>
                Accept
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNote(note === null ? '' : null)}>
                More info
              </Button>
            </>
          )}
        </div>
      </li>
    )
  }

  const input = (
    <div className="mt-1.5 flex items-center gap-2">
      {req.inputKind === 'file' ? (
        <UploadButton testId="file-input" onFile={provide} />
      ) : (
        <>
          <input
            type={req.key === 'tax_id' ? 'password' : 'text'}
            className={`${inputClass} md:max-w-md`}
            value={draft}
            placeholder={req.key === 'tax_id' ? 'Entered here, not stored in this prototype' : (PLACEHOLDER[req.key] ?? '')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && provide(draft)}
          />
          <Button size="sm" onClick={() => provide(draft)} disabled={!draft.trim()}>
            Save
          </Button>
        </>
      )}
    </div>
  )

  return (
    <li data-testid="item-row" data-status={item.status} data-key={item.requirementKey} className="border-b border-ink-100 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{req.label}</div>
          <div className="text-xs text-ink-600">{req.helpText}</div>
          {item.reviewerNote && (
            <div className="mt-1.5 rounded border border-warn-600/30 bg-warn-100 px-2 py-1 text-xs text-warn-600" data-testid="reviewer-note">
              <strong className="mr-1">What we still need:</strong>
              {item.reviewerNote}
            </div>
          )}
          {item.status === 'prefilled_unconfirmed' && !editing && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded border border-ink-200 bg-ink-100 px-2 py-1 text-sm" data-testid="prefilled-value">
                {item.value}
              </span>
              <Button variant="primary" size="sm" data-testid="confirm-item" onClick={() => dispatch({ type: 'item/confirm', itemId: item.id, actorPersonId: actor })}>
                Confirm
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                Change
              </Button>
            </div>
          )}
          {(item.status === 'not_started' || item.status === 'more_info_needed' || (item.status === 'prefilled_unconfirmed' && editing)) && input}
          {(item.status === 'provided' || item.status === 'in_review' || item.status === 'accepted') && item.value && <div className="mt-0.5 text-xs text-ink-600">{truncated}</div>}
        </div>
        <Chip tone={itemTone(item.status)}>{CUSTOMER_ITEM_STATUS_LABEL[item.status]}</Chip>
      </div>
    </li>
  )
}
