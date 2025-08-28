-- Drop & recreate for idempotence in dev
drop materialized view if exists mv_country_counts;

create materialized view mv_country_counts as
select
  c.code,
  c.name,
  c.centroid,
  count(m.id)                            as total,
  count(*) filter (where m.published)    as published,
  count(*) filter (where not m.published) as unpublished
from countries c
left join cmps m on m.country_code = c.code
group by c.code, c.name, c.centroid;

create index if not exists mv_country_counts_code_idx on mv_country_counts(code);

-- SQL function so Edge Functions can refresh it safely
create or replace function refresh_mv_country_counts()
returns void
language sql
security definer
as $$
  refresh materialized view concurrently mv_country_counts;
$$;