-- ─────────────────────────────────────────────────────────────────────
-- LA joins Due-trigger generation.
--
-- regenerate_triggers_for_slug carried ONE exclusion flag that removed a
-- jurisdiction from cited/clean AND due together. LA was on it because its
-- only feed was a quarterly ArcGIS drop running ~65 days stale, so a
-- cadence prediction off those dates was meaningless.
--
-- la-live-crawl now reads the county's eCompliance portal (~8 days fresh),
-- so the flag is split: LA stays out of cited/clean, and joins due.
--
-- LA MUST STAY OUT OF CITED/CLEAN. The county withholds violation detail
-- for inspections on or after 2025-08-25, so a fresh LA inspection carries
-- no violation rows — and would be classified 'clean' purely because the
-- data is withheld. Absence of violation DATA is not evidence of a clean
-- inspection. Orange stays out of BOTH: it ignores its own date filter, so
-- its dates cannot support a prediction either.
--
-- APPLIED DIRECTLY via `supabase db query`, not `db push` — seven unrelated
-- migrations are pending locally and a push would apply those too.
-- CREATE OR REPLACE is idempotent, so a later push re-runs it harmlessly.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.regenerate_triggers_for_slug(p_slug text, p_recency_days integer, p_cap_days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_source_ids uuid[];
  v_deleted   integer := 0;
  v_preserved integer := 0;
  v_cited     integer := 0;
  v_clean     integer := 0;
  v_due       integer := 0;
  v_total     integer := 0;
  v_has_vio   boolean := false;
  v_excluded  boolean := false;
  v_excl_due  boolean := false;
begin
  -- A full rebuild is a maintenance operation, not an API read; the
  -- default statement timeout is sized for the latter. Local to this
  -- transaction only.
  perform set_config('statement_timeout', '240s', true);
  select array_agg(s.id) into v_source_ids
  from inspection_sources s
  join jurisdictions j on j.id = s.jurisdiction_id
  where j.slug = p_slug;

  if v_source_ids is null then
    return jsonb_build_object('slug', p_slug, 'skipped', 'no sources for slug');
  end if;

  -- LA posts quarterly (65+ days stale) and Orange ignores its own date
  -- filter, so neither can support a freshness-based trigger.
  -- CITED/CLEAN exclusion. LA publishes no violation detail for
  -- inspections on or after 2025-08-25, so a fresh LA inspection would
  -- read as 'clean' purely because the violations are withheld. Absence
  -- of violation DATA is not evidence of a clean inspection.
  v_excluded := p_slug in ('la-county-ca', 'orange-ca');

  -- DUE exclusion is narrower. LA is now crawled live from the county's
  -- eCompliance portal (~8 days fresh, was a 65-day quarterly snapshot),
  -- so its last-inspection dates are current enough to predict cadence.
  -- Orange stays out: it ignores its own date filter, so its dates cannot
  -- be trusted for a prediction either.
  v_excl_due := p_slug in ('orange-ca');

  -- Operator decisions that must survive this rebuild.
  select count(*) into v_preserved
  from inspection_triggers
  where source_id = any(v_source_ids) and status <> 'new';

  -- STEP 1 — rebuild safely. A separate statement from every INSERT
  -- below: folding this into a data-modifying CTE alongside an INSERT
  -- makes both see the same snapshot, and the re-inserted rows collide
  -- on (facility_id, trigger_type, trigger_date). Known trap.
  delete from inspection_triggers
  where source_id = any(v_source_ids) and status = 'new';
  get diagnostics v_deleted = row_count;

  -- Does this jurisdiction publish violation detail at all? Absence of
  -- violation DATA is not evidence of a clean inspection, so a source
  -- without any violations rows gets no cited/clean — Due only.
  select exists (
    select 1 from violations v
    join inspections i on i.id = v.inspection_id
    where i.source_id = any(v_source_ids)
  ) into v_has_vio;

  -- STEP 2 — CITED + CLEAN off each facility's single most recent
  -- inspection inside the window. Latest wins, so a facility is never
  -- both. Facilities already carrying a surviving (operator-decided)
  -- trigger are skipped, which is what keeps one trigger per facility.
  if v_has_vio and not v_excluded then
    insert into inspection_triggers
      (facility_id, source_id, inspection_id, trigger_type, trigger_date, mapped_record, rank, status)
    -- The window filter comes BEFORE the distinct-on, not after. Sorting
    -- all 100k+ of a source's inspections to find every facility's latest
    -- and only then discarding the stale ones was the slowest statement
    -- in this function. Restricting to the window first leaves a few
    -- hundred rows to sort. Semantically identical: a facility whose
    -- newest inspection falls outside the window has none inside it.
    with latest as (
      select distinct on (i.facility_id)
             i.id, i.facility_id, i.source_id, i.inspection_date
      from inspections i
      where i.source_id = any(v_source_ids)
        and i.inspection_date >= current_date - p_recency_days
        -- A jurisdiction can publish a date that has not happened yet
        -- (San Francisco published 2031-05-16). Such a row would sort to
        -- the top of this distinct-on and become the facility's "most
        -- recent" inspection, hiding the real one. Defence in depth
        -- alongside the rank clamp below.
        and i.inspection_date <= current_date
      order by i.facility_id, i.inspection_date desc, i.id
    ),
    ev as (
      select l.*, exists (select 1 from violations v where v.inspection_id = l.id) as has_vio
      from latest l
      where not exists (select 1 from inspection_triggers t where t.facility_id = l.facility_id)
    )
    select
      ev.facility_id, ev.source_id, ev.id,
      case when ev.has_vio then 'cited' else 'clean' end,
      ev.inspection_date,
      case when ev.has_vio then (
        select m.requirement_code
        from violations v
        join inspection_code_mappings m
          on m.source_id = ev.source_id
         and (m.source_code = v.source_code or m.source_code = v.cal_section)
        where v.inspection_id = ev.id
          and m.outcome = 'maps_to_record'
          and m.requirement_code is not null
        order by case m.confidence when 'high' then 1 when 'medium' then 2 when 'low' then 3 else 4 end,
                 m.requirement_code
        limit 1
      ) else null end,
      0, 'new'
    from ev;
  end if;

  -- STEP 3 — DUE, now a cheap lookup. The median-gap computation that
  -- used to live here (lag() + percentile_cont over 100k+ inspections)
  -- is what put the large counties at 18s, past PostgREST's 8s ceiling.
  -- It now runs once per crawl in refresh_facility_cadence, and this
  -- step just reads the result.
  --
  -- A facility that just earned a cited/clean above is excluded by the
  -- not-exists: a current event outranks a prediction. The same clause
  -- skips facilities holding a surviving operator decision, which is
  -- what keeps one trigger per facility.
  if not v_excl_due then
    insert into inspection_triggers
      (facility_id, source_id, inspection_id, trigger_type, trigger_date, mapped_record, rank, status)
    select
      c.facility_id, c.source_id, c.last_inspection_id,
      'due', c.last_inspection_date, null, 0, 'new'
    from facility_inspection_cadence c
    where c.source_id = any(v_source_ids)
      and c.median_gap_days is not null
      and c.last_inspection_date is not null
      and (current_date - c.last_inspection_date) >= c.median_gap_days
      and (current_date - c.last_inspection_date - c.median_gap_days) <= p_cap_days
      and not exists (select 1 from inspection_triggers t where t.facility_id = c.facility_id);
  end if;

  -- STEP 4 — rank the rows this run created. Freshness dominates, a
  -- mapped record is worth a fixed bonus, and type breaks the tie, so
  -- today's citations sit at the top of tomorrow's queue.
  update inspection_triggers t
  -- The day-difference is clamped at 0 BEFORE the subtraction. A future
  -- trigger_date makes (current_date - trigger_date) negative, and
  -- subtracting a negative inflates the term instead of capping it: one
  -- San Francisco row dated 2031-05-16 scored 1834 against a legitimate
  -- maximum of 145, outranking every real lead by 12x for five years.
  -- Clamping inside means a future date reads as today (recency 100),
  -- never better than today.
  set rank = greatest(0, 100 - greatest(0, current_date - t.trigger_date))
           + case when t.mapped_record is not null then 25 else 0 end
           + case t.trigger_type when 'cited' then 20 when 'clean' then 10 else 5 end
  where t.source_id = any(v_source_ids) and t.status = 'new';

  select
    count(*) filter (where trigger_type = 'cited'),
    count(*) filter (where trigger_type = 'clean'),
    count(*) filter (where trigger_type = 'due'),
    count(*)
  into v_cited, v_clean, v_due, v_total
  from inspection_triggers
  where source_id = any(v_source_ids) and status = 'new';

  return jsonb_build_object(
    'slug', p_slug,
    'excluded', v_excluded,
    'excluded_due', v_excl_due,
    'violation_bearing', v_has_vio,
    'deleted', v_deleted,
    'preserved', v_preserved,
    'cited', v_cited,
    'clean', v_clean,
    'due', v_due,
    'total_now', v_total
  );
end;
$function$

