// Renders the Section 10 seed as SQL so it can be applied through a SQL connector
// when the seed script cannot reach the database directly (npm run seed:sql).
// Produces the same rows and the same uuid v5 ids as scripts/seed.ts: ids are
// computed in Postgres with uuid_generate_v5 over the same namespace and natural keys.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deriveStoredStatus } from "@/engine/status";
import { SEASON_END, SEASON_START } from "@/engine/dates";
import { ID_NAMESPACE, ids } from "@/lib/ids";
import { assets, damageEvents, entitlements, organizations, parts, sessions, LAST_APPROVED_MONDAY } from "./seed-data";
import { simulateSeed } from "./simulate-seed";

const q = (s: string | null): string => (s === null ? "NULL" : `'${s.replace(/'/g, "''")}'`);
const NS = `'${ID_NAMESPACE}'::uuid`;
const v5 = (expr: string) => `uuid_generate_v5(${NS}, ${expr})`;

const orgByIdName = new Map(organizations.map((o) => [o.id, o.name]));
const assetByIdName = new Map(assets.map((a) => [a.id, a.name]));
const sessionById = new Map(sessions.map((s) => [s.id, s]));

function orgIdSql(orgId: string | null): string {
  if (orgId === null) return "NULL";
  return v5(q(`organization:${orgByIdName.get(orgId)!}`));
}
function assetIdSql(assetId: string): string {
  return v5(q(`asset:${assetByIdName.get(assetId)!}`));
}

