import { useState } from 'react'
import { ItemRow } from '../components/ItemRow'
import { ReRequestModal } from '../components/ReRequestModal'
import { StructurePanel } from '../components/StructurePanel'
import { Badge, Button, Chip, Muted, PageHeader, Panel, Stepper, caseTone, parcelTone } from '../components/ui'
import { CASE_STATUS_LABEL, PARCEL_STATUS_LABEL, PARTY_LABEL, ROLE_LABEL, TIER_LABEL } from '../model/catalog'
import { CASE_PHASES, caseItems, caseParcels, casePhase, daysOpen, outstanding, parcelProgress, relativeTime, sortByCatalog, timeline } from '../model/selectors'
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
  const nextIsApprove = allAccepted && c.status !== 'approved' && c.status !== 'funded'

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
    <div>
      <PageHeader
        eyebrow={
          <span>
            <button type="button" className="hover:underline" onClick={() => dispatch({ type: 'nav', view: { kind: 'console' } })}>
              Cases
            </button>{' '}
            / {org.legalName}
          </span>
        }
        title={org.legalName}
        meta={
          <>
            <Badge testId="case-tier">{TIER_LABEL[c.tier]}</Badge>
            <Chip tone={caseTone(c.status)} testId="case-status">
              {CASE_STATUS_LABEL[c.status]}
            </Chip>
            <span>{daysOpen(s, c)} days open</span>
            <span>·</span>
            <span>
              {outstanding(s, caseId)} of {items.length} outstanding
            </span>
          </>
        }
        actions={
          <>
            <Button data-testid="raise-rr" onClick={() => setModal(true)}>
              Raise re-request
            </Button>
            <Button variant={inReview > 0 ? 'primary' : 'secondary'} data-testid="accept-all" disabled={inReview === 0} onClick={() => dispatch({ type: 'case/acceptAllInReview', caseId })}>
              Accept all in review ({inReview})
            </Button>
            {c.status !== 'approved' && c.status !== 'funded' && (
              <Button variant={nextIsApprove ? 'primary' : 'secondary'} data-testid="approve" disabled={!allAccepted} onClick={() => dispatch({ type: 'case/approve', caseId })}>
                Approve
              </Button>
            )}
            {c.status === 'approved' && (
              <Button variant="primary" data-testid="fund" onClick={() => dispatch({ type: 'case/fund', caseId })}>
                Fund
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-6 rounded-[16px] bg-white px-5 py-3 shadow-card">
        <Stepper steps={CASE_PHASES} {...casePhase(c)} testId="case-pipeline" />
      </div>
      <div className="mb-4">
        <StructurePanel caseId={caseId} mode="operator" actorPersonId="operator" summary />
      </div>

      <div className="grid grid-cols-[236px_minmax(0,1fr)_256px] gap-5">
        <div className="space-y-4">
          <Panel title="Parcels" dense>
            <ul className="divide-y divide-ink-100">
              {caseParcels(s, caseId).map((p) => {
                const person = s.people[p.personId]
                const prog = parcelProgress(s, p.id)
                return (
                  <li key={p.id} data-testid="parcel-card" className="px-2 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" className="font-medium hover:underline" onClick={() => dispatch({ type: 'demo/switchPerson', personId: p.personId })}>
                        {person.name}
                      </button>
                      <Chip tone={parcelTone(p.status)}>{PARCEL_STATUS_LABEL[p.status]}</Chip>
                    </div>
                    <div className="flex items-center justify-between text-xs text-ink-400">
                      <span>{person.roles.map((r) => ROLE_LABEL[r]).join(', ')}</span>
                      <span className="tabular-nums">
                        {prog.accepted} of {prog.total} accepted
                      </span>
                    </div>
                    {p.isReRequest && p.raisedBy && (
                      <div className="mt-1.5">
                        <Chip tone="warn" testId="rr-badge">
                          Re-request · {PARTY_LABEL[p.raisedBy]}
                        </Chip>
                        <div className="mt-1 text-xs text-ink-400">{p.reason}</div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Panel>
        </div>

        <Panel title="Items" dense>
          <div className="divide-y divide-ink-200">
            {groups.map((g) => (
              <div key={g.key} className="px-2 py-3">
                <h3 className="mb-1 text-sm font-semibold">
                  {g.title} <Muted>{g.kind}</Muted>
                </h3>
                <ul>
                  {sortByCatalog(g.items).map((it) => (
                    <ItemRow key={it.id} item={it} mode="operator" />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Timeline">
          <ol className="relative ml-1 space-y-4 border-l border-ink-200 pl-4 text-xs" data-testid="timeline">
            {timeline(s, caseId).map((e) => {
              const party = Object.values(PARTY_LABEL).includes(e.actor)
              return (
                <li key={e.id} data-testid="timeline-entry" className="relative">
                  <span className={`absolute -left-[21px] top-1 h-2 w-2 rounded-full ${party ? 'bg-accent-600' : 'bg-ink-400'}`} />
                  <div className="text-ink-400">{relativeTime(s.now, e.at)}</div>
                  <div className={party ? 'text-accent-600' : ''}>
                    <strong>{e.actor}</strong> {e.message}
                  </div>
                </li>
              )
            })}
          </ol>
        </Panel>
      </div>

      {modal && <ReRequestModal caseId={caseId} onClose={() => setModal(false)} />}
    </div>
  )
}
