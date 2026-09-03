// Smoke check: drives the production preview through the acceptance criteria.
// Usage: npm run smoke   (builds, serves on :4173, runs headless Chromium)
import { execSync, spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4173
const BASE = `http://localhost:${PORT}/`

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root || !existsSync(root)) return undefined
  const dir = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop()
  const p = dir && `${root}/${dir}/chrome-linux/chrome`
  return p && existsSync(p) ? p : undefined
}

execSync('npx vite build', { stdio: 'inherit' })
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1500))

const browser = await chromium.launch({ executablePath: findChromium() })
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(e.message))

let failed = 0
async function check(name, fn) {
  try {
    await fn()
    console.log(`ok   ${name}`)
  } catch (e) {
    failed += 1
    console.log(`FAIL ${name}\n     ${e.message.split('\n')[0]}`)
  }
}
const eq = (a, b, what) => {
  if (a !== b) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)
}
const includes = (text, sub, what) => {
  if (!text.includes(sub)) throw new Error(`${what}: expected to contain ${JSON.stringify(sub)}, got ${JSON.stringify(text.slice(0, 200))}`)
}
const t = (sel) => page.locator(sel).first().innerText()
const count = (sel) => page.locator(sel).count()
const reload = async () => {
  await page.goto(BASE)
  await page.waitForSelector('[data-testid=case-row]')
}
const viewAs = (personId) => page.selectOption('[data-testid=person-switcher]', personId)
const openCase = async (org) => {
  await page.getByRole('button', { name: org, exact: true }).click()
  await page.waitForSelector('[data-testid=parcel-card]')
}
const ORG_KEYS = ['legal_name', 'ein', 'registered_address', 'business_description', 'expected_volumes', 'source_of_funds', 'bank_account', 'ownership_chart', 'msb_license']

await reload()

await check('1a triage as Acme -> 16 items, 1 parcel', async () => {
  await page.click('[data-testid=nav-triage]')
  await page.click('[data-testid=preset-acme]')
  await page.click('[data-testid=triage-continue]')
  includes(await t('[data-testid=triage-summary]'), '16 items from 1 person', 'summary')
  await page.click('[data-testid=triage-create]')
  eq(await count('[data-testid=parcel-card]'), 1, 'parcel cards')
  eq(await count('[data-testid=item-row]'), 16, 'item rows')
})

await check('1b triage as Northwind -> 52 items, 6 parcels', async () => {
  await page.click('[data-testid=nav-triage]')
  await page.click('[data-testid=preset-northwind]')
  await page.click('[data-testid=triage-continue]')
  includes(await t('[data-testid=triage-summary]'), '52 items from 6 people', 'summary')
  await page.click('[data-testid=triage-create]')
  eq(await count('[data-testid=parcel-card]'), 6, 'parcel cards')
  eq(await count('[data-testid=item-row]'), 52, 'item rows')
})

await check('2 Singapore UBO sees only her items', async () => {
  await reload()
  await viewAs('per_nw_ubo_sg')
  await page.waitForSelector('[data-testid=parcel-primary]')
  eq(await count('[data-testid=item-row]'), 6, 'item rows')
  for (const k of ORG_KEYS) eq(await count(`[data-testid=item-row][data-key=${k}]`), 0, `org-level ${k}`)
  includes(await t('[data-testid=rr-title]'), 'One more thing from our banking partner', 'rr title')
  includes(await page.locator('[data-testid=reviewer-note]').allInnerTexts().then((a) => a.join(' ')), 'paper original from 2004', 'stuck note')
})

