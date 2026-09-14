# Boathouse Allocation Engine: Build Spec v1.0

Work sample for the Bond Sports Product Manager role. Prototype only, synthetic data, single user, no authentication.

Deterministic rule: every calculation in this spec must produce the same number from the same seed data regardless of who builds it. Where the spec leaves a choice open, it is listed in Section 12 (Open Decisions), not left implicit.

---

## 1. Purpose and scope

One facility (a boathouse) hosts several tenant organizations that share equipment. The product does four things:

1. Holds the inventory of assets, who owns each, and which organizations are entitled to use them.
2. Allocates assets to practice sessions each week under fixed rules, with a manager approving the result.
3. Tracks damage and parts, and removes unavailable assets from allocation automatically.
4. Produces reports: utilization by organization, a per-boat report for fundraising, a fleet replacement view, and a cost-share summary.

### In scope
- One facility, three tenant organizations, one season.
- Rowing shells and oar sets as assets.
- A fixed weekly practice grid.
- Web app, desktop layout only.
- Seed data loaded by script.

### Out of scope (do not build)
- Payments, invoicing, memberships, registration.
- Donor records beyond a donor name string on an asset.
- Email or message sending of any kind.
- Maintenance work orders, vendor management, technician assignment.
- Regatta logistics, lineups, athlete rosters.
- Multi-facility, mobile layout, authentication, roles.

---

## 2. Stack and hosting

- Next.js (App Router), TypeScript, Tailwind.
- Supabase Postgres for storage. Use the schema in Section 4 exactly; table and column names are normative.
- Hosted on Vercel at a public URL.
- One seed script (`npm run seed`) that truncates all tables and loads Section 10 data. Running it twice yields identical state.
- LLM calls: exactly two features use an LLM (Sections 7 and 9.2). Model and vendor are an open decision (Section 12); the interface contract is fixed here.

---

## 3. Time model

- Timezone: America/New_York for all display and calculation.
- Season: Monday 2026-03-02 through Sunday 2026-11-01 inclusive (35 weeks). Weeks start Monday.
- Practice grid: every day of the week has exactly three slots.
  - `AM1`: 05:30 to 07:00
  - `AM2`: 07:00 to 08:30
  - `PM1`: 16:30 to 18:00
- A `session` is one (date, slot, organization) triple. Allocation assigns assets to sessions.
- "This week" in the UI means the Monday to Sunday week containing today's date, clamped to the season. If today is outside the season, "this week" is the first week of the season.
- An asset-day is one (asset, calendar date) pair. Availability is computed per asset-day (Section 8.3).

---

## 4. Data model

All ids are UUIDs. All timestamps are `timestamptz`. Enums are Postgres enums with exactly the values listed.

### 4.1 `organization`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | |
| type | enum `org_type` | `club`, `college`, `high_school`, `community_program` |
| priority_tier | int | 1 is highest. Values 1, 2, 3. Set by the facility, not derived. |
| default_skill_tier | enum `skill_tier` | `novice`, `intermediate`, `competitive` |
| annual_fee_cents | int | the fee actually paid this season, seeded |

