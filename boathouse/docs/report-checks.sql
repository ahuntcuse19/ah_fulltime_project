-- Phase 6 verification: figures shown on /reports and /inventory/[id] recomputed in SQL.
-- Run against the seeded database with today = 2026-09-15 (A4 cutoff). Expected values
-- are in the trailing comments; all were observed on 2026-09-15.

-- 8.3 boat report, The Ashford: session-outs on approved allocations.
select count(*) as session_outs
from allocation a join asset x on x.id = a.asset_id
where x.name = 'The Ashford' and a.approved;                                  -- 338

-- Available sessions = in-season days through today (198) x 3 slots, no off-water days.
select (date '2026-09-15' - date '2026-03-02' + 1) * 3 as available_sessions;  -- 594, utilization 56.9%

-- Session-outs by organization / program / slot for The Ashford.
select o.name, count(*) from allocation a
  join session s on s.id = a.session_id join organization o on o.id = s.org_id
  join asset x on x.id = a.asset_id
where x.name = 'The Ashford' and a.approved group by o.name;                  -- Harbor 196, Riverside 142
select coalesce(s.program::text, 'unset'), count(*) from allocation a
  join session s on s.id = a.session_id join asset x on x.id = a.asset_id
where x.name = 'The Ashford' and a.approved group by 1;                        -- mixed 198, mens 84, womens 56
select s.slot, count(*) from allocation a
  join session s on s.id = a.session_id join asset x on x.id = a.asset_id
where x.name = 'The Ashford' and a.approved group by 1;                        -- AM1 196, AM2 86, PM1 56

-- 8.2 utilization by organization; total equals the count of approved allocations.
select o.name,
       sum(case when x.owner_org_id is distinct from o.id then 1 else 0 end) as borrowed,
       sum(case when x.owner_org_id = o.id then 1 else 0 end) as owned,
       count(*) as total,
       round(o.annual_fee_cents::numeric / count(*)) as fee_per_session_out_cents
from allocation a join session s on s.id = a.session_id
  join organization o on o.id = s.org_id join asset x on x.id = a.asset_id
where a.approved group by o.id, o.name, o.annual_fee_cents;
-- Riverside 629 / 323 / 952 / 3782; Harbor 672 / 0 / 672 / 2679; Eastside 784 / 0 / 784 / 765
select count(*) from allocation where approved;                                -- 2408

-- 8.5 cost share: damage cost where liable, fixed or not.
select o.name, sum(d.cost_cents) from damage_event d
  join organization o on o.id = d.liable_org_id group by o.name;               -- Eastside 65000, Harbor 152000, Riverside 280000

-- 8.4 repair ratio = fixed repair spend / replacement cost.
select x.name, round(sum(case when d.status = 'fixed' then d.cost_cents else 0 end)::numeric * 100 / x.replacement_cost_cents, 1)
from damage_event d join asset x on x.id = d.asset_id
group by x.name, x.replacement_cost_cents;                                     -- Riverside Blue 4.3, Driftwood 3.6, Brackett 0.6, Osprey 0.5, Kestrel 0.2

-- 8.1 days off water, inclusive of reported_on and resolved_on, cut off at today.
select x.name, least(coalesce(d.resolved_on, date '2026-09-15'), date '2026-09-15') - d.reported_on + 1 as days
from damage_event d join asset x on x.id = d.asset_id where d.severity = 'off_water';
-- Riverside Blue 15, Driftwood 15, Lockwood 64, Sweep Set D 8

-- Fleet median utilization over non-retired shells (19 rows, median is the 10th).
with off as (
  select asset_id, sum(least(coalesce(resolved_on, date '2026-09-15'), date '2026-09-15') - reported_on + 1) as d
  from damage_event where severity = 'off_water' and reported_on <= date '2026-09-15' group by asset_id),
outs as (select asset_id, count(*) as n from allocation where approved group by asset_id)
select x.name, round(coalesce(outs.n, 0)::numeric * 100 / ((198 - coalesce(off.d, 0)) * 3), 1) as pct
from asset x left join off on off.asset_id = x.id left join outs on outs.asset_id = x.id
where x.asset_class::text like 'shell%' and x.status <> 'retired' order by pct;  -- median 7.4 (The Minnow)
