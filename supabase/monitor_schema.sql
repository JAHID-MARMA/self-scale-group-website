-- Self Scale Group — Founder Live Monitor (v1)
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is idempotent
-- (if-not-exists / drop-policy-if-exists / where-not-exists seeds).
--
-- What this creates (all private, Founder-only):
--   monitor_admins   — the allowlist. One row per allowed login email.
--   monitor_activity — who did what (staff activity log).
--   tool_status      — every tool: works or not, plan, credits, check date.
--   revenue_ledger   — money in. ONLY status='received' counts as revenue.
--   decisions        — items waiting on the Founder (viewed, not acted on).
--   pipelines        — work in flight: stage, owner, next step.
--
-- Security model (this is the real lock — read before changing):
--   * Row Level Security is ON for every table here.
--   * The ONLY select policy lets a signed-in user read rows when their
--     login email is listed in monitor_admins. Customers of the shop
--     (they also have logins) read ZERO rows from these tables.
--   * There is NO insert / update / delete policy at all — not for anon,
--     not for authenticated. The website (anon key) can never write,
--     edit or fake a row. Rows are written only by the CEO/Founder in
--     the Supabase dashboard (service role), never from a browser page.
--   * The service-role key is never in website code. Do not add it.

-- ============================================================
-- 1) TABLES
-- ============================================================

create table if not exists public.monitor_admins (
  email     text primary key,
  added_at  timestamptz not null default now()
);

create table if not exists public.monitor_activity (
  id          uuid primary key default gen_random_uuid(),
  happened_at timestamptz not null default now(),
  logged_at   timestamptz not null default now(),
  actor       text not null,
  category    text,
  action      text not null,
  detail      text,
  status      text not null default 'done'
              check (status in ('done', 'in_progress', 'blocked', 'waiting_founder')),
  proof_url   text
);

create table if not exists public.tool_status (
  id           uuid primary key default gen_random_uuid(),
  tool         text not null,
  works        boolean not null default true,
  plan         text,
  credits_left text,
  credit_limit text,
  note         text,
  checked_on   date,
  checked_by   text
);

create table if not exists public.revenue_ledger (
  id                 uuid primary key default gen_random_uuid(),
  received_at        timestamptz,
  source             text,
  product_or_service text,
  buyer_label        text,
  amount_bdt         numeric(10,2) not null check (amount_bdt >= 0),
  method             text check (method in ('bkash', 'card', 'cash')),
  trx_id             text,
  status             text not null default 'pending'
                     check (status in ('received', 'pending', 'refunded')),
  order_id           uuid references public.orders(id)
);

create table if not exists public.decisions (
  id          uuid primary key default gen_random_uuid(),
  raised_at   timestamptz not null default now(),
  title       text not null,
  detail      text,
  link_url    text,
  status      text not null default 'open'
              check (status in ('open', 'done', 'dropped')),
  resolved_at timestamptz
);

create table if not exists public.pipelines (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  stage      text not null default 'idea'
             check (stage in ('idea', 'drafting', 'building', 'ceo_check',
                              'waiting_founder', 'live', 'done')),
  owner      text,
  next_step  text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2) ALLOWLIST HELPER
-- A signed-in user is a monitor admin when their login email
-- (from their auth token) is listed in monitor_admins.
-- security definer: the function may read the allowlist even
-- though the caller may not read the whole table.
-- ============================================================

create or replace function public.is_monitor_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.monitor_admins a
    where a.email = (auth.jwt() ->> 'email')
  );
$$;

-- ============================================================
-- 3) ROW LEVEL SECURITY — read-only for allowlisted emails,
--    no write path from any website key.
-- ============================================================

alter table public.monitor_admins   enable row level security;
alter table public.monitor_activity enable row level security;
alter table public.tool_status      enable row level security;
alter table public.revenue_ledger   enable row level security;
alter table public.decisions        enable row level security;
alter table public.pipelines        enable row level security;

-- The allowlist itself: a signed-in user may see only their own
-- row (enough for the page to confirm "you are on the list").
drop policy if exists "monitor_admins_read_own" on public.monitor_admins;
create policy "monitor_admins_read_own"
  on public.monitor_admins
  for select
  to authenticated
  using (email = (auth.jwt() ->> 'email'));

-- Monitor tables: select only for allowlisted emails.
drop policy if exists "monitor_activity_read_admin" on public.monitor_activity;
create policy "monitor_activity_read_admin"
  on public.monitor_activity
  for select
  to authenticated
  using (public.is_monitor_admin());

drop policy if exists "tool_status_read_admin" on public.tool_status;
create policy "tool_status_read_admin"
  on public.tool_status
  for select
  to authenticated
  using (public.is_monitor_admin());

drop policy if exists "revenue_ledger_read_admin" on public.revenue_ledger;
create policy "revenue_ledger_read_admin"
  on public.revenue_ledger
  for select
  to authenticated
  using (public.is_monitor_admin());

