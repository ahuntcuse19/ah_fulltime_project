import { useMemo, useState } from 'react'
import { Button, DemoBox, Field, PageHeader, inputClass } from '../components/ui'
import { JURISDICTION_NAME, TRIAGE_HELP } from '../model/catalog'
import { assignParcels, instantiateCase } from '../model/rules'
import { JURISDICTIONS, type CountBand, type Jurisdiction, type LegalEntity, type Organization, type Person, type TriageAnswers } from '../model/types'
import { useDispatch, useStore } from '../state/Store'
import { ACME, NORTHWIND, reidFixture, type Fixture } from '../state/seed'

interface Form {
  orgName: string
  ein: string
  adminName: string
  adminEmail: string
  entityBand: CountBand
  uboBand: CountBand
  jurisdictions: Jurisdiction[]
  isMsb: boolean
  preset: 'acme' | 'northwind' | null
}

const BLANK: Form = {
  orgName: '',
  ein: '',
  adminName: '',
  adminEmail: '',
  entityBand: '1',
  uboBand: '1',
  jurisdictions: ['US'],
  isMsb: false,
  preset: null,
}

const BAND_COUNT: Record<CountBand, number> = { '1': 1, '2-3': 3, '4+': 4 }

function fromFixture(f: Fixture, preset: Form['preset']): Form {
  const admin = f.people.find((p) => p.roles.includes('admin'))!
  return {
    orgName: f.org.legalName,
    ein: f.org.ein ?? '',
    adminName: admin.name,
    adminEmail: admin.email,
    entityBand: f.answers.entityBand,
    uboBand: f.answers.uboBand,
    jurisdictions: f.answers.jurisdictions,
    isMsb: f.answers.isMsb,
    preset,
  }
}

/** Free-form draft generation, exactly as the plan specifies. */
function draftFromForm(form: Form, seq: () => number): Fixture {
  const e = BAND_COUNT[form.entityBand]
  const u = BAND_COUNT[form.uboBand]
  const J = JURISDICTIONS.filter((j) => form.jurisdictions.includes(j))
  const primary = J[0] ?? 'US'
  const orgId = `org_${seq()}`
  const slug = form.orgName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'org'
  const entities: LegalEntity[] = Array.from({ length: e }, (_, i) => ({
    id: `ent_${seq()}`,
    organizationId: orgId,
    legalName: i === 0 ? form.orgName : `${form.orgName} — Entity ${i + 1}`,
    jurisdiction: J[i % Math.max(1, J.length)] ?? primary,
    isPrimary: i === 0,
  }))
  const admin: Person = {
    id: `per_${seq()}`,
    organizationId: orgId,
    name: form.adminName,
    email: form.adminEmail,
    roles: u === 1 ? ['admin', 'ubo'] : ['admin'],
    jurisdiction: primary,
    ownershipPercent: u === 1 ? 100 : undefined,
  }
  const owners: Person[] =
    u >= 2
      ? Array.from({ length: u }, (_, k) => ({
          id: `per_${seq()}`,
          organizationId: orgId,
          name: `Owner ${k + 1}`,
          email: `owner${k + 1}@${slug}.example`,
          roles: ['ubo'] as Person['roles'],
          jurisdiction: J[k % Math.max(1, J.length)] ?? primary,
          ownershipPercent: Math.floor(100 / u),
        }))
      : []
  const people = [admin, ...owners]
  const org: Organization = {
    id: orgId,
    legalName: form.orgName,
    ein: form.ein.trim() || undefined,
    primaryJurisdiction: primary,
    operatingJurisdictions: J,
    isMoneyServicesBusiness: form.isMsb,
    legalEntityIds: entities.map((x) => x.id),
    personIds: people.map((p) => p.id),
  }
  const answers: TriageAnswers = { entityBand: form.entityBand, uboBand: form.uboBand, jurisdictions: J, isMsb: form.isMsb }
  return { org, entities, people, answers }
}

