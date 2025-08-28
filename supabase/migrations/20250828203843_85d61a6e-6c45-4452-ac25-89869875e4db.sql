alter table detailed_solutions
  add column if not exists urn_current text,
  add column if not exists urn_crs text,
  add column if not exists urn_country text,
  add column if not exists urn_similar text;