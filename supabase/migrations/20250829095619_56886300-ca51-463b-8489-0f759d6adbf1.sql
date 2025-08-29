create table if not exists editor_tokens (
  session_id text primary key,
  aps_user_id text,
  refresh_token_enc text not null,
  scope text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table editor_tokens enable row level security;
create policy editor_tokens_open on editor_tokens for select using (true);
create policy editor_tokens_write on editor_tokens for insert with check (true);
create policy editor_tokens_update on editor_tokens for update using (true) with check (true);