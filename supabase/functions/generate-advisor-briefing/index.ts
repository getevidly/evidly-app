// generate-advisor-briefing — Edge function
// C5b of Dashboard v10 build sequence
// HTTP-triggered cache read for dashboard advisor briefing panels.
// pg_cron warms cache daily 6 AM org-local (hourly UTC, org-local hour check inside).
// Writes to advisor_briefings. Cache lifetime: valid_until = generated_at + 6 hours.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { generateBriefing, TEMPLATE_VERSION } from '../_shared/briefingTemplates/index.ts';
import type { AdvisorType } from '../_shared/briefingTemplates/types.ts';

let corsHeaders = getCorsHeaders(null);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADVISOR_TYPES: AdvisorType[] = ['compliance_officer', 'food_safety', 'fire_safety'];
const CACHE_LIFETIME_MS = 25 * 60 * 60 * 1000; // 25 hours

// Per-advisor role gating
const ADVISOR_ROLE_MAP: Record<AdvisorType, string[]> = {
  compliance_officer: ['owner_operator', 'executive', 'compliance_manager'],
  food_safety: ['owner_operator', 'executive', 'compliance_manager', 'chef'],
  fire_safety: ['owner_operator', 'executive', 'compliance_manager', 'facilities_manager'],
};

// DM roles that trigger cache warming for an org
const DM_ROLES = [
  'owner_operator', 'executive', 'compliance_manager',
  'facilities_manager', 'chef',
];

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Detect cron invocation ───────────────────────────────────────
  const isCron = req.headers.get('x-evidly-cron-source') === 'warm-cache';

  if (isCron) {
    return handleCronWarm(supabase);
  }

  // ── HTTP path: auth gate ─────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) return jsonResponse({ error: 'Missing authorization' }, 401);

  const authClient = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await authClient.auth.getUser();
  if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

  // ── Parse body ───────────────────────────────────────────────────
  let body: {
    org_id?: string;
    advisor_type?: string;
    location_id?: string | null;
    force_refresh?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  // ── Input validation ─────────────────────────────────────────────
  const errors: string[] = [];
  if (!body.org_id || !UUID_RE.test(body.org_id)) errors.push('org_id: invalid uuid');
  if (!body.advisor_type || !ADVISOR_TYPES.includes(body.advisor_type as AdvisorType)) {
    errors.push(`advisor_type: must be one of ${ADVISOR_TYPES.join(', ')}`);
  }
  if (body.location_id !== null && body.location_id !== undefined && !UUID_RE.test(body.location_id)) {
    errors.push('location_id: invalid uuid');
  }
  if (errors.length > 0) return jsonResponse({ error: 'Validation failed', details: errors }, 400);

  const orgId = body.org_id!;
  const advisorType = body.advisor_type as AdvisorType;
  const locationId = body.location_id || null;
  const forceRefresh = body.force_refresh === true;

  // ── Role check ───────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .eq('organization_id', orgId)
    .single();

  if (!profile) {
    return jsonResponse({ error: 'Forbidden: no profile in this organization' }, 403);
  }

  const allowedRoles = ADVISOR_ROLE_MAP[advisorType];
  if (!allowedRoles.includes(profile.role)) {
    return jsonResponse({ error: 'Forbidden: role not authorized for this briefing type' }, 403);
  }

  // ── Location ownership check ─────────────────────────────────────
  if (locationId) {
    const { data: loc } = await supabase
      .from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (!loc) {
      return jsonResponse({ error: 'Forbidden: location not in organization' }, 403);
    }
  }

  // ── Cache check (skip if force_refresh) ──────────────────────────
  if (!forceRefresh) {
    const cached = await getCachedBriefing(supabase, orgId, advisorType, locationId);
    if (cached) {
      return jsonResponse({ ...cached, cached: true });
    }
  }

  // ── Cache miss or force_refresh: generate fresh ──────────────────
  try {
    const result = await generateBriefing(supabase, {
      org_id: orgId,
      advisor_type: advisorType,
      location_id: locationId,
    });

    const now = new Date();
    const validUntil = new Date(now.getTime() + CACHE_LIFETIME_MS);

    const { data: row, error: insertErr } = await supabase
      .from('advisor_briefings')
      .insert({
        org_id: orgId,
        advisor_type: advisorType,
        location_id: locationId,
        briefing_text: result.briefing_text,
        posture: result.posture,
        open_items: result.open_items,
        data_snapshot: result.data_snapshot,
        generated_at: now.toISOString(),
        valid_until: validUntil.toISOString(),
        template_version: result.template_version,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[advisor-briefing] DB insert failed:', insertErr.message);
      // Briefing was computed — return it without persistence
      return jsonResponse({
        briefing_text: result.briefing_text,
        posture: result.posture,
        open_items: result.open_items,
        data_snapshot: result.data_snapshot,
        template_version: result.template_version,
        generated_at: now.toISOString(),
        valid_until: validUntil.toISOString(),
        cached: false,
        persisted: false,
      });
    }

    return jsonResponse({ ...row, cached: false });
  } catch (err) {
    console.error('[advisor-briefing] Generation failed:', (err as Error).message);
    return jsonResponse({ error: 'Briefing generation failed' }, 500);
  }
});

