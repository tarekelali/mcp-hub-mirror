-- Grant access to materialized view to silence security warning
grant select on mv_country_counts to anon, authenticated;