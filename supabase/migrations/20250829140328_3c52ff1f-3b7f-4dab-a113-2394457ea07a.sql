-- Ensure countries exist (idempotent upsert style)
INSERT INTO countries (code, name, centroid)
  VALUES
    ('AU','Australia','{"lat":-25.2744,"lng":133.7751}'),
    ('NL','Netherlands','{"lat":52.1326,"lng":5.2913}')
ON CONFLICT (code) DO NOTHING;

-- Ensure one pilot CMP exists for each project (demo ids here)
-- Note: published=true so it shows up
INSERT INTO cmps (id, name, country_code, published, area_sqm, acc_project_id, created_at, unit_code, city)
  VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','IKEA Canberra','AU', true, 20000, 'proj-AU-451', now(), '451','Canberra'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','IKEA Perth','AU', true, 22000, 'proj-AU-556',  now(), '556','Perth'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc','IKEA Delft','NL', true, 21000, 'proj-NL-151',  now(), '151','Delft')
ON CONFLICT (id) DO NOTHING;

-- Map the ACC project names to those CMPs
INSERT INTO acc_project_map (acc_project_id, name, country_code, unit_code, city, cmp_id, parsed)
  VALUES
    ('proj-AU-451','Australia_451_Canberra','AU','451','Canberra','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"source":"seed"}'),
    ('proj-AU-556','Australia_556_Perth','AU','556','Perth','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','{"source":"seed"}'),
    ('proj-NL-151','Netherlands_151_Delft','NL','151','Delft','cccccccc-cccc-cccc-cccc-cccccccccccc','{"source":"seed"}')
ON CONFLICT (acc_project_id) DO NOTHING;