// ── Cache lookup ───────────────────────────────────────────────────

async function getCachedBriefing(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  advisorType: AdvisorType,
  locationId: string | null,
): Promise<Record<string, unknown> | null> {
  let q = supabase
    .from('advisor_briefings')
    .select('*')
    .eq('org_id', orgId)
    .eq('advisor_type', advisorType)
    .gt('valid_until', new Date().toISOString())
    .order('generated_at', { ascending: false })
    .limit(1);

  if (locationId) {
    q = q.eq('location_id', locationId);
  } else {
    q = q.is('location_id', null);
  }

  const { data: rows } = await q;
  return rows && rows.length > 0 ? rows[0] : null;
}

// ── Cron warm handler ──────────────────────────────────────────────

async function handleCronWarm(
  supabase: ReturnType<typeof createClient>,
): Promise<Response> {
  const startTime = Date.now();
  const now = new Date();
  const summary = {
    orgs_checked: 0,
    orgs_skipped_not_6am: 0,
    orgs_skipped_no_tz: 0,
    briefings_warmed: 0,
    briefings_skipped_cached: 0,
    errors: [] as Array<{ org_id?: string; message: string }>,
  };

  try {
    // Fetch orgs that have at least one DM-role user
    const { data: orgs, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, timezone');

    if (orgErr) throw orgErr;
    if (!orgs?.length) {
      return jsonResponse({ ...summary, message: 'No organizations found' });
    }

    // Filter to orgs with DM-role users
    const { data: orgIdsWithDm } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .in('role', DM_ROLES);

    const dmOrgIds = new Set((orgIdsWithDm || []).map((r: { organization_id: string }) => r.organization_id));
    const eligibleOrgs = orgs.filter((o: { id: string }) => dmOrgIds.has(o.id));

    for (const org of eligibleOrgs) {
      summary.orgs_checked++;

      try {
        if (!org.timezone) {
          summary.orgs_skipped_no_tz++;
          continue;
        }

        // Check if org-local hour is 6 AM
        if (!isSixAm(org.timezone, now)) {
          summary.orgs_skipped_not_6am++;
          continue;
        }

        // Get locations for this org
        const { data: locations } = await supabase
          .from('locations')
          .select('id')
          .eq('organization_id', org.id);

        // Build list of (advisor_type, location_id) tuples to warm
        const tuples: Array<{ advisor_type: AdvisorType; location_id: string | null }> = [];

        for (const at of ADVISOR_TYPES) {
          // Portfolio-level (null location)
          tuples.push({ advisor_type: at, location_id: null });
          // Per-location
          for (const loc of locations || []) {
            tuples.push({ advisor_type: at, location_id: loc.id });
          }
        }

        for (const tuple of tuples) {
          try {
            // Check existing valid cache — skip if warm
            const existing = await getCachedBriefing(
              supabase,
              org.id,
              tuple.advisor_type,
              tuple.location_id,
            );

            if (existing) {
              summary.briefings_skipped_cached++;
              continue;
            }

            // Generate and insert
            const result = await generateBriefing(supabase, {
              org_id: org.id,
              advisor_type: tuple.advisor_type,
              location_id: tuple.location_id,
            });

            const genNow = new Date();
            const validUntil = new Date(genNow.getTime() + CACHE_LIFETIME_MS);

            const { error: insertErr } = await supabase
              .from('advisor_briefings')
              .insert({
                org_id: org.id,
                advisor_type: tuple.advisor_type,
                location_id: tuple.location_id,
                briefing_text: result.briefing_text,
                posture: result.posture,
                open_items: result.open_items,
                data_snapshot: result.data_snapshot,
                generated_at: genNow.toISOString(),
                valid_until: validUntil.toISOString(),
                template_version: result.template_version,
              });

            if (insertErr) {
              summary.errors.push({
                org_id: org.id,
                message: `Insert failed for ${tuple.advisor_type}/${tuple.location_id}: ${insertErr.message}`,
              });
            } else {
              summary.briefings_warmed++;
            }
          } catch (err) {
            summary.errors.push({
              org_id: org.id,
              message: `${tuple.advisor_type}/${tuple.location_id}: ${(err as Error).message}`,
            });
          }
        }
      } catch (err) {
        summary.errors.push({ org_id: org.id, message: (err as Error).message });
      }
    }
  } catch (err) {
    summary.errors.push({ message: `Fatal: ${(err as Error).message}` });
    return jsonResponse(summary, 500);
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `[advisor-briefing-cron] Complete: ${summary.orgs_checked} checked, ` +
    `${summary.briefings_warmed} warmed, ${summary.briefings_skipped_cached} cached, ` +
    `${summary.errors.length} errors, ${elapsed}ms`,
  );

  return jsonResponse({ ...summary, elapsed_ms: elapsed });
}

// ── Timezone helper ────────────────────────────────────────────────

function isSixAm(timezone: string, now: Date): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find((p) => p.type === 'hour');
    const hour = parseInt(hourPart?.value || '-1', 10);
    return hour === 6;
  } catch {
    console.warn(`[advisor-briefing-cron] Invalid timezone: ${timezone}`);
    return false;
  }
}

// ── JSON response helper ───────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