const SEEDED_ACCEPTED = Number(process.env.SEED_ACCEPTED ?? 37)
await check('3 re-request: new parcel, non-admin, accepted untouched, timeline origin', async () => {
  await reload()
  await openCase('Northwind Digital Ltd')
  const before = await count('[data-testid=item-row][data-status=accepted]')
  eq(before, SEEDED_ACCEPTED, 'seeded accepted')
  const parcelsBefore = await count('[data-testid=parcel-card]')
  await page.click('[data-testid=raise-rr]')
  await page.getByLabel('Bank partner').check()
  await page.fill('[data-testid=rr-reason]', 'Demo re-request')
  await page.click('[data-testid=rr-add-row]')
  await page.selectOption('[data-testid=rr-requirement]', 'entity_good_standing')
  await page.selectOption('[data-testid=rr-subject]', 'legalEntity:ent_nw_br')
  await page.selectOption('[data-testid=rr-recipient]', 'per_nw_ubo_br')
  await page.click('[data-testid=rr-submit]')
  eq(await count('[data-testid=parcel-card]'), parcelsBefore + 1, 'parcel cards')
  eq(await count('[data-testid=rr-badge]'), 2, 're-request badges')
  eq(await count('[data-testid=item-row][data-status=accepted]'), before, 'accepted unchanged')
  const top = await page.locator('[data-testid=timeline-entry]').allInnerTexts()
  const rr = top.slice(0, 2).find((x) => x.includes('Bank partner') && x.includes('Demo re-request'))
  if (!rr) throw new Error(`timeline top entries: ${JSON.stringify(top.slice(0, 2))}`)
  const card = await page.locator('[data-testid=parcel-card]').last().innerText()
  includes(card, 'Rafael Costa', 'recipient is non-admin')
})

await check('4 console blocked-on names and nudge', async () => {
  await reload()
  const rows = await page.locator('[data-testid=blocked-on]').allInnerTexts()
  includes(rows[0], 'Mei Lin Tan', 'Northwind blocked')
  includes(rows[0], 'Rafael Costa', 'Northwind blocked')
  includes(rows[1], 'Jordan Reyes', 'Acme blocked')
  await page.click('[data-testid=nudge-per_nw_ubo_br]')
  await openCase('Northwind Digital Ltd')
  includes(await t('[data-testid=timeline-entry]'), 'Nudged Rafael Costa', 'nudge logged')
})

await check('5 pre-filled values confirmable; finish Acme; metric flips', async () => {
  await reload()
  await viewAs('per_acme_jordan')
  await page.waitForSelector('[data-testid=parcel-primary]')
  const rows = page.locator('[data-testid=item-row][data-status=prefilled_unconfirmed]')
  eq(await rows.count(), 5, 'prefilled rows')
  eq(await rows.locator('[data-testid=prefilled-value]').count(), 5, 'values shown')
  eq(await rows.locator('[data-testid=confirm-item]').count(), 5, 'confirm buttons')
  eq(await rows.locator('input[type=text]').count(), 0, 'no empty inputs')
  await page.click('[data-testid=confirm-all-submit]')
  eq(await t('[data-testid=parcel-chip]'), 'Submitted', 'parcel chip')
  await viewAs('')
  await openCase('Acme Fabrication LLC')
  includes(await t('[data-testid=accept-all]'), '(6)', 'accept all count')
  await page.click('[data-testid=accept-all]')
  await page.click('[data-testid=approve]')
  await page.click('[data-testid=fund]')
  eq(await t('[data-testid=case-status]'), 'Funded', 'case status')
  await page.click('[data-testid=nav-console]')
  includes(await t('[data-testid=metric-median]'), '3', 'median days')
})

await check('6 reload resets to seed', async () => {
  await reload()
  eq(await count('[data-testid=case-row]'), 2, 'case rows')
  eq((await page.locator('[data-testid=case-status]').allInnerTexts())[1], 'Collecting', 'Acme status')
})

if (process.env.SMOKE_V2 !== '0') {
  const { v2 } = await import('./smoke-v2.mjs')
  await v2({ page, check, eq, includes, t, count, reload, viewAs, openCase })
}

await check('no console errors during the run', async () => {
  if (errors.length) throw new Error(errors.join(' | '))
})

await browser.close()
server.kill()
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed')
process.exit(failed ? 1 : 0)
