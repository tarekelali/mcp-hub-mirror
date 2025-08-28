-- Fix security warnings for function and materialized view

-- Update function to have proper search_path
create or replace function refresh_mv_country_counts()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view concurrently mv_country_counts;
$$;

-- Disable RLS on materialized view to prevent API access
alter table mv_country_counts disable row level security;