import { ItemRow } from '../components/ItemRow'
import { StructurePanel } from '../components/StructurePanel'
import { Button, Chip, Muted, parcelTone } from '../components/ui'
import { PARCEL_STATUS_LABEL, PARTY_PHRASE } from '../model/catalog'
import { estimateMinutes, parcelItems, personParcels, sortByCatalog, subjectName } from '../model/selectors'
import type { Item, Parcel } from '../model/types'
import { useDispatch, useStore } from '../state/Store'

export function ParcelView({ personId, caseId }: { personId: string; caseId: string }) {
  const s = useStore()
  const person = s.people[personId]
  const c = s.cases[caseId]
  if (!person || !c) return <p>Unknown parcel.</p>
  const org = s.orgs[c.organizationId]
  const parcels = personParcels(s, personId, caseId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded bg-ink-100 px-3 py-1 text-xs text-ink-600">
        Viewing as {person.name} · {org.legalName}
      </div>
      {person.roles.includes('admin') && <StructurePanel caseId={caseId} mode="customer" actorPersonId={personId} />}
      {parcels.length === 0 && <p className="text-sm">Nothing is needed from you right now.</p>}
      {parcels.map((p) => (
        <ParcelSection key={p.id} parcel={p} personId={personId} orgName={org.legalName} />
      ))}
    </div>
  )
}

function ParcelSection({ parcel, personId, orgName }: { parcel: Parcel; personId: string; orgName: string }) {
  const s = useStore()
  const dispatch = useDispatch()
  const items = parcelItems(s, parcel.id)
  const n = items.length
  const allAccepted = items.every((it) => it.status === 'accepted')
  const awaiting = parcel.status === 'submitted'
  const hasPrefilled = items.some((it) => it.status === 'prefilled_unconfirmed')
  const needsWork = items.filter((it) => it.status === 'not_started' || it.status === 'more_info_needed').length
  const canSubmit = items.every((it) => ['provided', 'in_review', 'accepted'].includes(it.status)) && items.some((it) => it.status === 'provided')
  const canConfirmAll = hasPrefilled && needsWork === 0

  const groups = new Map<string, Item[]>()
  for (const it of items) {
    const key = it.subjectKind === 'person' && it.subjectId === personId ? 'About you' : `About ${subjectName(s, it)}`
    groups.set(key, [...(groups.get(key) ?? []), it])
  }

  return (
    <section data-testid={parcel.isReRequest ? 'parcel-rerequest' : 'parcel-primary'} className="rounded border border-ink-200 bg-white p-5">
      {parcel.isReRequest && parcel.raisedBy && (
        <div className="mb-3">
          <h2 className="text-lg font-semibold" data-testid="rr-title">
            One more thing from our {PARTY_PHRASE[parcel.raisedBy]}
          </h2>
          <p className="text-sm text-ink-600">{parcel.reason}</p>
        </div>
      )}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-base font-medium" data-testid="parcel-header">
          {allAccepted
            ? 'Everything we asked you for has been accepted. Nothing more is needed.'
            : awaiting
              ? `Thanks. Your ${n} items are being reviewed.`
              : `You have been asked for ${n} items. This should take about ${estimateMinutes(s, parcel.id)} minutes.`}
        </p>
        <Chip tone={parcelTone(parcel.status)} testId="parcel-chip">
          {PARCEL_STATUS_LABEL[parcel.status]}
        </Chip>
      </div>
      <div className="space-y-4">
        {[...groups.entries()].map(([title, its]) => (
          <div key={title}>
            <h3 className="mb-1 text-sm font-semibold">{title}</h3>
            <ul>
              {sortByCatalog(its).map((it) => (
                <ItemRow key={it.id} item={it} mode="customer" orgName={orgName} actorPersonId={personId} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      {parcel.status !== 'submitted' && parcel.status !== 'complete' && (
        <div className="mt-4 flex items-center gap-3">
          {canConfirmAll ? (
            <Button variant="primary" data-testid="confirm-all-submit" onClick={() => dispatch({ type: 'parcel/confirmAllAndSubmit', parcelId: parcel.id, actorPersonId: personId })}>
              Confirm all pre-filled &amp; submit
            </Button>
          ) : (
            <Button variant="primary" data-testid="submit" disabled={!canSubmit} onClick={() => dispatch({ type: 'parcel/submit', parcelId: parcel.id, actorPersonId: personId })}>
              Submit for review
            </Button>
          )}
          {!canConfirmAll && !canSubmit && <Muted>{needsWork} items still need something from you.</Muted>}
        </div>
      )}
    </section>
  )
}
