-- Fix security warnings: Remove public API access to materialized views
-- Only service_role should access these directly

REVOKE ALL ON public.acc_country_counts FROM anon;
REVOKE ALL ON public.acc_country_counts FROM authenticated;

-- Only service_role can access it (for edge functions)
GRANT SELECT ON public.acc_country_counts TO service_role;