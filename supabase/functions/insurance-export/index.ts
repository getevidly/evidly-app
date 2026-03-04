// ── GAP-08: Insurance Export API ─────────────────────────────────────
// Read-only structured API for insurance partners.
// Auth: Bearer token (API key hash lookup).
// Endpoints:
//   GET /insurance-export?endpoint=compliance-score&facility_id=X
//   GET /insurance-export?endpoint=inspection-history&facility_id=X&months=12
//   GET /insurance-export?endpoint=risk-summary&facility_id=X
// ──────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ApiKeyRecord {
  id: string;
  org_id: string;
  key_hash: string;
  label: string;
  permissions: string[];
  facility_scope: string[];
  expires_at: string | null;
  revoked_at: string | null;
}

// Simple SHA-256 hash for API key lookup
async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only GET allowed
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Auth: Bearer token ────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header');
  }

  const apiKey = authHeader.slice(7);
  const keyHash = await hashKey(apiKey);

  // Look up key
  const { data: keyRecord, error: keyError } = await supabase
    .from('insurance_api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .single();

  if (keyError || !keyRecord) {
    await logRequest(supabase, null, req, 401, 'INVALID_KEY');
    return jsonError(401, 'INVALID_KEY', 'API key not found');
  }

  const key = keyRecord as ApiKeyRecord;

  // Check revoked
  if (key.revoked_at) {
    await logRequest(supabase, key.id, req, 403, 'KEY_REVOKED');
    return jsonError(403, 'KEY_REVOKED', 'This API key has been revoked');
  }

  // Check expired
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    await logRequest(supabase, key.id, req, 403, 'KEY_EXPIRED');
    return jsonError(403, 'KEY_EXPIRED', 'This API key has expired');
  }

  // ── Parse endpoint ────────────────────────────────────────
  const url = new URL(req.url);
  const endpoint = url.searchParams.get('endpoint');
  const facilityId = url.searchParams.get('facility_id');

  if (!endpoint) {
    await logRequest(supabase, key.id, req, 400, 'MISSING_ENDPOINT');
    return jsonError(400, 'MISSING_ENDPOINT', 'Query parameter "endpoint" is required');
  }

  if (!facilityId) {
    await logRequest(supabase, key.id, req, 400, 'MISSING_FACILITY', 'Query parameter "facility_id" is required');
    return jsonError(400, 'MISSING_FACILITY', 'Query parameter "facility_id" is required');
  }

  // Check facility scope
  if (key.facility_scope.length > 0 && !key.facility_scope.includes(facilityId) && !key.facility_scope.includes('all')) {
    await logRequest(supabase, key.id, req, 403, 'FACILITY_NOT_IN_SCOPE');
    return jsonError(403, 'FACILITY_NOT_IN_SCOPE', 'API key does not have access to this facility');
  }

  // ── Route to handler ──────────────────────────────────────
  let result: Record<string, unknown>;

  try {
    switch (endpoint) {
      case 'compliance-score': {
        if (!key.permissions.includes('compliance_score')) {
          await logRequest(supabase, key.id, req, 403, 'PERMISSION_DENIED');
          return jsonError(403, 'PERMISSION_DENIED', 'API key lacks "compliance_score" permission');
        }
        result = await getComplianceScore(supabase, key.org_id, facilityId);
        break;
      }
      case 'inspection-history': {
        if (!key.permissions.includes('inspection_history')) {
          await logRequest(supabase, key.id, req, 403, 'PERMISSION_DENIED');
          return jsonError(403, 'PERMISSION_DENIED', 'API key lacks "inspection_history" permission');
        }
        const months = parseInt(url.searchParams.get('months') || '12', 10);
        result = await getInspectionHistory(supabase, key.org_id, facilityId, months);
        break;
      }
      case 'risk-summary': {
        if (!key.permissions.includes('risk_summary')) {
          await logRequest(supabase, key.id, req, 403, 'PERMISSION_DENIED');
          return jsonError(403, 'PERMISSION_DENIED', 'API key lacks "risk_summary" permission');
        }
        result = await getRiskSummary(supabase, key.org_id, facilityId);
        break;
      }
      default:
        await logRequest(supabase, key.id, req, 400, 'UNKNOWN_ENDPOINT');
        return jsonError(400, 'UNKNOWN_ENDPOINT', `Unknown endpoint: ${endpoint}`);
    }
  } catch (err) {
    console.error('Insurance export error:', err);
    await logRequest(supabase, key.id, req, 500, 'INTERNAL_ERROR');
    return jsonError(500, 'INTERNAL_ERROR', 'An internal error occurred');
  }

  // Log successful request
  await logRequest(supabase, key.id, req, 200, null);

  return new Response(
    JSON.stringify({
      data: result,
      meta: {
        facility_id: facilityId,
        endpoint,
        generated_at: new Date().toISOString(),
        api_version: '1.0',
      },
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

// ── Endpoint Handlers ───────────────────────────────────────

async function getComplianceScore(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  facilityId: string,
): Promise<Record<string, unknown>> {
  // Get latest compliance scores for facility
  const { data: scores } = await supabase
    .from('compliance_scores')
    .select('food_safety_score, facility_safety_score, overall_score, scored_at, scoring_method')
    .eq('org_id', orgId)
    .eq('location_id', facilityId)
    .order('scored_at', { ascending: false })
    .limit(1)
    .single();

  if (!scores) {
    return { status: 'no_data', message: 'No compliance scores found for this facility' };
  }

  return {
    overall_score: scores.overall_score,
    food_safety_score: scores.food_safety_score,
    facility_safety_score: scores.facility_safety_score,
    scoring_method: scores.scoring_method,
    as_of: scores.scored_at,
  };
}

async function getInspectionHistory(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  facilityId: string,
  months: number,
): Promise<Record<string, unknown>> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data: inspections } = await supabase
    .from('inspections')
    .select('id, inspection_date, inspector_name, score, result, violation_count, critical_count, created_at')
    .eq('org_id', orgId)
    .eq('location_id', facilityId)
    .gte('inspection_date', since.toISOString())
    .order('inspection_date', { ascending: false });

  return {
    facility_id: facilityId,
    period_months: months,
    inspection_count: inspections?.length || 0,
    inspections: (inspections || []).map(i => ({
      id: i.id,
      date: i.inspection_date,
      inspector: i.inspector_name,
      score: i.score,
      result: i.result,
      violations: i.violation_count,
      critical_violations: i.critical_count,
    })),
  };
}

async function getRiskSummary(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  facilityId: string,
): Promise<Record<string, unknown>> {
  // Get open corrective actions
  const { count: openCAs } = await supabase
    .from('corrective_actions')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('location_id', facilityId)
    .in('status', ['created', 'in_progress', 'assigned']);

  // Get open incidents
  const { count: openIncidents } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('location_id', facilityId)
    .in('status', ['open', 'investigating', 'action_required']);

  // Get overdue equipment
  const { count: overdueEquipment } = await supabase
    .from('equipment')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('location_id', facilityId)
    .lt('next_service_date', new Date().toISOString());

  // Get expired certs
  const { count: expiredCerts } = await supabase
    .from('employee_certifications')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('location_id', facilityId)
    .lt('expiration_date', new Date().toISOString());

  return {
    facility_id: facilityId,
    as_of: new Date().toISOString(),
    open_corrective_actions: openCAs || 0,
    open_incidents: openIncidents || 0,
    overdue_equipment_maintenance: overdueEquipment || 0,
    expired_certifications: expiredCerts || 0,
    risk_factors: [
      ...(openCAs && openCAs > 0 ? [`${openCAs} open corrective action(s)`] : []),
      ...(openIncidents && openIncidents > 0 ? [`${openIncidents} open incident(s)`] : []),
      ...(overdueEquipment && overdueEquipment > 0 ? [`${overdueEquipment} equipment item(s) with overdue maintenance`] : []),
      ...(expiredCerts && expiredCerts > 0 ? [`${expiredCerts} expired certification(s)`] : []),
    ],
  };
}

// ── Helpers ─────────────────────────────────────────────────

function jsonError(status: number, code: string, message: string): Response {
  return new Response(
    JSON.stringify({ error: message, code }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function logRequest(
  supabase: ReturnType<typeof createClient>,
  keyId: string | null,
  req: Request,
  statusCode: number,
  errorCode: string | null,
): Promise<void> {
  try {
    const url = new URL(req.url);
    await supabase.from('insurance_api_request_log').insert({
      api_key_id: keyId,
      endpoint: url.searchParams.get('endpoint') || 'unknown',
      method: req.method,
      status_code: statusCode,
      error_code: errorCode,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
      user_agent: req.headers.get('user-agent') || null,
    });
  } catch {
    // Fire-and-forget — never block the response
  }
}
