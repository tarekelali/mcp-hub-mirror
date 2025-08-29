-- Add optional CMP metadata for display
ALTER TABLE cmps
  ADD COLUMN IF NOT EXISTS unit_code text,
  ADD COLUMN IF NOT EXISTS city text;

-- Map ACC projects -> CMPs (read-only reference; we do NOT write to ACC)
CREATE TABLE IF NOT EXISTS acc_project_map (
  acc_project_id text PRIMARY KEY,
  name text NOT NULL,           -- original project name (e.g., Australia_451_Canberra)
  country_code text,            -- ISO (AU, NL, …)
  unit_code text,               -- e.g., 451
  city text,                    -- e.g., Canberra
  cmp_id uuid REFERENCES cmps(id),
  parsed jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS acc_project_map_country_idx ON acc_project_map(country_code);

-- Enable RLS for acc_project_map
ALTER TABLE acc_project_map ENABLE ROW LEVEL SECURITY;

-- Create policy for reading acc_project_map
CREATE POLICY "viewer_read_acc_project_map" 
ON acc_project_map 
FOR SELECT 
USING (true);