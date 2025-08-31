-- Create a table for basic metrics tracking
CREATE TABLE public.aps_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  function_name TEXT NOT NULL,
  status_class TEXT NOT NULL, -- 'success', 'error', 'rate_limited'
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.aps_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for viewer access (read-only)
CREATE POLICY "viewer_read_aps_metrics" 
ON public.aps_metrics 
FOR SELECT 
USING (true);

-- Create unique constraint for efficient upserts
CREATE UNIQUE INDEX idx_aps_metrics_daily 
ON public.aps_metrics (day, function_name, status_class);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_aps_metrics_updated_at
BEFORE UPDATE ON public.aps_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();