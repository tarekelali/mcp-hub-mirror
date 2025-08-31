-- Fix function search path security issues by properly handling dependencies
DROP TRIGGER IF EXISTS update_aps_metrics_updated_at ON public.aps_metrics CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_aps_metrics_updated_at
BEFORE UPDATE ON public.aps_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Also fix the existing refresh_mv_country_counts function if it exists
DROP FUNCTION IF EXISTS public.refresh_mv_country_counts() CASCADE;

CREATE OR REPLACE FUNCTION public.refresh_mv_country_counts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  refresh materialized view concurrently mv_country_counts;
$$;