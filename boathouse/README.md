# Boathouse Allocation Engine

Prototype for the Bond Sports PM work sample: a shared boathouse allocates shells and oar sets to three organizations every week, deterministically, from standing claims and priority tiers, then reports utilization, fleet health and cost-share inputs. Built to `SPEC.md` v1.0 with the amendments and resolutions recorded in `PLAN.md`; results in `ACCEPTANCE.md`.

## Stack

Next.js 15 (App Router, TypeScript strict, Tailwind), Supabase Postgres through the Supabase JS client (no ORM, migrations in `supabase/migrations/`), Vitest, Anthropic Messages API (`claude-haiku-4-5-20251001`, server-side only), Vercel.

## Run it

```bash
cp .env.example .env.local   # fill in the four values
npm install
npm run seed                 # truncate, load Section 10, generate every week, approve through 2026-09-13, print checksums
npm run dev                  # http://localhost:3000
```

Apply `supabase/migrations/0001_schema.sql` to the project once before the first seed (Supabase SQL editor or CLI). The seed is deterministic: ids are uuid v5 from natural keys, so two runs print identical checksums.

| Script | What it does |
|---|---|
| `npm run test` | Engine and LLM unit tests (pure functions, injected model) |
| `npm run test:acceptance` | Section 13 tests against the seeded database; set `ACCEPTANCE_BASE_URL` to also hit the deployed routes |
| `npm run seed` | Reset and reload the database; `-- --checksum` only prints checksums |
| `npm run seed:sql` | Render the seed as SQL files (used to load a database the builder could not reach directly) |
| `npm run screenshots` | Playwright captures of every screen into `docs/screens/`, fails on console errors |
| `npx tsx scripts/eval-intake.ts` | Eight intake phrasings against the live model |

Environment variables (set in Vercel and in `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`. The server prefers the service role key and falls back to the anon key (row level security is off; there is no auth in scope). The Anthropic key is only ever read on the server.

## Layout

- `src/engine/` pure allocation engine: types, dates, status derivation, eligibility (Section 5), `allocateWeek` (6.2 and 6.5), metrics (Section 8). No I/O.
- `src/lib/` database access, week generation and approval, override, damage events, sessions, report models.
- `src/llm/` intake parse (Section 7) and donor paragraph (9.2): prompts, validation, fallbacks.
- `src/app/` five screens (`/inventory`, `/inventory/[id]`, `/week`, `/intake`, `/reports`, plus `/parts`) and the route handlers under `src/app/api/`.
- `scripts/` seed data, seed runner, SQL renderer, screenshots, intake eval.
- `tests/acceptance/` Section 13.
- `docs/screens/` screenshots; `docs/report-checks.sql` the SQL used to verify the reports by hand.

## How the week works

Generate reads every non-cancelled session in the Monday to Sunday week, keeps approved and manual rows as pre-allocations, recomputes the rest with `allocateWeek`, and writes statuses. Approve marks the week's rows approved; reports count approved rows only. Override replaces one asset on one row after the Section 5 checks, records the reason and the previous asset, and marks the row manual so a later generate keeps it. Status as of a date follows 4.6 with the off-water window inclusive of both ends.

## Deviations and decisions

All recorded in `PLAN.md`: 19 shells rather than 18 (A1 forces a seventh 8+), acceptance test 2 on 2026-04-21, `asset.retired_on` (A9), seed values the spec leaves open, and the minor resolutions list. Nothing else departs from the spec.
