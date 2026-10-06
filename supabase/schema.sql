-- Self Scale Group website — contact form storage
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.

create table if not exists public.website_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table public.website_messages enable row level security;

drop policy if exists "website_messages_anon_insert" on public.website_messages;
create policy "website_messages_anon_insert"
  on public.website_messages
  for insert
  to anon
  with check (true);

grant insert on public.website_messages to anon;
