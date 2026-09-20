insert into session (id, org_id, date, slot, skill_tier, requested_seats, source, raw_request_text, status, created_at, program)
select uuid_generate_v5('3b1f7d5e-9c2a-4e6b-8f0d-1a2b3c4d5e6f'::uuid, 'session:' || o.id || '|' || d.date::text || '|' || r.slot), o.id, d.date, r.slot::slot, r.skill::skill_tier, r.seats, 'standing', NULL, 'requested',
  '2026-03-02T05:00:00Z'::timestamptz + (r.offset_minutes || ' minutes')::interval,
  (case when r.program = 'by_weekday' then (case when extract(isodow from d.date) in (2, 4) then 'womens' else 'mens' end) else r.program end)::program_type
from generate_series('2026-03-02'::date, '2026-11-01'::date, '1 day') as d(date)
join (values
  ('Riverside University Crew', 'AM1', '{1,2,3,4,5}'::int[], 'competitive', 24, 'by_weekday', 0),
  ('Riverside University Crew', 'AM2', '{6}'::int[], 'competitive', 16, 'mixed', 0),
  ('Harbor Rowing Club', 'AM2', '{1,3,5}'::int[], 'intermediate', 16, 'mixed', 1),
  ('Harbor Rowing Club', 'PM1', '{2,4}'::int[], 'intermediate', 8, 'mixed', 1),
  ('Harbor Rowing Club', 'AM1', '{6,7}'::int[], 'intermediate', 12, 'mixed', 1),
  ('Eastside Community Rowing', 'PM1', '{1,2,3,4,5}'::int[], 'novice', 12, 'mixed', 2),
  ('Eastside Community Rowing', 'AM2', '{7}'::int[], 'novice', 8, 'mixed', 2)
) as r(org_name, slot, weekdays, skill, seats, program, offset_minutes) on extract(isodow from d.date)::int = any (r.weekdays)
join organization o on o.name = r.org_name;
