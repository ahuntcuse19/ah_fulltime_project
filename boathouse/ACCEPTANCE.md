# ACCEPTANCE.md: Section 13 results

Ten tests from SPEC.md Section 13. A test is marked **observed** only when it ran and passed in front of the builder; anything else is marked as what it is. The suite is `npm run test:acceptance` (Vitest, `tests/acceptance/`). It reads the database named by `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` and, when `ACCEPTANCE_BASE_URL` is set, also exercises the deployed route handlers.

## Where the observations were made

The build session that produced this repository could not open connections to `*.supabase.co` or `*.vercel.app` (its network policy was fixed at session start). Two stands were used instead:

- **Local stand**: Postgres 16 plus PostgREST, the migration in `supabase/migrations/0001_schema.sql` applied unchanged, the database loaded by `npm run seed`, the app built with `next build` and served with `next start`. Everything below marked "observed locally" ran there on 2026-09-15.
- **Production database** (Supabase project `pwdqxmmeqdbvkurnefkr`): loaded through the Supabase SQL connector from `supabase/seed-sql/` (the same rows `npm run seed` writes, rendered as SQL by `npm run seed:sql`). Row counts (3 / 25 / 57 / 665 / 3101 / 8 / 6) and the allocation fingerprint equal the local seed's. The SQL conditions for tests 2 to 7 were re-run there and hold.

Not yet observed by the builder: `npm run test:acceptance` pointed at the production database from a networked machine, and the deployed Vercel URL. The commands are at the end; the two lines marked "pending" flip to observed once someone runs them.

## Results

| # | Test (Section 13) | Result | How it was observed |
|---|---|---|---|
| 1 | Seeding twice gives identical row counts and checksums | **observed locally** | `npm run seed` twice with identical per-table sha256 on all nine tables; suite test 1 seeds twice inside the test and compares. |
| 2 | Tuesday AM1: college holds the standing 2016 house 8+ plus its two owned competitive 8+ (24 seats, allocated); club has no AM1 | **observed locally**, on 2026-04-21 | Suite test 2. The spec's date 2026-04-07 cannot hold because the college 2019 8+ is off water 2026-04-02 to 2026-04-16 (event 2, required by test 5); that week the college borrows Club Fifteen. PLAN.md decision B moves the date to the first Tuesday after the repair with the expected shells unchanged. Also checked by SQL on the production database. |
| 3 | 2026-04-08 PM1: community receives the 2007 8+ then the 2009 4+, allocated, never a non-novice shell | **observed locally** | Suite test 3, plus a check that every community allocation in the season is on a novice shell. Also checked by SQL on the production database. |
| 4 | 2026-07-15 PM1: the 2007 8+ is allocated to nobody; community uses 4+, 2x, 1x novice shells | **observed locally** | Suite test 4 (status partially_allocated, 9 of 12 seats, one "no oars" warning since two scull sets serve three scull shells). Also checked by SQL on the production database. |
| 5 | 2026-04-02 to 2026-04-16: college 2019 8+ has zero allocations and 15 days off water | **observed locally** | Suite test 5. Days off water count reported_on and resolved_on inclusively (15 days), which fixes the 4.6 status window as inclusive on both ends. Also checked by SQL on the production database. |
| 6 | Fleet view flags exactly the shells with age >= 10 and repair ratio >= 15.0; the 2007 8+ is not flagged | **observed locally**, flag set is empty | Suite test 6. With the seed no shell reaches 15.0 (highest is Riverside Blue at 4.3%), so the flagged set is empty and the 2007 8+ is not in it. The rule itself is unit-tested with constructed inputs in `src/engine/metrics.test.ts`. |
| 7 | Utilization by organization sums to the count of approved allocations | **observed locally** | Suite test 7: 952 + 672 + 784 = 2408 approved allocations. Same figures recomputed by SQL in `docs/report-checks.sql` and on the production database. |
| 8 | The 7.1 intake example yields AM1, 16 seats, competitive, confidence high | **pending**: not observed | `tests/acceptance/intake.test.ts` runs the live model through `POST /api/intake/parse` when `ACCEPTANCE_BASE_URL` is set, or through `parseIntake` when `ANTHROPIC_API_KEY` is set, and skips without either. The build session held no Anthropic key, so the only run so far hit the 7.3 fallback ("Could not parse, fill in manually.") as designed. The prompt rules, contract validation and fallback paths are unit-tested with an injected model (`src/llm/*.test.ts`, 14 tests). Note: saving that example creates a duplicate of the seeded college Thursday AM1 session, so the save step returns the 7.3 duplicate error by design; the test checks the parse only. |
| 9 | An override without a reason is rejected | **observed locally** | Suite test 9 (`overrideAllocation` rejects "" and whitespace with status 400 before touching the database; the row is unchanged) and `POST /api/allocations/[id]/override` returning 400 over HTTP. |
| 10 | Re-generating an approved week changes nothing | **observed locally** | Suite test 10 (allocation rows identical before and after generate on the approved week of 2026-09-07) and `POST /api/weeks/2026-09-07/generate` over HTTP reporting kept 99, deleted 0, inserted 0. |

Suite totals on the local stand (2026-09-15): 9 passed, 1 failed (test 8, no key). Unit suite `npm run test`: 52 passed.

## To finish the observation

From a machine that can reach Supabase and Vercel, in `boathouse/` with `.env.local` holding the four variables from `.env.example`:

```bash
npm install
npm run seed                      # twice; compare the printed checksums
ACCEPTANCE_BASE_URL=https://<vercel-url> npm run test:acceptance
npx tsx scripts/eval-intake.ts    # eight phrasings against the live model
SCREENSHOT_BASE_URL=https://<vercel-url> npm run screenshots
```

Test 8 also needs the next Thursday (America/New_York) to fall inside 2026-03-02 to 2026-11-01, and `ANTHROPIC_API_KEY` set in Vercel.
