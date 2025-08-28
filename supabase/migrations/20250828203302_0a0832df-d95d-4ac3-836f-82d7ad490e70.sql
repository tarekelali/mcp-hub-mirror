insert into countries (code, name, centroid) values
  ('SE','Sweden','{"lat":60.1282,"lng":18.6435}'),
  ('GB','United Kingdom','{"lat":55.3781,"lng":-3.4360}')
on conflict (code) do update set name=excluded.name, centroid=excluded.centroid;

-- One pilot CMP
insert into cmps (id, name, country_code, published, area_sqm, acc_project_id)
values ('11111111-1111-1111-1111-111111111111','IKEA Stockholm K','SE', true, 25000, 'proj-SE-001')
on conflict (id) do nothing;

-- HFBs (toy data)
insert into hfbs (cmp_id, level, name, area_sqm, pct) values
('11111111-1111-1111-1111-111111111111','marketHall','Living', 3000, 30),
('11111111-1111-1111-1111-111111111111','marketHall','Kitchen', 2000, 20),
('11111111-1111-1111-1111-111111111111','showroom','Bedroom', 2500, 25),
('11111111-1111-1111-1111-111111111111','showroom','Kids', 1500, 15)
on conflict (cmp_id, level, name) do nothing;

-- Sheets
insert into revit_sheets (cmp_id, name, number, acc_item_id, acc_version_id, pdf_url)
values
('11111111-1111-1111-1111-111111111111','General Notes','A001','acc-item-1','acc-ver-1','https://example.com/sample.pdf')
on conflict do nothing;

-- Contact
insert into contacts (cmp_id, name, role, email, phone)
values ('11111111-1111-1111-1111-111111111111','Tamsin Bartlett','Country Superuser','tamsin@example.com','+44 20 7946 0991')
on conflict (cmp_id) do nothing;