-- Fix function search path security issues
DROP FUNCTION IF EXISTS public.update_updated_at_column();

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

-- Also fix the existing refresh_mv_country_counts function if it exists
DROP FUNCTION IF EXISTS public.refresh_mv_country_counts();

CREATE OR REPLACE FUNCTION public.refresh_mv_country_counts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  refresh materialized view concurrently mv_country_counts;
$$;