-- ─────────────────────────────────────────────────────────────────────
-- Nightly inspection refresh — pg_cron + pg_net
--
-- Keeps the trigger queue current without anyone pressing a button: each
-- refreshable county is pulled overnight and the queue is rebuilt, so the
-- morning's queue leads with yesterday's citations.
--
-- APPLIED DIRECTLY via `supabase db query`, not `db push`. Seven unrelated
-- migrations are pending locally, and a push would apply those too. Every
-- statement here is idempotent (IF NOT EXISTS / CREATE OR REPLACE, and
-- cron.schedule upserts on jobname), so a later push re-runs it harmlessly.
--
-- THE KEY IS NEVER IN THE CRON COMMAND. It is read at call time from
-- Vault (vault.decrypted_secrets, name 'service_role_key' — the secret the
-- project's other cron jobs already use). The command text stored in
-- cron.job contains no credential.
--
-- WHY ONE JOB PER COUNTY, NOT {all:true}: the dispatcher walks counties
-- sequentially and a full sweep runs past the platform's 150s request
-- ceiling, which strands the tail of the list half-done. One county per
-- tick, five minutes apart, keeps every call far inside the budget — the
-- slowest observed county is San Diego at ~51s.
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. Run log ───────────────────────────────────────────────────────
-- pg_net is asynchronous: http_post returns a request id immediately and
-- the response lands in net._http_response later. So the dispatch is
-- recorded here and the outcome is joined on afterwards.
create table if not exists public.inspection_cron_log (
  id           bigserial primary key,
  jurisdiction text        not null,
  action       text        not null,   -- refresh | drain | regenerate
  fn           text        not null,
  request_id   bigint,
  ran_at       timestamptz not null default now()
);

create index if not exists idx_inspection_cron_log_ran_at
  on public.inspection_cron_log (ran_at desc);

alter table public.inspection_cron_log enable row level security;

-- Same shape as the other ingestion tables: operators only.
drop policy if exists inspection_cron_log_admin_read on public.inspection_cron_log;
create policy inspection_cron_log_admin_read
  on public.inspection_cron_log
  for select
  using (auth.jwt() ->> 'email' like '%@getevidly.com');

-- ── 2. The one call the cron makes ───────────────────────────────────
-- security definer so the job can read the Vault secret without the
-- secret ever appearing in cron.job.command.
create or replace function public.run_inspection_refresh(
  p_fn     text,
  p_body   jsonb,
  p_label  text,
  p_action text
) returns bigint
language plpgsql
security definer
set search_path = public, net, vault
as $fn$
declare
  v_key text;
  v_req bigint;
begin
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if v_key is null then
    raise exception 'Vault secret service_role_key is missing; refresh cron cannot authenticate.';
  end if;

  -- timeout_milliseconds defaults to 5000, which is shorter than every
  -- county refresh. Without this the response is always recorded as a
  -- timeout even though the edge function completed.
  select net.http_post(
    url     := 'https://irxgmhxhmxtzfwuieblc.supabase.co/functions/v1/' || p_fn,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_key
               ),
    body    := p_body,
    timeout_milliseconds := 150000
  ) into v_req;

  insert into public.inspection_cron_log (jurisdiction, action, fn, request_id)
  values (p_label, p_action, p_fn, v_req);

  return v_req;
end;
$fn$;

revoke all on function public.run_inspection_refresh(text, jsonb, text, text)
  from public, anon, authenticated;

-- ── 3. Did last night run? ───────────────────────────────────────────
-- net._http_response is pruned on a TTL, so status_code is null for runs
-- older than the retention window. ran_at still proves the job fired.
create or replace view public.inspection_cron_status as
select
  l.id,
  l.jurisdiction,
  l.action,
  l.fn,
  l.ran_at,
  r.status_code,
  r.timed_out,
  r.error_msg,
  left(r.content, 500) as response
from public.inspection_cron_log l
left join net._http_response r on r.id = l.request_id
order by l.ran_at desc;

revoke all on public.inspection_cron_status from anon;

-- ── 4. The schedule ──────────────────────────────────────────────────
-- pg_cron runs in UTC on this project (current_setting('TimeZone') = UTC),
-- so these are UTC and the local time drifts an hour across DST:
--   08:05 UTC = 01:05 PDT (summer) / 00:05 PST (winter)
-- Both sit in the quiet small hours, so the drift is left alone rather
-- than chased with two seasonal schedules.
--
-- Minutes avoid :00 deliberately — four existing jobs run hourly on the
-- hour and there is no reason to queue behind them.
--
-- NOT SCHEDULED, and why:
--   la-county-ca, contra-costa-ca, ventura-ca — no crawler at all.
--   orange-ca — crawlable, but regenerate_triggers_for_slug excludes it
--     (the source ignores its own date filter), so a nightly pull would
--     add inspections that can never become a fresh lead.