drop policy if exists "decisions_read_admin" on public.decisions;
create policy "decisions_read_admin"
  on public.decisions
  for select
  to authenticated
  using (public.is_monitor_admin());

drop policy if exists "pipelines_read_admin" on public.pipelines;
create policy "pipelines_read_admin"
  on public.pipelines
  for select
  to authenticated
  using (public.is_monitor_admin());

-- No insert/update/delete policies are created on purpose:
-- with RLS on and no policy, every write from anon/authenticated
-- keys is denied. Data is managed in the Supabase dashboard only.

grant select on public.monitor_admins   to authenticated;
grant select on public.monitor_activity to authenticated;
grant select on public.tool_status      to authenticated;
grant select on public.revenue_ledger   to authenticated;
grant select on public.decisions        to authenticated;
grant select on public.pipelines        to authenticated;

-- ============================================================
-- 4) FOUNDER ALLOWLIST — ordered by the Founder on 2026-10-07.
-- This is the one login email that can open the monitor.
-- ============================================================

insert into public.monitor_admins (email)
values ('jahidhasan.dmj@gmail.com')
on conflict (email) do nothing;

-- ============================================================
-- 5) FIRST TOOL ROWS — written by CEO from checks already done.
-- Credits are TEXT on purpose (most platforms have no credit
-- API), and every row carries the date it was checked. A credit
-- figure with an old date is stale — the page shows it yellow.
-- No activity / revenue / decision rows are seeded: the monitor
-- starts honest and empty rather than decorated.
-- ============================================================

insert into public.tool_status (tool, works, plan, credits_left, credit_limit, note, checked_on, checked_by)
select 'Leonardo AI', true, 'Free', '2 of 150 tokens left', '150 tokens',
       'Sign in works. Keep the last tokens for final work only.', date '2026-10-07', 'CEO'
where not exists (select 1 from public.tool_status t where t.tool = 'Leonardo AI');

insert into public.tool_status (tool, works, plan, credits_left, credit_limit, note, checked_on, checked_by)
select 'Canva', true, 'Free', 'Not checked yet', null,
       'AI image generation works. Design generation is off (brand admin), and the website stops at a human check.', date '2026-10-07', 'CEO'
where not exists (select 1 from public.tool_status t where t.tool = 'Canva');

insert into public.tool_status (tool, works, plan, credits_left, credit_limit, note, checked_on, checked_by)
select 'HeyGen', true, 'Free', '3 videos a month, up to 1 minute each', '3 videos / month',
       'Free plan limits.', date '2026-10-07', 'CEO'
where not exists (select 1 from public.tool_status t where t.tool = 'HeyGen');

insert into public.tool_status (tool, works, plan, credits_left, credit_limit, note, checked_on, checked_by)
select 'Runway', true, 'Free', '125 credits (free starting balance)', '125 credits',
       'Free plan.', date '2026-10-07', 'CEO'
where not exists (select 1 from public.tool_status t where t.tool = 'Runway');

insert into public.tool_status (tool, works, plan, credits_left, credit_limit, note, checked_on, checked_by)
select 'Napkin AI', true, 'Pro free trial (7 days), then Free', '500 AI credits a week on the Free plan', null,
       'Signed in on 7 Oct 2026. Nothing created yet.', date '2026-10-07', 'CEO'
where not exists (select 1 from public.tool_status t where t.tool = 'Napkin AI');

insert into public.tool_status (tool, works, plan, credits_left, credit_limit, note, checked_on, checked_by)
select 'Muse', true, 'Free', 'Weekly limit reached — resets 9 Oct 2026, 6:11 PM UTC', 'Weekly limit',
       'Free plan weekly usage limit was reached on 7 Oct 2026.', date '2026-10-07', 'CEO'
where not exists (select 1 from public.tool_status t where t.tool = 'Muse');

insert into public.tool_status (tool, works, plan, credits_left, credit_limit, note, checked_on, checked_by)
select 'Flow (Whisk)', true, 'Free', '50 credits a day, refresh 3:30 PM', '50 credits / day',
       'Whisk now opens inside Google Flow. 2K is the largest free size.', date '2026-10-07', 'CEO'
where not exists (select 1 from public.tool_status t where t.tool = 'Flow (Whisk)');

-- ============================================================
-- CEO write-path (how rows get in — dashboard only):
--   Supabase → Table Editor → pick the table → Insert row.
--   * revenue_ledger: add a row ONLY when money is truly in
--     hand, status 'received', with the bKash Trx ID as proof.
--     A shop order being 'approved' is NOT revenue by itself.
--   * monitor_activity: one row per verified piece of work,
--     written after the CEO gate — never before.
--   * tool_status: update credits_left + checked_on after
--     opening the platform and reading the real number.
-- ============================================================
