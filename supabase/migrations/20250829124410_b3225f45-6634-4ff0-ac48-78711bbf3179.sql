-- Seed basic data for testing
INSERT INTO countries (code, name, centroid)
VALUES
  ('SE','Sweden','{"lat":60.1282,"lng":18.6435}'),
  ('GB','United Kingdom','{"lat":55.3781,"lng":-3.4360}')
ON CONFLICT (code) DO NOTHING;

INSERT INTO cmps (id, name, country_code, published, area_sqm, acc_project_id)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'IKEA Stockholm K',
  'SE',
  true,
  25000,
  'proj-SE-001'
)
ON CONFLICT (id) DO NOTHING;