### 4.2 `asset`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | e.g. "The Lockwood" |
| asset_class | enum `asset_class` | `shell_1x`, `shell_2x`, `shell_2-`, `shell_4x`, `shell_4+`, `shell_8+`, `oar_set_sweep`, `oar_set_scull` |
| seats | int | derived from class: 1, 2, 2, 4, 4, 8; oar sets: 8 (sweep) or 2 (scull, one rower's pair) |
| quality_tier | enum `skill_tier` | reuses `skill_tier`: `novice`, `intermediate`, `competitive`. The minimum rower skill tier that may use it. |
| owner_org_id | uuid fk organization, nullable | null means house-owned |
| shared | boolean | true means orgs other than the owner may be allocated it. House-owned assets must be `shared = true`. |
| year_built | int | |
| purchase_cost_cents | int | |
| replacement_cost_cents | int | current replacement price, seeded |
| donor_name | text nullable | |
| status | enum `asset_status` | `on_water`, `caution`, `off_water`, `retired`. Stored value is the current status; history lives in `damage_event`. |
| rack_location | text | e.g. "Bay 2, rack 3" |

### 4.3 `entitlement`
Which organizations may use which assets, and any standing claims.
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| org_id | uuid fk | |
| asset_id | uuid fk | |
| kind | enum `entitlement_kind` | `standing`, `eligible` |
| slot | enum `slot` nullable | required when kind = standing; the slot the org holds this asset every day |
| days | int[] nullable | required when kind = standing; ISO weekday numbers 1 (Mon) to 7 (Sun) |

Rules:
- An org may be allocated an asset only if (a) it owns the asset, or (b) the asset is `shared = true` and an `eligible` or `standing` entitlement row exists for (org, asset).
- A `standing` row means: on the listed days in the listed slot, the asset is allocated to that org before any request is considered, provided the asset is available and the org has a session that day and slot.
- At most one `standing` row per (asset, slot, weekday). The seed script must enforce this; the UI does not allow creating overlaps.

### 4.4 `session`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| org_id | uuid fk | |
| date | date | |
| slot | enum `slot` | `AM1`, `AM2`, `PM1` |
| skill_tier | enum `skill_tier` | defaults to org.default_skill_tier at creation |
| requested_seats | int | total rower seats requested, sum over boats wanted |
| source | enum `session_source` | `standing`, `form`, `intake` |
| raw_request_text | text nullable | populated when source = intake |
| status | enum `session_status` | `requested`, `allocated`, `partially_allocated`, `unfilled`, `cancelled` |
| created_at | timestamptz | used as a tiebreak |

Unique constraint on (org_id, date, slot): one session per org per slot per day.

### 4.5 `allocation`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| session_id | uuid fk | |
| asset_id | uuid fk | |
| basis | enum `allocation_basis` | `standing`, `priority`, `manual` |
| approved | boolean | false until manager approves the week |
| overridden_from_asset_id | uuid fk asset nullable | set when a manager swaps the asset |
| override_reason | text nullable | required when overridden_from_asset_id is set |

Unique constraint on (asset_id, session date, session slot) enforced at application level: one asset cannot be allocated to two sessions in the same date and slot.

### 4.6 `damage_event`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| asset_id | uuid fk | |
| reported_on | date | |
| reported_by_org_id | uuid fk nullable | |
| liable_org_id | uuid fk nullable | who pays; null means house absorbs |
| component | enum `component` | `hull`, `rigger`, `oarlock`, `seat_slide`, `foot_stretcher`, `fin_skeg`, `oar`, `other` |
| description | text | |
| severity | enum `severity` | `cosmetic`, `caution`, `off_water` |
| status | enum `damage_status` | `open`, `parts_ordered`, `fixed` |
| resolved_on | date nullable | required when status = fixed |
| cost_cents | int | 0 until known |

Status derivation rule for `asset.status`, recomputed whenever a damage_event is inserted or updated:
- If any open or parts_ordered event has severity `off_water` → `off_water`.
- Else if any open or parts_ordered event has severity `caution` → `caution`.
- Else `on_water`, unless the asset is manually `retired`.
- `retired` is set only by a manual toggle and is never changed by damage events.

### 4.7 `part`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | e.g. "Oarlock, port, Concept2" |
| component | enum `component` | |
| qty_in_stock | int | |
| qty_on_order | int | |
| unit_cost_cents | int | |
| reorder_threshold | int | UI flags the part when qty_in_stock < reorder_threshold |

### 4.8 `damage_event_part` (join)
| column | type |
|---|---|
| damage_event_id | uuid fk |
| part_id | uuid fk |
| qty_used | int |

When a damage_event moves to `fixed`, the seed and UI decrement `qty_in_stock` by `qty_used` for each linked part.

---

## 5. Eligibility rules

An asset A is eligible for a session S if and only if all of the following are true:

1. `A.status` is `on_water` or `caution` on S.date. (`caution` assets are eligible but shown with a warning badge.)
2. A is a shell (not an oar set) for seat matching; oar sets are allocated by Section 6.5.
3. Ownership or entitlement: `A.owner_org_id = S.org_id`, or (`A.shared = true` and an entitlement row exists for (S.org_id, A)).
4. Skill: rank(`S.skill_tier`) >= rank(`A.quality_tier`), with ranks novice = 1, intermediate = 2, competitive = 3.
5. A is not already allocated to another session with the same date and slot.

No other rule affects eligibility. Capacity is handled by the allocation loop, not by eligibility.

---

## 6. Allocation algorithm

Runs once per week when the manager clicks "Generate week", and can be re-run; re-running discards unapproved allocations for that week and recomputes. Approved allocations are never changed by re-running.

### 6.1 Inputs
All sessions in the target week with status `requested`, plus all standing entitlements whose org has a session that day and slot.

### 6.2 Order of operations
Process each (date, slot) pair in chronological order. Within one (date, slot):

**Step 1, standing claims.** For each `standing` entitlement whose (asset, slot, weekday) matches and whose org has a session at that (date, slot): if the asset is eligible per Section 5, allocate it with `basis = standing` and reduce that session's remaining seat need by `asset.seats`. Standing claims never compete with each other because the seed enforces one standing row per (asset, slot, weekday).

**Step 2, priority fill.** Build the list of sessions at this (date, slot) with remaining seat need > 0. Sort by: `organization.priority_tier` ascending, then `session.created_at` ascending. For each session in that order:
- Build the eligible asset list (Section 5), excluding assets allocated in this (date, slot).
- Sort eligible assets by: `seats` descending, then `quality_tier` rank descending, then `year_built` descending, then `name` ascending.
- Walk the sorted list. Allocate an asset if `asset.seats <= remaining seat need`. Continue until remaining seat need is 0 or the list is exhausted. `basis = priority`.

**Step 3, status.** After all sessions at this (date, slot) are processed: remaining need 0 → `allocated`; some allocation but need > 0 → `partially_allocated`; no allocation → `unfilled`.

### 6.3 Worked example (must reproduce exactly)
At (2026-04-07, AM1): Org A (tier 1, created first) needs 16 seats; Org B (tier 2) needs 8. Eligible shared assets: two 8+ (competitive, 2022 and 2015), one 4+ (intermediate, 2019). Org A skill = competitive, Org B skill = intermediate.
- Org A takes the 2022 8+ then the 2015 8+ (16 seats). Status allocated.
- Org B: 8+ shells are gone; the 4+ (4 seats) is eligible and 4 <= 8 → allocated. Remaining need 4, list exhausted. Status partially_allocated.

### 6.4 Manual override
The manager may replace one allocated asset with another eligible asset for the same session. This sets `basis = manual`, `overridden_from_asset_id`, and requires `override_reason` (non-empty). Overrides are kept on re-run.

### 6.5 Oar sets
After shells are allocated at a (date, slot), each allocated shell gets one oar set: sweep classes (`2-`, `4+`, `8+`) take an `oar_set_sweep`; scull classes (`1x`, `2x`, `4x`) take an `oar_set_scull`. Oar sets are allocated by the same eligibility rules (Section 5 items 1, 3, 5) in order of `year_built` descending, `name` ascending. If no oar set is available, the shell allocation stands and the session shows a "no oars" warning. Oar sets do not count toward seats.

### 6.6 Approval
"Approve week" sets `approved = true` on every allocation in the week. Approved weeks display a lock badge. Nothing else changes on approval.

---

## 7. Intake agent

Turns an unstructured request into a `session` row. It never allocates; it only creates a session with `status = requested`.

### 7.1 Input
A text area labelled "Paste the request" plus a dropdown for the requesting organization (required; the agent does not infer org). Example input: "hey can we get two eights thursday early, we'll have about 16, the varsity group"

### 7.2 Output contract
The LLM must return only this JSON:
```
{
  "date": "YYYY-MM-DD" | null,
  "slot": "AM1" | "AM2" | "PM1" | null,
  "requested_seats": integer | null,
  "skill_tier": "novice" | "intermediate" | "competitive" | null,
  "confidence": "high" | "low",
  "notes": string
}
```
Resolution rules the prompt must state:
- Relative dates resolve against today's date in America/New_York. "Thursday" means the next Thursday on or after today.
- "early" or "first practice" → AM1; "second" or "later morning" → AM2; "afternoon" or "evening" → PM1.
- Seats: if a boat count is given and a headcount is not, seats = boats × seats-per-class. If both are given, use the headcount. If neither, null.
- Skill tier: "varsity", "1V", "racing" → competitive; "JV", "second boat" → intermediate; "novice", "learn to row", "beginners" → novice; otherwise null.
- confidence = low if any of date, slot, or requested_seats is null.

### 7.3 Behaviour
- The parsed fields populate an editable form. Null fields are highlighted. The user must fill any null field before saving.
- Saving creates the session with `source = intake` and `raw_request_text` set. If a session already exists for (org, date, slot), show an error and do not create a duplicate.
- If the LLM call fails or returns invalid JSON, show the empty form with an inline message "Could not parse, fill in manually." Nothing else happens.

---

## 8. Reports and metrics

All metrics are computed from `allocation`, `session`, `asset`, and `damage_event`. Only approved allocations count. Unapproved allocations count nowhere.

### 8.1 Definitions
- **Session-out**: one approved allocation of one asset to one session. Each row in `allocation` with `approved = true` is exactly one session-out.
- **Available asset-day**: a calendar date within the season on which the asset's derived status (Section 4.6 rule, evaluated as of that date using `reported_on` and `resolved_on`) is `on_water` or `caution`. Retired assets have zero available asset-days from the retirement date.
- **Available sessions** for an asset = available asset-days × 3.
- **Utilization** for an asset = session-outs ÷ available sessions, shown as a percentage with one decimal. If available sessions = 0, display "n/a".
- **Fleet median utilization** = median of utilization across all non-retired shells (oar sets excluded).
- **Repair spend** for an asset = sum of `cost_cents` over damage events with status `fixed`, in the season.
- **Repair ratio** = repair spend ÷ replacement_cost_cents, percentage, one decimal.
- **Asset age** = 2026 − year_built.

### 8.2 Utilization by organization
Table, one row per org: session-outs on assets it does not own (borrowed), session-outs on assets it owns, total session-outs, share of total house session-outs (percentage), `annual_fee_cents` paid, and **fee per session-out** = annual_fee_cents ÷ total session-outs (display "n/a" if 0).

### 8.3 Boat report (one page per shell)
Sections, in this order:
1. Identity: name, class, year_built, age, donor_name (or "House purchase"), purchase cost, replacement cost, rack_location, current status.
2. Usage: session-outs, utilization %, fleet median utilization %, session-outs by org (bar chart), session-outs by slot (AM1/AM2/PM1).
3. Health: list of damage events (date, component, severity, status, cost, liable org), repair spend, repair ratio, days off water this season (count of season dates with derived status off_water).
4. Donor paragraph: generated per Section 9.2, editable, with a "Regenerate" button. Not saved unless the user clicks "Save paragraph" (stored in a `boat_report_note` table: asset_id, text, updated_at).

### 8.4 Fleet view
Table of all non-retired shells with: name, class, age, utilization %, repair ratio, status. Sortable by any column. A shell is flagged "Replacement candidate" when **both** age >= 10 **and** repair ratio >= 15.0. No other condition flags it.

### 8.5 Cost-share summary
One table: for each org, damage cost where `liable_org_id = org` (sum of cost_cents, fixed or not), plus the fee per session-out from 8.2. No formula for a "fair fee" is computed; the table presents inputs only. (See Section 12.)

### 8.6 Rounding
All currency displayed in dollars with two decimals. Percentages one decimal, half up.

---

## 9. LLM feature contracts

### 9.1 Intake parse
Defined in Section 7. Temperature 0. One call per parse. Max 300 output tokens.

### 9.2 Donor paragraph
Input: the boat report's identity, usage, and health numbers as a JSON object. Prompt instruction: "Write one paragraph of 90 to 130 words addressed to the donor named, in plain language, stating how many times the boat went out this season, which programs used it, and its condition. Do not invent race results, names, or numbers not in the input. Do not use em dashes." Output: plain text. Temperature 0.3. If donor_name is null, address it to "the boathouse community".

---

## 10. Seed data

The seed must produce exactly this. Names may be invented but counts, dates, and rules are fixed.

### 10.1 Organizations (3)
| name | type | priority_tier | default_skill_tier | annual_fee_cents |
|---|---|---|---|---|
| Harbor Rowing Club | club | 2 | intermediate | 1,800,000 |
| Riverside University Crew | college | 1 | competitive | 3,600,000 |
| Eastside Community Rowing | community_program | 3 | novice | 600,000 |

### 10.2 Assets (18 shells, 6 oar sets)
Shells:
- 6 × `shell_8+`: two competitive (2022, 2019), three intermediate (2015, 2013, 2011), one novice (2007).
- 4 × `shell_4+`: one competitive (2021), two intermediate (2016, 2012), one novice (2009).
- 4 × `shell_2x`: two intermediate (2018, 2014), two novice (2010, 2006).
- 4 × `shell_1x`: one competitive (2023), two intermediate (2017, 2013), one novice (2008).
Ownership: the college owns the two competitive 8+ and the competitive 4+ (all `shared = false`); the club owns the 2015 8+ and the 2018 2x (`shared = true`); all others house-owned (`shared = true`).
Donor names on 12 of the 18 shells; the six newest house-owned shells have donors, plus all three college shells and the club's 2015 8+, plus two more of your choice.
Costs: 8+ replacement $65,000; 4+ $35,000; 2x $18,000; 1x $12,000. Purchase cost = replacement cost × (1 − 0.03 × age), rounded to dollars.
Oar sets: 4 × `oar_set_sweep` (2021, 2018, 2015, 2010), 2 × `oar_set_scull` (2019, 2012). All house-owned, shared.

### 10.3 Entitlements
- College: `eligible` on all house-owned shells with quality_tier intermediate or competitive; `standing` on the 2015 intermediate house 8+ (which it does not own) at AM1, days [1,2,3,4,5].
- Club: `eligible` on all house-owned shells; `standing` on the 2013 intermediate 8+ at AM2, days [1,3,5].
- Community program: `eligible` on all house-owned shells with quality_tier novice or intermediate.
Note: the club's 2015 8+ is club-owned and shared; the college has an `eligible` row on it. The standing above refers to the house-owned 2015 8+. To avoid ambiguity the seed must name them distinctly (e.g. "The Ashford" house-owned, "Club Fifteen" club-owned) and the standing row must reference the house-owned one by id.

Correction for determinism: there is exactly one intermediate 8+ built in 2015 in Section 10.2, and it is club-owned. Change the house-owned intermediate 8+ years to 2016, 2013, 2011 and set the college's standing claim on the house-owned 2016 8+. This paragraph is normative over 10.2.

### 10.4 Sessions
Generate for every week of the season:
- College: AM1 Mon–Fri, skill competitive, requested_seats 24. AM2 Sat, requested_seats 16.
- Club: AM2 Mon, Wed, Fri, skill intermediate, requested_seats 16. PM1 Tue, Thu, requested_seats 8. AM1 Sat, Sun, requested_seats 12.
- Community program: PM1 Mon–Fri, skill novice, requested_seats 12. AM2 Sun, requested_seats 8.
All `source = standing`, `created_at` = season start plus 0, 1, 2 minutes for college, club, community respectively (fixes the tiebreak).

### 10.5 Damage events (8)
1. 2026-03-19, house 2011 8+, rigger, caution, fixed 2026-03-24, $420, liable club.
2. 2026-04-02, college 2019 8+, hull, off_water, fixed 2026-04-16, $2,800, liable college.
3. 2026-04-22, house 2009 4+, seat_slide, cosmetic, fixed 2026-04-23, $85, house.
4. 2026-05-11, house 2006 2x, fin_skeg, off_water, fixed 2026-05-25, $650, liable community program.
5. 2026-06-03, house 2013 1x, oarlock, caution, fixed 2026-06-05, $60, house.
6. 2026-07-14, house 2007 8+, hull, off_water, status parts_ordered (unresolved), cost $3,900 estimated, house.
7. 2026-08-20, club 2018 2x, foot_stretcher, caution, open, $0, house.
8. 2026-09-01, sweep oar set 2010, oar, off_water, fixed 2026-09-08, $1,100, liable club.
Event 6 must leave the 2007 8+ off water from 2026-07-14 through season end so the allocation view visibly changes from that week.

### 10.6 Parts (6)
Oarlock ×12 in stock, threshold 8; seat wheels ×20, threshold 10; foot stretcher shoes ×3, threshold 4 (flagged); rigger bolts ×40, threshold 20; skeg ×1 on order, 0 in stock, threshold 1 (flagged); hull repair kit ×2, threshold 1.

### 10.7 Approval state
Weeks 1 through the week containing 2026-09-13 are approved. Later weeks are generated but unapproved.

---

## 11. Screens (5)

1. **Inventory**: table of assets (all fields except ids), filter by class, org, status. Row click opens the boat report (shells) or a simple detail (oar sets). Toggle `retired`. Add or edit damage events from here.
2. **Week**: week picker, grid of (day × slot), each cell listing sessions for that slot with allocated assets, warnings (caution, no oars), status colour: allocated green, partially_allocated amber, unfilled red. Buttons: Generate week, Approve week. Per-allocation override control.
3. **Intake**: Section 7.
4. **Reports**: tabs for Utilization by organization (8.2), Fleet view (8.4), Cost-share summary (8.5).
5. **Parts**: table per Section 4.7 with flagged rows highlighted.

No dashboard or home page beyond a nav to these five.

---

## 12. Open decisions (flagged, not decided here)

1. LLM vendor and model for Sections 7 and 9.2.
2. Whether to name real boathouses or organizations anywhere in the UI or write-up. Spec assumes invented names.
3. A "fair fee" formula for the cost-share summary (by session-outs, by seats, by hours). Deliberately not computed; discovery interviews should decide.
4. Whether the intake agent should be exposed to tenant orgs or only to the manager. Spec assumes manager only.
5. Dollar figures for boats are placeholders in the plausible range; confirm before showing to anyone in rowing.

---

## 13. Acceptance tests

Run after seeding. All must pass.

1. Seed twice; row counts and all computed reports are identical.
2. On 2026-04-07 AM1 (a Tuesday), the college holds the standing 2016 house 8+ plus its two owned competitive 8+ = 24 seats, status allocated. The club has no AM1 session that day.
3. On 2026-04-08 PM1 (a Wednesday), the community program (12 seats, novice) receives: the novice 2007 8+ (8 seats), then the novice 2009 4+ (4 seats), status allocated. It never receives an intermediate or competitive shell.
4. On 2026-07-15 PM1 (the day after event 6), the 2007 8+ is not allocated to anyone; the community program is partially_allocated or allocated using 4+, 2x and 1x novice shells only.
5. Between 2026-04-02 and 2026-04-16 inclusive, the college 2019 8+ has zero allocations and 15 days off water counted in its boat report.
6. Fleet view flags exactly the shells with age >= 10 and repair ratio >= 15.0, and no others. With the seed, the 2007 8+ is flagged only if event 6's estimated cost counts; per 8.1 repair spend counts fixed events only, so it is not flagged. This must hold.
7. Utilization by organization sums session-outs to the total count of approved allocations on shells and oar sets combined.
8. The intake example in 7.1, run on a date where the next Thursday is in season, yields slot AM1, requested_seats 16, skill_tier competitive, confidence high.
9. An override without a reason is rejected.
10. Re-generating an approved week changes nothing.
