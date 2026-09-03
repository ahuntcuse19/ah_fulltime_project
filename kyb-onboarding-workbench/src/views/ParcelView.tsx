// Customer-facing. One person, one case: every parcel they hold, work first.
import { useState } from 'react'
import { ItemRow } from '../components/ItemRow'
import { StructurePanel } from '../components/StructurePanel'
import { Button, DemoBox, Muted, ProgressBar, Stepper, cardClass } from '../components/ui'
import { PARTY_PHRASE, SENSITIVE_LINE } from '../model/catalog'
import { CUSTOMER_PHASES, customerPhase, estimateMinutes, parcelBuckets, parcelDone, personCaseSummary, personParcels, sortByCatalog, subjectName, type Bucket } from '../model/selectors'
import type { Item, Parcel } from '../model/types'
import { useDispatch, useStore } from '../state/Store'

export function ParcelView({ personId, caseId }: { personId: string; caseId: string }) {
  const s = useStore()
  const person = s.people[personId]
  const c = s.cases[caseId]
  if (!person || !c) return <p>Unknown parcel.</p>
  const org = s.orgs[c.organizationId]
  const parcels = personParcels(s, personId, caseId)
  const isAdmin = person.roles.includes('admin')
  const solo = org.personIds.length <= 1

  return (
    <div className="space-y-5">
      <DemoBox className="px-3 py-1.5">
        Demo · this is what <strong>{person.name}</strong> sees when they open their link for {org.legalName}.
      </DemoBox>
      <div className={`${cardClass} px-6 py-4`}>
        <Stepper steps={CUSTOMER_PHASES} current={customerPhase(s, personId, caseId)} testId="customer-stepper" />
      </div>
      {isAdmin && !solo && <AdminStrip caseId={caseId} personId={personId} />}
      {isAdmin && <StructurePanel key={`${caseId}:${personId}`} caseId={caseId} mode="customer" actorPersonId={personId} summary />}
      {parcels.length === 0 && <p className="text-sm">Nothing is needed from you right now.</p>}
      {parcels.map((p) => (
        <ParcelSection
          key={p.id}
          parcel={p}
          personId={personId}
          orgName={org.legalName}
          othersNeedWork={parcels.some((q) => q.id !== p.id && parcelDone(s, q.id).todo > 0)}
        />
      ))}
    </div>
  )
}

