import { useState } from 'react'
import { ItemRow } from '../components/ItemRow'
import { ReRequestModal } from '../components/ReRequestModal'
import { Button, Chip, Muted, Panel, caseTone, parcelTone } from '../components/ui'
import { CASE_STATUS_LABEL, PARCEL_STATUS_LABEL, PARTY_LABEL, ROLE_LABEL, TIER_LABEL } from '../model/catalog'
import { caseItems, caseParcels, daysOpen, outstanding, parcelProgress, relativeTime, sortByCatalog, timeline } from '../model/selectors'
import type { Item } from '../model/types'
import { useDispatch, useStore } from '../state/Store'

export function CaseDetailView({ caseId }: { caseId: string }) {
  const s = useStore()
  const dispatch = useDispatch()
  const [modal, setModal] = useState(false)
  const c = s.cases[caseId]
  if (!c) return <p>Unknown case.</p>
  const org = s.orgs[c.organizationId]
  const items = caseItems(s, caseId)
  const inReview = items.filter((it) => it.status === 'in_review').length
  const allAccepted = items.every((it) => it.status === 'accepted')

  const groups: { key: string; title: string; kind: string; items: Item[] }[] = [
    { key: org.id, title: org.legalName, kind: 'Organisation', items: items.filter((it) => it.subjectKind === 'organization') },
    ...org.legalEntityIds.map((eid) => ({
      key: eid,
      title: s.entities[eid].legalName,
      kind: `Legal entity · ${s.entities[eid].jurisdiction}`,
      items: items.filter((it) => it.subjectKind === 'legalEntity' && it.subjectId === eid),
    })),
    ...org.personIds.map((pid) => ({
      key: pid,
      title: s.people[pid].name,
      kind: s.people[pid].roles.map((r) => ROLE_LABEL[r]).join(', '),
      items: items.filter((it) => it.subjectKind === 'person' && it.subjectId === pid),
    })),
  ].filter((g) => g.items.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="text-sm text-accent-600 hover:underline" onClick={() => dispatch({ type: 'nav', view: { kind: 'console' } })}>
          ← Console
        </button>
        <h1 className="text-lg font-semibold">{org.legalName}</h1>
        <Chip tone={c.tier === 'complex' ? 'warn' : c.tier === 'standard' ? 'accent' : 'grey'} testId="case-tier">
          {TIER_LABEL[c.tier]}
        </Chip>
        <Chip tone={caseTone(c.status)} testId="case-status">
          {CASE_STATUS_LABEL[c.status]}
        </Chip>
        <Muted>{daysOpen(s, c)} days open</Muted>
        <Muted>
          {outstanding(s, caseId)} of {items.length} outstanding
        </Muted>
        <div className="ml-auto flex gap-2">
          <Button data-testid="raise-rr" onClick={() => setModal(true)}>
            Raise re-request
          </Button>
          <Button data-testid="accept-all" disabled={inReview === 0} onClick={() => dispatch({ type: 'case/acceptAllInReview', caseId })}>
            Accept all in review ({inReview})
          </Button>
          {c.status !== 'approved' && c.status !== 'funded' && (
            <Button variant="primary" data-testid="approve" disabled={!allAccepted} onClick={() => dispatch({ type: 'case/approve', caseId })}>
              Approve
            </Button>
          )}
          {c.status === 'approved' && (
            <Button variant="primary" data-testid="fund" onClick={() => dispatch({ type: 'case/fund', caseId })}>
              Fund
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_2fr_1fr] gap-6">
        <div className="space-y-4">
          <Panel title="Parcels">
            <ul className="space-y-3">
              {caseParcels(s, caseId).map((p) => {
                const person = s.people[p.personId]
                const prog = parcelProgress(s, p.id)
                return (
                  <li key={p.id} data-testid="parcel-card" className="rounded border border-ink-200 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{person.name}</span>
                      <Chip tone={parcelTone(p.status)}>{PARCEL_STATUS_LABEL[p.status]}</Chip>
                    </div>
                    <Muted>{person.roles.map((r) => ROLE_LABEL[r]).join(', ')}</Muted>
                    <div className="text-xs text-ink-600">
                      {prog.accepted} of {prog.total} accepted
                    </div>
                    {p.isReRequest && p.raisedBy && (
                      <div className="mt-1">
                        <Chip tone="warn" testId="rr-badge">
                          Re-request · {PARTY_LABEL[p.raisedBy]}
                        </Chip>
                        <div className="mt-1 text-xs text-ink-400">{p.reason}</div>
                      </div>
                    )}
                    <button type="button" className="mt-1 text-xs text-accent-600 hover:underline" onClick={() => dispatch({ type: 'demo/switchPerson', personId: p.personId })}>
                      Open as {person.name.split(' ')[0]}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Panel>
        </div>

        <Panel title="Items">
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.key}>
                <h3 className="mb-1 text-sm font-semibold">
                  {g.title} <Muted>{g.kind}</Muted>
                </h3>
                <ul>
                  {sortByCatalog(g.items).map((it) => (
                    <ItemRow key={it.id} item={it} mode="operator" orgName={org.legalName} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Timeline">
          <ul className="space-y-2 text-xs" data-testid="timeline">
            {timeline(s, caseId).map((e) => {
              const party = Object.values(PARTY_LABEL).includes(e.actor)
              return (
                <li key={e.id} data-testid="timeline-entry" className={party ? 'border-l-[3px] border-accent-600 pl-2' : 'pl-[11px]'}>
                  <div className="text-ink-400">{relativeTime(s.now, e.at)}</div>
                  <div>
                    <strong>{e.actor}</strong> {e.message}
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      {modal && <ReRequestModal caseId={caseId} onClose={() => setModal(false)} />}
    </div>
  )
}