select cron.schedule('refresh-sacramento-ca',     '5 8 * * *',
  $$select public.run_inspection_refresh('refresh-jurisdiction', '{"jurisdiction":"sacramento-ca"}'::jsonb, 'sacramento-ca', 'refresh')$$);

select cron.schedule('refresh-placer-ca',         '10 8 * * *',
  $$select public.run_inspection_refresh('refresh-jurisdiction', '{"jurisdiction":"placer-ca"}'::jsonb, 'placer-ca', 'refresh')$$);

select cron.schedule('refresh-san-luis-obispo-ca','15 8 * * *',
  $$select public.run_inspection_refresh('refresh-jurisdiction', '{"jurisdiction":"san-luis-obispo-ca"}'::jsonb, 'san-luis-obispo-ca', 'refresh')$$);

select cron.schedule('refresh-tehama-ca',         '20 8 * * *',
  $$select public.run_inspection_refresh('refresh-jurisdiction', '{"jurisdiction":"tehama-ca"}'::jsonb, 'tehama-ca', 'refresh')$$);

select cron.schedule('refresh-santa-clara-ca',    '25 8 * * *',
  $$select public.run_inspection_refresh('refresh-jurisdiction', '{"jurisdiction":"santa-clara-ca"}'::jsonb, 'santa-clara-ca', 'refresh')$$);

select cron.schedule('refresh-san-francisco-ca',  '30 8 * * *',
  $$select public.run_inspection_refresh('refresh-jurisdiction', '{"jurisdiction":"san-francisco-ca"}'::jsonb, 'san-francisco-ca', 'refresh')$$);

select cron.schedule('refresh-san-diego-ca',      '35 8 * * *',
  $$select public.run_inspection_refresh('refresh-jurisdiction', '{"jurisdiction":"san-diego-ca"}'::jsonb, 'san-diego-ca', 'refresh')$$);

-- ── The three whole-county crawlers get DRAIN calls nightly ──────────
-- These counties publish no date filter, so refresh-jurisdiction's 'full'
-- mode re-queues EVERY task (merced 1081, stanislaus 547, sbc 192) on
-- each call. Running that nightly would re-crawl each county from scratch
-- every 24h, never finish, and hammer the source for history that has not
-- changed since 2023.
--
-- So nightly calls the crawler DIRECTLY instead: a crawler invocation
-- drains pending tasks without re-queueing, so a backlog actually shrinks
-- night over night and then costs almost nothing once empty. The full
-- re-sweep is a weekly job below.
select cron.schedule('refresh-merced-drain',         '40 8 * * *',
  $$select public.run_inspection_refresh('merced-crawl', '{}'::jsonb, 'merced-ca', 'drain')$$);

select cron.schedule('refresh-stanislaus-drain',     '45 8 * * *',
  $$select public.run_inspection_refresh('stan-crawl', '{}'::jsonb, 'stanislaus-ca', 'drain')$$);

select cron.schedule('refresh-san-bernardino-drain', '50 8 * * *',
  $$select public.run_inspection_refresh('sbc-crawl', '{}'::jsonb, 'san-bernardino-ca', 'drain')$$);

-- ── Rebuild the whole queue once the night's data has landed ─────────
-- Each county refresh already regenerates its own triggers. This catches
-- what those cannot: due triggers that come due purely because a day
-- passed, and a freshness window the operator changed during the day.
select cron.schedule('refresh-regenerate-all',    '55 8 * * *',
  $$select public.run_inspection_refresh('regenerate-triggers', '{"all":true}'::jsonb, 'ALL', 'regenerate')$$);

-- ── Weekly full re-sweep of the three whole-county sources ───────────
-- Sunday only. This is the call that re-queues the county; the nightly
-- drains above then work the backlog down over the following week.
select cron.schedule('refresh-merced-weekly',         '10 9 * * 0',
  $$select public.run_inspection_refresh('refresh-jurisdiction', '{"jurisdiction":"merced-ca"}'::jsonb, 'merced-ca', 'refresh')$$);

select cron.schedule('refresh-stanislaus-weekly',     '30 9 * * 0',
  $$select public.run_inspection_refresh('refresh-jurisdiction', '{"jurisdiction":"stanislaus-ca"}'::jsonb, 'stanislaus-ca', 'refresh')$$);

select cron.schedule('refresh-san-bernardino-weekly', '50 9 * * 0',
  $$select public.run_inspection_refresh('refresh-jurisdiction', '{"jurisdiction":"san-bernardino-ca"}'::jsonb, 'san-bernardino-ca', 'refresh')$$);