/** The admin sees the whole account, not just their own list. */
function AdminStrip({ caseId, personId }: { caseId: string; personId: string }) {
  const s = useStore()
  const dispatch = useDispatch()
  const c = s.cases[caseId]
  const org = s.orgs[c.organizationId]
  const sum = personCaseSummary(s, personId, caseId)
  const nobody =
    c.status === 'funded'
      ? 'Nobody. Your account is approved and funded.'
      : c.status === 'approved'
        ? 'Nobody. Your account is approved.'
        : 'Nobody. Everything is in and being checked.'

  return (
    <section data-testid="admin-strip" className={`${cardClass} p-6`}>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-semibold text-olive-900">{org.legalName}</span>
        <span className="font-mono text-sm tabular-nums">
          {sum.done} of {sum.total} done
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar done={sum.done} total={sum.total} testId="progress-bar" />
      </div>
      <div className="mt-3 text-sm">
        <span className="font-medium">Waiting on:</span>{' '}
        {sum.waitingOn.length === 0 ? (
          <span>{nobody}</span>
        ) : (
          <ul className="mt-1 space-y-1" data-testid="waiting-on">
            {sum.waitingOn.map((b) => (
              <li key={b.personId} className="flex items-center gap-2">
                <span>{b.isSelf ? 'You' : b.name}</span>
                <Muted>{b.outstandingCount} to go</Muted>
                {!b.isSelf && (
                  <Button size="sm" data-testid={`remind-${b.personId}`} onClick={() => dispatch({ type: 'case/nudge', caseId, personId: b.personId, actorPersonId: personId })}>
                    Remind
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

const BUCKET_TITLE: Record<Bucket, string> = { todo: 'To do', checking: 'Being checked', done: 'Done' }

function ParcelSection({ parcel, personId, orgName, othersNeedWork }: { parcel: Parcel; personId: string; orgName: string; othersNeedWork: boolean }) {
  const s = useStore()
  const dispatch = useDispatch()
  const [showDone, setShowDone] = useState(false)
  const buckets = parcelBuckets(s, parcel.id)
  const { done, total, todo } = parcelDone(s, parcel.id)
  const items = [...buckets.todo, ...buckets.checking, ...buckets.done]
  const allDone = total > 0 && done === total
  const readyToSubmit = todo === 0 && items.some((it) => it.status === 'provided')
  const awaiting = todo === 0 && !allDone && !readyToSubmit
  const hasPrefilled = buckets.todo.some((it) => it.status === 'prefilled_unconfirmed')
  const needsWork = buckets.todo.filter((it) => it.status !== 'prefilled_unconfirmed').length
  const canConfirmAll = hasPrefilled && needsWork === 0
  const hasSensitive = items.some((it) => it.subjectKind === 'person' && it.subjectId === personId)
  const showControls = parcel.status !== 'submitted' && parcel.status !== 'complete' && !awaiting

  const grouped = (its: Item[]) => {
    const groups = new Map<string, Item[]>()
    for (const it of its) {
      const key = it.subjectKind === 'person' && it.subjectId === personId ? 'About you' : `About ${subjectName(s, it)}`
      groups.set(key, [...(groups.get(key) ?? []), it])
    }
    return [...groups.entries()]
  }

  const renderBucket = (bucket: Bucket) => {
    const its = buckets[bucket]
    if (its.length === 0) return null
    const collapsed = bucket === 'done' && !showDone
    return (
      <div key={bucket} data-testid={`bucket-${bucket}`}>
        <div className="mb-2 flex items-center gap-3">
          <h3 className="text-base font-semibold">
            {BUCKET_TITLE[bucket]} <span className="text-sm font-normal text-ink-400">{its.length}</span>
          </h3>
          {bucket === 'done' && (
            <Button variant="ghost" size="sm" data-testid="done-toggle" onClick={() => setShowDone((v) => !v)}>
              {showDone ? 'Hide' : `Show ${its.length} done`}
            </Button>
          )}
        </div>
        {!collapsed &&
          grouped(its).map(([title, group]) => (
            <div key={title} className="mb-3">
              <h4 className="text-xs font-medium uppercase tracking-wide text-ink-400">{title}</h4>
              {title === 'About you' && hasSensitive && bucket === 'todo' && <p className="mb-1 text-xs text-ink-400">{SENSITIVE_LINE(orgName)}</p>}
              <ul>
                {sortByCatalog(group).map((it) => (
                  <ItemRow key={it.id} item={it} mode="customer" actorPersonId={personId} />
                ))}
              </ul>
            </div>
          ))}
        {bucket === 'todo' && showControls && (
          <div className="mt-2 flex items-center gap-3">
            {canConfirmAll ? (
              <Button variant="primary" data-testid="confirm-all-submit" onClick={() => dispatch({ type: 'parcel/confirmAllAndSubmit', parcelId: parcel.id, actorPersonId: personId })}>
                Confirm all pre-filled &amp; submit
              </Button>
            ) : (
              <Button variant="primary" data-testid="submit" disabled={!readyToSubmit} onClick={() => dispatch({ type: 'parcel/submit', parcelId: parcel.id, actorPersonId: personId })}>
                Submit for review
              </Button>
            )}
            {!canConfirmAll && !readyToSubmit && <Muted>{needsWork} items still need something from you.</Muted>}
          </div>
        )}
      </div>
    )
  }

  return (
    <section data-testid={parcel.isReRequest ? 'parcel-rerequest' : 'parcel-primary'} className={`${cardClass} p-7`}>
      {parcel.isReRequest && parcel.raisedBy && (
        <div className="mb-3">
          <h2 className="text-xl font-semibold text-olive-900" data-testid="rr-title">
            One more thing from our {PARTY_PHRASE[parcel.raisedBy]}
          </h2>
          <p className="text-sm text-ink-600">{parcel.reason}</p>
        </div>
      )}
      <div className="mb-4">
        <p className="text-xl font-semibold text-olive-900" data-testid="parcel-header">
          {allDone
            ? othersNeedWork
              ? "Your original request is done. There's one more thing below."
              : `All ${total} done. Nothing more is needed from you.`
            : awaiting
              ? `Thanks. Your ${total} items are being checked. We'll email you when that's done or if anything needs another look. Nothing to do now.`
              : `${done} of ${total} done`}
        </p>
        {!allDone && !awaiting && (
          <Muted>
            {todo} to go · about {estimateMinutes(s, parcel.id)} minutes
          </Muted>
        )}
        <div className="mt-2">
          <ProgressBar done={done} total={total} testId="progress-bar" />
        </div>
      </div>
      {todo === 0 && buckets.checking.length === 0 && buckets.done.length === 0 && <p className="text-sm text-ink-400">Nothing here yet.</p>}
      <div className="space-y-5">
        {renderBucket('todo')}
        {readyToSubmit && buckets.todo.length === 0 && showControls && (
          <div className="flex items-center gap-3">
            <Button variant="primary" data-testid="submit" onClick={() => dispatch({ type: 'parcel/submit', parcelId: parcel.id, actorPersonId: personId })}>
              Submit for review
            </Button>
          </div>
        )}
        {renderBucket('checking')}
        {renderBucket('done')}
      </div>
    </section>
  )
}