function render(): string[] {
  const stmts: string[] = [];
  const sim = simulateSeed();

  stmts.push(`create extension if not exists "uuid-ossp";\nselect truncate_all();`);

  // organizations
  stmts.push(
    `insert into organization (id, name, type, priority_tier, default_skill_tier, annual_fee_cents) values\n` +
      organizations
        .map(
          (o) =>
            `(${v5(q(`organization:${o.name}`))}, ${q(o.name)}, ${q(o.type)}, ${o.priority_tier}, ${q(o.default_skill_tier)}, ${o.annual_fee_cents})`,
        )
        .join(",\n") +
      ";",
  );

  // assets with stored status per 4.6
  stmts.push(
    `insert into asset (id, name, asset_class, seats, quality_tier, owner_org_id, shared, year_built, purchase_cost_cents, replacement_cost_cents, donor_name, status, rack_location, retired_on) values\n` +
      assets
        .map((a) => {
          const status = deriveStoredStatus(a, damageEvents);
          return `(${v5(q(`asset:${a.name}`))}, ${q(a.name)}, ${q(a.asset_class)}, ${a.seats}, ${q(a.quality_tier)}, ${orgIdSql(a.owner_org_id)}, ${a.shared}, ${a.year_built}, ${a.purchase_cost_cents}, ${a.replacement_cost_cents}, ${q(a.donor_name)}, ${q(status)}, ${q(a.rack_location)}, NULL)`;
        })
        .join(",\n") +
      ";",
  );

  // entitlements
  stmts.push(
    `insert into entitlement (id, org_id, asset_id, kind, slot, days)\nselect ${v5(`'entitlement:' || o.id || '|' || a.id || '|' || v.kind || '|' || coalesce(v.slot, '')`)}, o.id, a.id, v.kind::entitlement_kind, v.slot::slot, v.days\nfrom (values\n` +
      entitlements
        .map(
          (e) =>
            `(${q(orgByIdName.get(e.org_id)!)}, ${q(assetByIdName.get(e.asset_id)!)}, ${q(e.kind)}, ${q(e.slot)}, ${e.days ? `'{${e.days.join(",")}}'::int[]` : "NULL::int[]"})`,
        )
        .join(",\n") +
      `\n) as v(org_name, asset_name, kind, slot, days)\njoin organization o on o.name = v.org_name\njoin asset a on a.name = v.asset_name;`,
  );

  // sessions: generated from the 10.4 rules, status filled in afterwards
  stmts.push(`insert into session (id, org_id, date, slot, skill_tier, requested_seats, source, raw_request_text, status, created_at, program)
select ${v5(`'session:' || o.id || '|' || d.date::text || '|' || r.slot`)}, o.id, d.date, r.slot::slot, r.skill::skill_tier, r.seats, 'standing', NULL, 'requested',
  '2026-03-02T05:00:00Z'::timestamptz + (r.offset_minutes || ' minutes')::interval,
  (case when r.program = 'by_weekday' then (case when extract(isodow from d.date) in (2, 4) then 'womens' else 'mens' end) else r.program end)::program_type
from generate_series('${SEASON_START}'::date, '${SEASON_END}'::date, '1 day') as d(date)
join (values
  ('Riverside University Crew', 'AM1', '{1,2,3,4,5}'::int[], 'competitive', 24, 'by_weekday', 0),
  ('Riverside University Crew', 'AM2', '{6}'::int[], 'competitive', 16, 'mixed', 0),
  ('Harbor Rowing Club', 'AM2', '{1,3,5}'::int[], 'intermediate', 16, 'mixed', 1),
  ('Harbor Rowing Club', 'PM1', '{2,4}'::int[], 'intermediate', 8, 'mixed', 1),
  ('Harbor Rowing Club', 'AM1', '{6,7}'::int[], 'intermediate', 12, 'mixed', 1),
  ('Eastside Community Rowing', 'PM1', '{1,2,3,4,5}'::int[], 'novice', 12, 'mixed', 2),
  ('Eastside Community Rowing', 'AM2', '{7}'::int[], 'novice', 8, 'mixed', 2)
) as r(org_name, slot, weekdays, skill, seats, program, offset_minutes) on extract(isodow from d.date)::int = any (r.weekdays)
join organization o on o.name = r.org_name;`);

  // damage events
  stmts.push(
    `insert into damage_event (id, asset_id, reported_on, reported_by_org_id, liable_org_id, component, description, severity, status, resolved_on, cost_cents) values\n` +
      damageEvents
        .map((e, i) => {
          const assetName = assetByIdName.get(e.asset_id)!;
          const aid = v5(q(`asset:${assetName}`));
          const id = v5(`'damage_event:' || ${aid}::text || '|' || ${q(e.reported_on)} || '|' || ${q(e.component)} || '|' || ${q(String(i + 1))}`);
          return `(${id}, ${aid}, ${q(e.reported_on)}, ${orgIdSql(e.reported_by_org_id)}, ${orgIdSql(e.liable_org_id)}, ${q(e.component)}, ${q(e.description)}, ${q(e.severity)}, ${q(e.status)}, ${q(e.resolved_on)}, ${e.cost_cents})`;
        })
        .join(",\n") +
      ";",
  );

  // parts
  stmts.push(
    `insert into part (id, name, component, qty_in_stock, qty_on_order, unit_cost_cents, reorder_threshold) values\n` +
      parts
        .map(
          (p) =>
            `(${v5(q(`part:${p.name}`))}, ${q(p.name)}, ${q(p.component)}, ${p.qty_in_stock}, ${p.qty_on_order}, ${p.unit_cost_cents}, ${p.reorder_threshold})`,
        )
        .join(",\n") +
      ";",
  );

  // allocations from the engine, compact rows resolved to ids in SQL, in chunks
  const orgCode: Record<string, string> = {};
  organizations.forEach((o) => (orgCode[o.id] = o.name));
  const rows = sim.allocations.map((a) => {
    const s = sessionById.get(a.session_id)!;
    return `(${q(orgCode[s.org_id]!)},'${s.date}','${s.slot}',${q(assetByIdName.get(a.asset_id)!)},'${a.basis}')`;
  });
  const CHUNK = 400;
  for (let i = 0; i < rows.length; i += CHUNK) {
    stmts.push(
      `insert into allocation (id, session_id, asset_id, basis, approved, overridden_from_asset_id, override_reason)\nselect ${v5(`'allocation:' || s.id || '|' || a.id`)}, s.id, a.id, v.basis::allocation_basis, (s.date <= '${LAST_APPROVED_MONDAY}'::date + 6), NULL, NULL\nfrom (values\n` +
        rows.slice(i, i + CHUNK).join(",\n") +
        `\n) as v(org_name, date, slot, asset_name, basis)\njoin organization o on o.name = v.org_name\njoin session s on s.org_id = o.id and s.date = v.date::date and s.slot = v.slot::slot\njoin asset a on a.name = v.asset_name;`,
    );
  }

  // session statuses per 6.2 step 3, from allocated shell seats
  stmts.push(`update session s set status = t.status::session_status
from (
  select s2.id,
    case when coalesce(sum(case when a.asset_class::text like 'shell_%' then a.seats end), 0) >= s2.requested_seats then 'allocated'
         when count(a.id) filter (where a.asset_class::text like 'shell_%') > 0 then 'partially_allocated'
         else 'unfilled' end as status
  from session s2
  left join allocation al on al.session_id = s2.id
  left join asset a on a.id = al.asset_id
  group by s2.id, s2.requested_seats
) t where t.id = s.id;`);

  return stmts;
}

function main() {
  const outDir = process.argv[2] ?? path.join(process.cwd(), "supabase", "seed-sql");
  mkdirSync(outDir, { recursive: true });
  const stmts = render();
  stmts.forEach((sql, i) => {
    const file = path.join(outDir, `seed-${String(i + 1).padStart(2, "0")}.sql`);
    writeFileSync(file, sql + "\n");
  });
  const sim = simulateSeed();
  const counts = Object.values(sim.statuses).reduce<Record<string, number>>((acc, s) => ((acc[s] = (acc[s] ?? 0) + 1), acc), {});
  console.log(`Wrote ${stmts.length} SQL files to ${outDir}`);
  console.log(`Expected: organizations ${organizations.length}, assets ${assets.length}, entitlements ${entitlements.length}, sessions ${sessions.length}, damage_events ${damageEvents.length}, parts ${parts.length}, allocations ${sim.allocations.length} (approved ${sim.allocations.filter((a) => a.approved).length})`);
  console.log(`Expected session statuses: ${JSON.stringify(counts)}`);
  console.log(`Sample ids for cross-check: org Harbor Rowing Club = ${ids.org("Harbor Rowing Club")}; asset The Ashford = ${ids.asset("The Ashford")}`);
}

main();
