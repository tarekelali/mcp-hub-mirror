-- Add country aliases for better IKEA name parsing
-- Extend country map with common aliases and variations

-- First, let's rebuild the materialized view with better structure
DROP MATERIALIZED VIEW IF EXISTS public.acc_country_counts;

CREATE MATERIALIZED VIEW public.acc_country_counts AS
SELECT 
  ap.country_code,
  COALESCE(c.name, ap.country_name, 'Unknown') as country_name,
  COUNT(*) as total_projects,
  COUNT(CASE WHEN ap.parse_confidence >= 0.7 THEN 1 END) as high_confidence_projects,
  AVG(ap.parse_confidence) as avg_confidence,
  c.centroid
FROM public.acc_projects ap
LEFT JOIN public.countries c ON ap.country_code = c.code
WHERE ap.country_code IS NOT NULL 
GROUP BY ap.country_code, c.name, ap.country_name, c.centroid
ORDER BY total_projects DESC;

-- Create unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX acc_country_counts_country_code_idx ON public.acc_country_counts (country_code);

-- Grant select to service role for edge functions
GRANT SELECT ON public.acc_country_counts TO service_role;