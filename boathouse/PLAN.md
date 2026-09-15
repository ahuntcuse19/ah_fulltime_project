# PLAN.md: Boathouse Allocation Engine

Phase 0 output. Built from `SPEC.md` v1.0 plus amendments A1 to A8 in the build prompt, plus A9 and the resolutions below agreed on 2026-09-14. Where SPEC.md and the build prompt conflict, the prompt wins. Where both are silent, the resolution is listed here and nowhere else.

## Amendments in force

- A1 to A8: as stated in the build prompt.
- A9 (new, agreed): `asset.retired_on date null`. Set to today (America/New_York) when the retire toggle turns on, cleared when it turns off. Availability for 8.1 counts days strictly before `retired_on`.

## Decisions agreed on 2026-09-14

| # | Question | Decision |
|---|---|---|
| A | A1 yields four intermediate 8+ (house 2016, 2013, 2011 plus club 2015), seven 8+ and 19 shells, but 10.2 says six 8+ and 18 shells. | 19 shells, seven 8+. The "18 shells" and "12 of the 18" wording in 10.2 is superseded. Donors on 12 of 19. |
| B | Acceptance test 2 on 2026-04-07 cannot hold: the college 2019 8+ is off water 04-02 to 04-16 (event 2, test 5), so the college borrows Club Fifteen instead. | Test 2 runs on 2026-04-21, the first Tuesday after the repair, with the expected shells unchanged. ACCEPTANCE.md records the reason. |
| C | Seed values the spec leaves open. | Oar set replacement cost: sweep $3,200, scull $1,600; purchase cost by the 10.2 formula. Part unit costs: oarlock $28, seat wheels $9, foot stretcher shoes $95, rigger bolts $2, skeg $140, hull repair kit $180. Extra donor shells: the 2012 4+ and the 2010 2x. The tie at 2013 for "six newest house-owned shells" is broken by class order as listed in 10.2, so the 2013 8+ gets the donor and the 2013 1x does not. |
| D | 8.1 refers to a retirement date that no column holds. | A9 above. |

## Resolutions of minor ambiguities (not covered by A1 to A9)

