-- Create acc_projects table for storing all ACC projects
CREATE TABLE public.acc_projects (
  project_id TEXT NOT NULL PRIMARY KEY,
  name_raw TEXT NOT NULL,
  country_name TEXT,
  country_code TEXT,
  unit_code TEXT,
  unit_number INTEGER,
  city TEXT,
  parse_confidence DECIMAL(3,2) CHECK (parse_confidence >= 0 AND parse_confidence <= 1),
  ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on acc_projects
ALTER TABLE public.acc_projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for read access
CREATE POLICY "viewer_read_acc_projects" 
ON public.acc_projects 
FOR SELECT 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_acc_projects_country_code ON public.acc_projects(country_code);
CREATE INDEX idx_acc_projects_name_raw ON public.acc_projects USING gin(to_tsvector('english', name_raw));
CREATE INDEX idx_acc_projects_city ON public.acc_projects USING gin(to_tsvector('english', city));
CREATE INDEX idx_acc_projects_unit_code ON public.acc_projects(unit_code);
CREATE INDEX idx_acc_projects_ingested_at ON public.acc_projects(ingested_at);

-- Create materialized view for country counts
CREATE MATERIALIZED VIEW public.acc_country_counts AS
SELECT 
  country_code,
  country_name,
  COUNT(*) as total_projects,
  COUNT(CASE WHEN parse_confidence >= 0.7 THEN 1 END) as high_confidence_projects,
  AVG(parse_confidence) as avg_confidence,
  MAX(ingested_at) as last_updated
FROM public.acc_projects 
WHERE country_code IS NOT NULL
GROUP BY country_code, country_name
UNION ALL
SELECT 
  'UNKNOWN' as country_code,
  'Unknown' as country_name,
  COUNT(*) as total_projects,
  0 as high_confidence_projects,
  AVG(parse_confidence) as avg_confidence,
  MAX(ingested_at) as last_updated
FROM public.acc_projects 
WHERE country_code IS NULL
ORDER BY total_projects DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_acc_country_counts_country_code ON public.acc_country_counts(country_code);

-- Enable RLS on materialized view
ALTER MATERIALIZED VIEW public.acc_country_counts OWNER TO postgres;

-- Create RLS policy for materialized view
CREATE POLICY "viewer_read_acc_country_counts" 
ON public.acc_country_counts 
FOR SELECT 
USING (true);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_acc_country_counts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.acc_country_counts;
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_acc_projects_updated_at
BEFORE UPDATE ON public.acc_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for ingest job tracking
CREATE TABLE public.acc_ingest_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_projects INTEGER DEFAULT 0,
  processed_projects INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  notes TEXT,
  triggered_by TEXT -- 'scheduled' or 'manual' or user_id
);

-- Enable RLS on ingest jobs
ALTER TABLE public.acc_ingest_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for ingest jobs
CREATE POLICY "editor_read_acc_ingest_jobs" 
ON public.acc_ingest_jobs 
FOR SELECT 
USING (true);

CREATE POLICY "editor_write_acc_ingest_jobs" 
ON public.acc_ingest_jobs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "editor_update_acc_ingest_jobs" 
ON public.acc_ingest_jobs 
FOR UPDATE 
USING (true);