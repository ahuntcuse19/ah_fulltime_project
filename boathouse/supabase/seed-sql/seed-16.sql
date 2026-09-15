update session s set status = t.status::session_status
from (
  select s2.id,
    case when coalesce(sum(case when a.asset_class::text like 'shell_%' then a.seats end), 0) >= s2.requested_seats then 'allocated'
         when count(a.id) filter (where a.asset_class::text like 'shell_%') > 0 then 'partially_allocated'
         else 'unfilled' end as status
  from session s2
  left join allocation al on al.session_id = s2.id
  left join asset a on a.id = al.asset_id
  group by s2.id, s2.requested_seats
) t where t.id = s.id;