1. Re-run input. 6.1 says sessions with status `requested`, but generated sessions leave that status. Input is every non-cancelled session in the week. Approved rows and manual rows are kept and treated as pre-allocations (they reduce need and occupy the asset at that date and slot). All other rows for the week are deleted and recomputed. Session status is recomputed from kept plus new seats.
2. Generate on a fully approved week runs, keeps every row, changes nothing (test 10). The lock badge shows when the week has at least one allocation and every allocation is approved.
3. A standing claim whose seats exceed remaining need is still allocated; need clamps at zero.
4. Oar set order at a (date, slot): shells in allocation order (standing rows first, then priority sessions in sorted order, then each session's shells in sorted order); oar sets by year_built descending then name ascending. In the seed no two orgs ever contend for oar sets in one slot, so this only decides which shell shows "no oars".
5. Days off water (8.3) count season dates from season start through min(today, season end), the A4 cutoff, because event 6 is unresolved.
6. Fleet median excludes shells whose utilization is "n/a". An even count takes the mean of the middle two.
7. Repair spend "in the season" means fixed events whose resolved_on lies inside the season.
8. The seed creates no `damage_event_part` rows; the 10.6 quantities are the final state. Parts decrement applies to events fixed through the UI.
9. Seeded `session.created_at` is 2026-03-02T00:00:00 America/New_York plus 0, 1, 2 minutes for college, club, community.
10. Override applies to shells and oar sets (an oar set may only be replaced by an oar set of the same class), is allowed on approved rows, and does not touch the paired oar set row. The replacement must pass Section 5 including rule 5.
11. The 7.1 example resolves to a college Thursday AM1 session, which the seed already holds for every week, so saving it hits the 7.3 duplicate error by design. Test 8 checks the parse result only.
12. Percentages are rounded half up on decimal strings, not with toFixed.
13. Stored `asset.status` follows 4.6 (event status only). Eligibility (Section 5 item 1) and metrics (8.1) use the derived status as of a date: an event is active on date D when reported_on <= D and (resolved_on is null or D <= resolved_on). The inclusive end is fixed by test 5's count of 15 days.
14. Intake dates outside the season are rejected on save with an inline message.
15. The app is at `/`, which redirects to `/week`. No other home page.

## Tables (9) and enums (13)

Migration `supabase/migrations/0001_schema.sql`.

| table | notes |
|---|---|
| organization | 4.1 |
| asset | 4.2 plus A9 `retired_on` |
| entitlement | 4.3; standing uniqueness per (asset, slot, weekday) enforced in the seed |
| session | 4.4 plus A6 `program`; unique (org_id, date, slot) |
| allocation | 4.5; (asset, date, slot) uniqueness enforced by the engine and route handlers |
| damage_event | 4.6 |
| part | 4.7 |
| damage_event_part | 4.8 |
| boat_report_note | A3 |

Enums: org_type, skill_tier, asset_class, asset_status, entitlement_kind, slot, session_source, session_status, allocation_basis, component, severity, damage_status, program_type.

RLS is disabled on every table (authentication is out of scope). A `truncate_all()` SQL function truncates in dependency order for the seed.

## Engine functions, `src/engine/`

| file | functions |
|---|---|
| types.ts | Row types mirroring Section 4 |
| dates.ts | SEASON_START, SEASON_END, weekMondays, isoWeekday, addDays, todayNY, thisWeekMonday |
| status.ts | isEventActiveOn, deriveStatusAsOf |
| eligibility.ts | skillRank, hasEntitlement, isShellEligible, isOarSetEligible, oarClassFor |
| allocate.ts | sortEligibleShells, sortOarSets, allocateSlot, allocateWeek |
| metrics.ts | availableAssetDays, utilization, fleetMedian, repairSpend, repairRatio, assetAge, daysOffWater, isReplacementCandidate, utilizationByOrg, programSplit, costShare, sessionOutsBySlot, roundHalfUp, formatPct, formatDollars |

All pure. Plain objects in, plain objects out.

## Screens

| route | screen |
|---|---|
| /inventory | Inventory table with class, org, status filters |
| /inventory/[id] | Boat report (8.3) for shells, simple detail for oar sets; damage event create and edit; retire toggle |
| /week | Week grid (11.2), Generate, Approve, override |
| /intake | Intake agent (7) |
| /reports | Tabs: Utilization by organization with Program split, Fleet view, Cost-share |
| /parts | Parts table with flagged rows |

## Route handlers

- POST /api/weeks/[monday]/generate
- POST /api/weeks/[monday]/approve
- POST /api/allocations/[id]/override
- POST /api/intake/parse
- POST /api/sessions
- POST /api/damage-events, PATCH /api/damage-events/[id]
- POST /api/assets/[id]/retire
- POST /api/assets/[id]/donor-paragraph, PUT /api/assets/[id]/note

## Pre-computed expectations from the seed

- Tuesday AM1 in a normal week: college gets The Ashford (standing), 2022 8+, 2019 8+ = 24, allocated.
- Tuesday 2026-04-07 AM1: college gets The Ashford, 2022 8+, Club Fifteen = 24, allocated.
- Wednesday 2026-04-08 PM1: community gets 2007 8+ then 2009 4+ = 12, allocated.
- PM1 from 2026-07-14: community gets 2009 4+, 2010 2x, 2006 2x, 2008 1x = 9 of 12, partially_allocated, one "no oars" warning (two scull sets, three scull shells).
- Fleet view: no shell reaches repair ratio 15.0, so the replacement flag is empty with the seed.
- Cost-share liable sums: club $1,520.00, college $2,800.00, community $650.00.

## Phases

1. Engine and Vitest suite.
2. Migration and seed; seed twice and diff checksums.
3. Generate, approve, override route handlers; seed generates all weeks and approves through 2026-09-13.
4. Five screens plus nav; screenshots to docs/screens/.
5. Intake and donor paragraph via Anthropic `claude-haiku-4-5-20251001`.
6. Reports.
7. Deploy, acceptance run against production, ACCEPTANCE.md, README.md.

## LLM design (Phase 5)

- Everything model-related lives in `src/llm/`; the engine never imports it and no client component does. The key is read by the SDK from `ANTHROPIC_API_KEY` on the server only.
- Intake: one Messages call, temperature 0, max 300 output tokens, model `claude-haiku-4-5-20251001`. The system prompt states the five 7.2 rules verbatim, the output contract, a seven day date table (today first, weekday names, so "Thursday" is a lookup and not arithmetic) and a seats-per-class table. The reply is parsed as plain JSON and validated with zod against the 7.2 contract; confidence is recomputed in code from the nulls and a malformed date becomes null. Any failure (no key, network, truncation, invalid JSON, contract violation) returns the 7.3 message "Could not parse, fill in manually." and nothing else happens. The requesting organization never reaches the model.
- Donor paragraph: temperature 0.3, max 400 tokens, the 9.2 instruction verbatim, the addressee computed in code (donor_name, else "the boathouse community"). Post-checks in code: em dashes replaced by commas, and one regeneration when the draft is outside 90 to 130 words; the draft is then returned for editing. Saving goes to `boat_report_note` (A3) and rejects text containing an em dash.
- Each call logs one JSON line (feature, model, temperature, tokens, latency, stop reason, error) and never the key, the org or the request text.
- `scripts/eval-intake.ts` runs eight phrasings against the live model and prints a pass table; acceptance test 8 runs live through the deployed route when `ACCEPTANCE_BASE_URL` is set, otherwise through `parseIntake` when `ANTHROPIC_API_KEY` is set, and is skipped (never passed) without either.

## Status

- Phases 1 to 5 committed on `claude/gallant-cray-s8ex8y`. Unit suite: 52 tests. Acceptance tests 1 to 7, 9 and 10 observed locally against a Postgres plus PostgREST stack seeded by `npm run seed`; test 8 needs an Anthropic key, which this build session does not hold, so it is recorded as not observed until it runs on Vercel.
- Next: Phase 6 report verification by hand against the database, then Phase 7 (ACCEPTANCE.md, README.md, Vercel deploy, acceptance run against production).