export function TriageView() {
  const s = useStore()
  const dispatch = useDispatch()
  const [form, setForm] = useState<Form>(BLANK)
  const [step, setStep] = useState<1 | 2>(1)

  const edit = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch, preset: null }))
  const ready = form.orgName.trim() && form.adminName.trim() && form.adminEmail.trim() && form.jurisdictions.length > 0

  // The draft is built with a throwaway sequence; ids are issued after
  // state.seq so they never collide with existing records.
  const draft = useMemo(() => {
    let n = s.seq
    const seq = () => ++n
    if (form.preset === 'acme') return reidFixture(ACME, seq)
    if (form.preset === 'northwind') return reidFixture(NORTHWIND, seq)
    return draftFromForm(form, seq)
  }, [form, s.seq])

  const summary = useMemo(() => {
    let n = 0
    const ids = (p: string) => `${p}_tmp_${++n}`
    const raw = instantiateCase(ids, draft.org, draft.entities, draft.people, 'tmp')
    const entities = Object.fromEntries(draft.entities.map((e) => [e.id, e]))
    const people = Object.fromEntries(draft.people.map((p) => [p.id, p]))
    const { parcels, items } = assignParcels(ids, 'tmp', raw, draft.org, entities, people)
    const admin = draft.people.find((p) => p.roles.includes('admin'))!
    const prefilled = items.filter((it) => it.status === 'prefilled_unconfirmed').length
    const adminItems = items.filter((it) => it.assignedPersonId === admin.id).length
    const rows = parcels.map((p) => {
      const person = people[p.personId]
      const mine = items.filter((it) => it.assignedPersonId === p.personId)
      return { person, count: mine.length, prefilled: mine.filter((it) => it.status === 'prefilled_unconfirmed').length }
    })
    return { total: items.length, people: parcels.length, prefilled, adminItems, rows }
  }, [draft])

  const toggleJurisdiction = (j: Jurisdiction) =>
    edit({ jurisdictions: form.jurisdictions.includes(j) ? form.jurisdictions.filter((x) => x !== j) : [...form.jurisdictions, j] })

  if (step === 2) {
    const most = summary.prefilled >= Math.ceil(summary.adminItems / 2)
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow="Step 2 of 2 · What we'll need" title="Here is the whole picture before anyone starts" />
        <div className="space-y-6">
        <h2 className="text-lg font-semibold" data-testid="triage-summary">
          Based on your answers we need <strong>{summary.total}</strong> items from <strong>{summary.people}</strong>{' '}
          {summary.people === 1 ? 'person' : 'people'}.{' '}
          {most ? 'Most of what we need from you is available now.' : `${summary.prefilled} of these are already on file and only need your confirmation.`}
        </h2>
        <p className="text-base text-ink-600" data-testid="triage-reassurance">
          {summary.people === 1
            ? `All of them are yours (${summary.prefilled} already on file, just confirm them).`
            : `${summary.adminItems} of these are yours (${summary.prefilled} already on file, just confirm them). We'll ask the other ${summary.people - 1} ${summary.people - 1 === 1 ? 'person' : 'people'} directly; you don't need to collect anything from them.`}
        </p>
        <table className="w-full rounded border border-ink-200 bg-white text-sm">
          <thead className="bg-ink-100 text-left text-xs uppercase tracking-wide text-ink-600">
            <tr>
              <th className="px-3 py-2">Who</th>
              <th className="px-3 py-2">What we'll ask them for</th>
              <th className="px-3 py-2">Already on file</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((r) => (
              <tr key={r.person.id} className="border-t border-ink-200">
                <td className="px-3 py-2">
                  {r.person.name}
                  {r.person.roles.includes('admin') && <span className="ml-1 text-xs text-ink-400">(you)</span>}
                </td>
                <td className="px-3 py-2 tabular-nums">{r.count} items</td>
                <td className="px-3 py-2 tabular-nums">{r.prefilled}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2">
          <Button onClick={() => setStep(1)}>Back</Button>
          <Button
            variant="primary"
            data-testid="triage-create"
            onClick={() => dispatch({ type: 'triage/confirm', answers: draft.answers, org: draft.org, entities: draft.entities, people: draft.people })}
          >
            Create case and send requests
          </Button>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Step 1 of 2 · About the business" title="Four questions, then we show you exactly what we'll need" />
      <DemoBox className="mb-4 flex items-center gap-2 px-3 py-2">
        <span className="font-medium text-warn-600">Demo</span>
        <span>prefill as</span>
        <Button size="sm" variant="ghost" data-testid="preset-acme" onClick={() => setForm(fromFixture(ACME, 'acme'))}>
          Acme
        </Button>
        <Button size="sm" variant="ghost" data-testid="preset-northwind" onClick={() => setForm(fromFixture(NORTHWIND, 'northwind'))}>
          Northwind
        </Button>
      </DemoBox>
      <div className="space-y-5 rounded border border-ink-200 bg-white p-6">
        <Field label="Organisation legal name">
          <input className={inputClass} value={form.orgName} onChange={(e) => edit({ orgName: e.target.value })} />
        </Field>
        <Field label="EIN (optional)" hint="Prefill works for EINs the fake registry knows; the real one would be a lookup.">
          <input className={inputClass} value={form.ein} onChange={(e) => edit({ ein: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Admin name">
            <input className={inputClass} value={form.adminName} onChange={(e) => edit({ adminName: e.target.value })} />
          </Field>
          <Field label="Admin email">
            <input className={inputClass} value={form.adminEmail} onChange={(e) => edit({ adminEmail: e.target.value })} />
          </Field>
        </div>
        <RadioRow label="How many legal entities?" hint={TRIAGE_HELP.entities} value={form.entityBand} options={['1', '2-3', '4+']} onChange={(v) => edit({ entityBand: v as CountBand })} />
        <RadioRow label="How many individuals own 25% or more?" hint={TRIAGE_HELP.ubos} value={form.uboBand} options={['1', '2-3', '4+']} onChange={(v) => edit({ uboBand: v as CountBand })} />
        <div className="text-sm">
          <span className="block font-medium">Which countries do you operate in?</span>
          <span className="mb-1 block text-xs text-ink-400">{TRIAGE_HELP.jurisdictions}</span>
          <div className="flex flex-wrap gap-4">
            {JURISDICTIONS.map((j) => (
              <label key={j} className="flex items-center gap-1">
                <input type="checkbox" checked={form.jurisdictions.includes(j)} onChange={() => toggleJurisdiction(j)} /> {JURISDICTION_NAME[j]}
              </label>
            ))}
          </div>
        </div>
        <RadioRow label="Are you a money services business?" hint={TRIAGE_HELP.msb} value={form.isMsb ? 'Yes' : 'No'} options={['Yes', 'No']} onChange={(v) => edit({ isMsb: v === 'Yes' })} />
        <div className="flex justify-end border-t border-ink-200 pt-4">
          <Button variant="primary" disabled={!ready} data-testid="triage-continue" onClick={() => setStep(2)}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

function RadioRow({ label, hint, value, options, onChange }: { label: string; hint?: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="text-sm">
      <span className="block font-medium">{label}</span>
      {hint && <span className="mb-1 block text-xs text-ink-400">{hint}</span>}
      <div className="flex gap-4">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-1">
            <input type="radio" name={label} checked={value === o} onChange={() => onChange(o)} /> {o}
          </label>
        ))}
      </div>
    </div>
  )
}
