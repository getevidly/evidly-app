import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, PUBLIC_CORS_HEADERS } from '../_shared/cors.ts';

// ── Types ─────────────────────────────────────────────────

interface GenerateRequest {
  report_type: string;
  org_id?: string;
}

interface ReportSection {
  act: 'predict' | 'reduce' | 'prove';
  heading: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ContentJson {
  executive_summary: string;
  sections: ReportSection[];
  generated_at: string;
  org_name?: string;
}

// ── Helpers ───────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function supabaseClients(authHeader: string | null) {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const service = createClient(url, serviceKey);
  const authed = createClient(url, serviceKey, {
    global: { headers: { Authorization: authHeader || '' } },
  });
  return { service, authed };
}

// ── GET: public share_token lookup ────────────────────────

async function handleGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return jsonResponse({ error: 'Missing token parameter' }, 400, PUBLIC_CORS_HEADERS);
  }

  const { service } = supabaseClients(null);
  const { data, error } = await service
    .from('internal_reports')
    .select('id, report_type, title, period_start, period_end, status, content_json, share_token, share_expires, org_id, created_at')
    .eq('share_token', token)
    .in('status', ['ready', 'published'])
    .single();

  if (error || !data) {
    return jsonResponse({ error: 'Report not found' }, 404, PUBLIC_CORS_HEADERS);
  }

  // Check expiry
  if (data.share_expires && new Date(data.share_expires) < new Date()) {
    return jsonResponse({ error: 'Share link has expired' }, 410, PUBLIC_CORS_HEADERS);
  }

  // Fetch org name for co-branding
  let orgName: string | null = null;
  if (data.org_id) {
    const { data: org } = await service
      .from('organizations')
      .select('name')
      .eq('id', data.org_id)
      .single();
    orgName = org?.name || null;
  }

  return jsonResponse({
    report: {
      id: data.id,
      report_type: data.report_type,
      title: data.title,
      period_start: data.period_start,
      period_end: data.period_end,
      status: data.status,
      content_json: data.content_json,
      share_expires: data.share_expires,
      org_name: orgName,
      created_at: data.created_at,
    },
  }, 200, PUBLIC_CORS_HEADERS);
}

// ── POST: generate report ─────────────────────────────────

async function handlePost(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  const { service, authed } = supabaseClients(req.headers.get('Authorization'));
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  const { data: profile } = await service
    .from('user_profiles')
    .select('id, full_name, organization_id, organizations(id, name)')
    .eq('id', user.id)
    .single();
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404, corsHeaders);

  const payload: GenerateRequest = await req.json();
  const orgId = payload.org_id || profile.organization_id;
  if (!orgId) return jsonResponse({ error: 'No organization' }, 400, corsHeaders);

  // Verify user belongs to org
  if (orgId !== profile.organization_id) {
    return jsonResponse({ error: 'Organization mismatch' }, 403, corsHeaders);
  }

  const orgName = (profile as any).organizations?.name || 'Your Organization';

  const BUILDERS: Record<string, (svc: any, oid: string, on: string) => Promise<ContentJson>> = {
    client_compliance: buildComplianceReport,
    client_regulatory: buildRegulatoryReport,
    client_insurance: buildInsuranceReport,
    client_executive: buildExecutiveReport,
  };

  const builder = BUILDERS[payload.report_type];
  if (!builder) {
    return jsonResponse({ error: 'Unsupported report type for wave 1' }, 400, corsHeaders);
  }

  // Insert draft row
  const shareToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const periodEnd = now.toISOString().split('T')[0];

  const { data: report, error: insertErr } = await service
    .from('internal_reports')
    .insert({
      report_type: payload.report_type,
      title: `${titleFor(payload.report_type)} — ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      period_start: periodStart,
      period_end: periodEnd,
      org_id: orgId,
      generated_by: profile.full_name || user.email,
      status: 'generating',
      share_token: shareToken,
      share_expires: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (insertErr || !report) {
    return jsonResponse({ error: insertErr?.message || 'Failed to create report' }, 500, corsHeaders);
  }

  // Build content
  try {
    const content = await builder(service, orgId, orgName);

    await service
      .from('internal_reports')
      .update({ content_json: content, status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', report.id);

    return jsonResponse({
      success: true,
      report: {
        id: report.id,
        report_type: report.report_type,
        title: report.title,
        share_token: shareToken,
        share_url: `${Deno.env.get('APP_URL') || 'https://app.getevidly.com'}/reports/view/${shareToken}`,
        status: 'ready',
      },
    }, 200, corsHeaders);
  } catch (err) {
    // Mark as draft on failure so it can be retried
    await service
      .from('internal_reports')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('id', report.id);

    return jsonResponse({ error: (err as Error).message || 'Generation failed' }, 500, corsHeaders);
  }
}

// ── Title mapping ─────────────────────────────────────────

function titleFor(reportType: string): string {
  const MAP: Record<string, string> = {
    client_compliance: 'Food Safety Compliance Summary',
    client_regulatory: 'HACCP Plan & Active Managerial Control',
    client_insurance: 'PSE Compliance Summary',
    client_executive: 'Insurance Package',
  };
  return MAP[reportType] || 'Report';
}

// ══════════════════════════════════════════════════════════
// CONTENT BUILDERS
// ══════════════════════════════════════════════════════════

// ── 1. Food Safety Compliance Summary (client_compliance) ─

async function buildComplianceReport(svc: any, orgId: string, orgName: string): Promise<ContentJson> {
  // Fetch inspection reports
  const { data: inspections } = await svc
    .from('inspection_reports')
    .select('id, location_id, inspection_date, score, inspector_name, violation_count, status')
    .eq('organization_id', orgId)
    .order('inspection_date', { ascending: false })
    .limit(20);

  const inspectionList = inspections || [];
  const totalInspections = inspectionList.length;
  const avgScore = totalInspections > 0
    ? Math.round(inspectionList.reduce((sum: number, i: any) => sum + (i.score || 0), 0) / totalInspections)
    : null;
  const totalViolations = inspectionList.reduce((sum: number, i: any) => sum + (i.violation_count || 0), 0);

  // Fetch corrective actions
  const { data: correctives } = await svc
    .from('corrective_actions')
    .select('id, status')
    .eq('organization_id', orgId);
  const correctiveList = correctives || [];
  const openCorrectives = correctiveList.filter((c: any) => c.status === 'open' || c.status === 'in_progress').length;
  const closedCorrectives = correctiveList.filter((c: any) => c.status === 'closed' || c.status === 'completed').length;

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'Inspection Readiness Assessment',
      body: totalInspections > 0
        ? `${orgName} has ${totalInspections} inspection${totalInspections !== 1 ? 's' : ''} on record${avgScore ? ` with an average result of ${avgScore}` : ''}. ${totalViolations > 0 ? `A total of ${totalViolations} violation${totalViolations !== 1 ? 's' : ''} were identified across these inspections.` : 'No violations were identified.'} This data identifies where the next inspection is likely to focus.`
        : `${orgName} has no inspection records on file yet. Adding inspection results helps identify where the next county evaluation is likely to focus.`,
      data: { total_inspections: totalInspections, avg_score: avgScore, total_violations: totalViolations },
    },
    {
      act: 'reduce',
      heading: 'Corrective Action Progress',
      body: correctiveList.length > 0
        ? `${closedCorrectives} corrective action${closedCorrectives !== 1 ? 's' : ''} resolved. ${openCorrectives > 0 ? `${openCorrectives} remain open and should be addressed before the next evaluation.` : 'All corrective actions are closed — no outstanding items.'}`
        : `No corrective actions have been logged yet. When violations are identified, documenting corrective actions here reduces repeat findings.`,
      data: { open: openCorrectives, closed: closedCorrectives },
    },
    {
      act: 'prove',
      heading: 'Documentation & Evidence',
      body: `This report serves as a dated record of ${orgName}'s food safety compliance posture. ${totalInspections > 0 ? `${totalInspections} inspection record${totalInspections !== 1 ? 's' : ''} and ${correctiveList.length} corrective action${correctiveList.length !== 1 ? 's' : ''} are on file.` : 'Building inspection and corrective action records strengthens your documentation for any county inquiry.'}`,
      data: { inspection_count: totalInspections, corrective_count: correctiveList.length },
    },
  ];

  return {
    executive_summary: totalInspections > 0
      ? `Food safety compliance summary for ${orgName}. ${totalInspections} inspection${totalInspections !== 1 ? 's' : ''} evaluated${avgScore ? `, average result ${avgScore}` : ''}. ${openCorrectives > 0 ? `${openCorrectives} open corrective action${openCorrectives !== 1 ? 's' : ''} remain.` : 'All corrective actions resolved.'}`
      : `Food safety compliance summary for ${orgName}. No inspections on record yet — this report will populate as inspection data is added.`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
  };
}

// ── 2. HACCP Plan & Active Managerial Control (client_regulatory) ─

async function buildRegulatoryReport(svc: any, orgId: string, orgName: string): Promise<ContentJson> {
  // Fetch HACCP plans
  const { data: plans } = await svc
    .from('haccp_plans')
    .select('id, name, status, last_reviewed')
    .eq('organization_id', orgId);
  const planList = plans || [];
  const activePlans = planList.filter((p: any) => p.status === 'active');

  // Fetch recent HACCP evidence (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: evidence } = await svc
    .from('vw_haccp_evidence')
    .select('evidence_id, evidence_type, result_passed, occurred_at, subject')
    .eq('organization_id', orgId)
    .gte('occurred_at', thirtyDaysAgo);
  const evidenceList = evidence || [];
  const totalEvidence = evidenceList.length;
  const passedEvidence = evidenceList.filter((e: any) => e.result_passed === true).length;
  const failedEvidence = evidenceList.filter((e: any) => e.result_passed === false).length;

  // Evidence breakdown by type
  const byType: Record<string, number> = {};
  for (const e of evidenceList) {
    byType[e.evidence_type] = (byType[e.evidence_type] || 0) + 1;
  }

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'HACCP Plan Status',
      body: planList.length > 0
        ? `${orgName} maintains ${planList.length} HACCP plan${planList.length !== 1 ? 's' : ''}, ${activePlans.length} currently active. ${activePlans.length > 0 ? `Active plans: ${activePlans.map((p: any) => p.name).join(', ')}.` : 'No plans are currently in active status — review is recommended.'}`
        : `${orgName} has no HACCP plans on file. Establishing a HACCP plan is a foundational step for demonstrating active managerial control.`,
      data: { total_plans: planList.length, active_plans: activePlans.length },
    },
    {
      act: 'reduce',
      heading: 'Monitoring Evidence (Last 30 Days)',
      body: totalEvidence > 0
        ? `${totalEvidence} monitoring record${totalEvidence !== 1 ? 's' : ''} collected over the last 30 days. ${passedEvidence} passed, ${failedEvidence} flagged for follow-up. ${Object.entries(byType).map(([t, c]) => `${t.replace(/_/g, ' ')}: ${c}`).join('; ')}.`
        : `No monitoring evidence recorded in the last 30 days. Regular temperature logs, checklist completions, and CCP checks build the evidence trail that county evaluators look for.`,
      data: { total: totalEvidence, passed: passedEvidence, failed: failedEvidence, by_type: byType },
    },
    {
      act: 'prove',
      heading: 'Active Managerial Control Documentation',
      body: `This report documents ${orgName}'s HACCP and active managerial control posture as of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. ${planList.length} plan${planList.length !== 1 ? 's' : ''} and ${totalEvidence} evidence record${totalEvidence !== 1 ? 's' : ''} are on file for the trailing 30-day window.`,
      data: { plans_count: planList.length, evidence_count: totalEvidence },
    },
  ];

  return {
    executive_summary: planList.length > 0
      ? `HACCP and active managerial control report for ${orgName}. ${activePlans.length} active plan${activePlans.length !== 1 ? 's' : ''}, ${totalEvidence} monitoring record${totalEvidence !== 1 ? 's' : ''} in the last 30 days (${failedEvidence > 0 ? `${failedEvidence} flagged` : 'none flagged'}).`
      : `HACCP report for ${orgName}. No plans on file yet — this report will populate as HACCP plans and monitoring records are added.`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
  };
}

// ── 3. PSE Compliance Summary (client_insurance) ──────────

async function buildInsuranceReport(svc: any, orgId: string, orgName: string): Promise<ContentJson> {
  // Fetch vendor service records (fire-safety safeguards)
  const { data: serviceRecords } = await svc
    .from('vendor_service_records')
    .select('id, safeguard_type, service_date, next_due_date, vendor_name, certificate_url')
    .eq('organization_id', orgId)
    .order('service_date', { ascending: false });
  const records = serviceRecords || [];

  // Group by safeguard type
  const bySafeguard: Record<string, any[]> = {};
  for (const r of records) {
    const key = r.safeguard_type || 'other';
    if (!bySafeguard[key]) bySafeguard[key] = [];
    bySafeguard[key].push(r);
  }

  // Check overdue services
  const now = new Date();
  const overdue = records.filter((r: any) => r.next_due_date && new Date(r.next_due_date) < now);
  const withCerts = records.filter((r: any) => r.certificate_url);

  // Fetch active service schedules
  const { data: schedules } = await svc
    .from('location_service_schedules')
    .select('id, service_type_code, frequency, next_due_date, is_active')
    .eq('organization_id', orgId)
    .eq('is_active', true);
  const scheduleList = schedules || [];

  const safeguardLabels: Record<string, string> = {
    hood_cleaning: 'Kitchen Exhaust Cleaning',
    fire_suppression: 'Fire Suppression',
    fire_alarm: 'Fire Alarm',
    sprinklers: 'Sprinklers',
  };

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'Protective Safeguard Evaluation',
      body: records.length > 0
        ? `${orgName} has ${records.length} service record${records.length !== 1 ? 's' : ''} across ${Object.keys(bySafeguard).length} safeguard categor${Object.keys(bySafeguard).length !== 1 ? 'ies' : 'y'}: ${Object.entries(bySafeguard).map(([k, v]) => `${safeguardLabels[k] || k} (${v.length})`).join(', ')}. ${overdue.length > 0 ? `${overdue.length} service${overdue.length !== 1 ? 's are' : ' is'} past due — these gaps may be flagged during carrier evaluation.` : 'All services are current.'}`
        : `${orgName} has no vendor service records on file. Documenting hood cleaning, fire suppression, alarm, and sprinkler services is essential for carrier evaluation.`,
      data: { total_records: records.length, by_safeguard: Object.fromEntries(Object.entries(bySafeguard).map(([k, v]) => [k, v.length])), overdue: overdue.length },
    },
    {
      act: 'reduce',
      heading: 'Service Schedule Compliance',
      body: scheduleList.length > 0
        ? `${scheduleList.length} active service schedule${scheduleList.length !== 1 ? 's' : ''} configured. ${overdue.length > 0 ? `Addressing the ${overdue.length} overdue service${overdue.length !== 1 ? 's' : ''} reduces the risk of a coverage gap.` : 'All scheduled services are on track.'}`
        : `No service schedules have been configured. Setting up recurring schedules ensures safeguard services stay current and reduces the chance of lapses.`,
      data: { active_schedules: scheduleList.length, overdue_count: overdue.length },
    },
    {
      act: 'prove',
      heading: 'Certificates & Documentation',
      body: `${withCerts.length} of ${records.length} service record${records.length !== 1 ? 's' : ''} have certificates attached. ${withCerts.length === records.length && records.length > 0 ? 'Full certificate coverage — ready for carrier review.' : records.length > 0 ? 'Attaching certificates to all service records strengthens the documentation package for carrier inquiries.' : 'Service records with attached certificates form the evidence package carriers evaluate.'}`,
      data: { with_certificates: withCerts.length, total_records: records.length },
    },
  ];

  return {
    executive_summary: records.length > 0
      ? `PSE compliance summary for ${orgName}. ${records.length} service record${records.length !== 1 ? 's' : ''} on file, ${overdue.length > 0 ? `${overdue.length} overdue` : 'none overdue'}. ${withCerts.length} certificate${withCerts.length !== 1 ? 's' : ''} attached.`
      : `PSE compliance summary for ${orgName}. No service records on file yet — this report will populate as vendor service data is added.`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
  };
}

// ── 4. Insurance Package (client_executive) ───────────────

async function buildExecutiveReport(svc: any, orgId: string, orgName: string): Promise<ContentJson> {
  // Compose from the other three data sets
  // Inspections
  const { data: inspections } = await svc
    .from('inspection_reports')
    .select('id, score, violation_count')
    .eq('organization_id', orgId);
  const inspList = inspections || [];
  const avgScore = inspList.length > 0
    ? Math.round(inspList.reduce((s: number, i: any) => s + (i.score || 0), 0) / inspList.length)
    : null;

  // HACCP plans
  const { data: plans } = await svc
    .from('haccp_plans')
    .select('id, status')
    .eq('organization_id', orgId);
  const activePlans = (plans || []).filter((p: any) => p.status === 'active').length;

  // Vendor service records
  const { data: serviceRecords } = await svc
    .from('vendor_service_records')
    .select('id, safeguard_type, next_due_date, certificate_url')
    .eq('organization_id', orgId);
  const svcRecords = serviceRecords || [];
  const overdue = svcRecords.filter((r: any) => r.next_due_date && new Date(r.next_due_date) < new Date()).length;
  const withCerts = svcRecords.filter((r: any) => r.certificate_url).length;

  // Corrective actions
  const { data: correctives } = await svc
    .from('corrective_actions')
    .select('id, status')
    .eq('organization_id', orgId);
  const openCorrectives = (correctives || []).filter((c: any) => c.status === 'open' || c.status === 'in_progress').length;

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'Risk Profile Overview',
      body: `${orgName} insurance package composition: ${inspList.length} inspection${inspList.length !== 1 ? 's' : ''} on file${avgScore ? ` (avg result ${avgScore})` : ''}, ${activePlans} active HACCP plan${activePlans !== 1 ? 's' : ''}, ${svcRecords.length} protective safeguard service record${svcRecords.length !== 1 ? 's' : ''}. ${overdue > 0 ? `${overdue} service${overdue !== 1 ? 's' : ''} past due.` : 'All services current.'} ${openCorrectives > 0 ? `${openCorrectives} open corrective action${openCorrectives !== 1 ? 's' : ''}.` : 'No open corrective actions.'}`,
      data: { inspections: inspList.length, avg_score: avgScore, active_plans: activePlans, service_records: svcRecords.length, overdue, open_correctives: openCorrectives },
    },
    {
      act: 'reduce',
      heading: 'Gap Identification',
      body: (() => {
        const gaps: string[] = [];
        if (inspList.length === 0) gaps.push('No inspection records — add past inspection results');
        if (activePlans === 0) gaps.push('No active HACCP plans — establish and activate a plan');
        if (overdue > 0) gaps.push(`${overdue} overdue safeguard service${overdue !== 1 ? 's' : ''} — schedule service to close the gap`);
        if (openCorrectives > 0) gaps.push(`${openCorrectives} open corrective action${openCorrectives !== 1 ? 's' : ''} — resolve to strengthen the package`);
        if (svcRecords.length > 0 && withCerts < svcRecords.length) gaps.push(`${svcRecords.length - withCerts} service record${svcRecords.length - withCerts !== 1 ? 's' : ''} missing certificates`);
        return gaps.length > 0
          ? `The following gaps were identified:\n${gaps.map(g => '- ' + g).join('\n')}`
          : `No significant gaps identified. ${orgName}'s documentation package is well-positioned for carrier evaluation.`;
      })(),
      data: { gap_count: 0 },
    },
    {
      act: 'prove',
      heading: 'Package Completeness',
      body: `This insurance package for ${orgName} contains ${inspList.length} inspection record${inspList.length !== 1 ? 's' : ''}, ${(plans || []).length} HACCP plan${(plans || []).length !== 1 ? 's' : ''}, ${svcRecords.length} safeguard service record${svcRecords.length !== 1 ? 's' : ''} (${withCerts} with certificates), and ${(correctives || []).length} corrective action record${(correctives || []).length !== 1 ? 's' : ''}. Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
      data: { inspections: inspList.length, plans: (plans || []).length, services: svcRecords.length, certificates: withCerts, correctives: (correctives || []).length },
    },
  ];

  return {
    executive_summary: `Insurance package for ${orgName}. ${inspList.length} inspection${inspList.length !== 1 ? 's' : ''}, ${activePlans} active HACCP plan${activePlans !== 1 ? 's' : ''}, ${svcRecords.length} safeguard record${svcRecords.length !== 1 ? 's' : ''}${overdue > 0 ? ` (${overdue} overdue)` : ''}. ${openCorrectives > 0 ? `${openCorrectives} open corrective action${openCorrectives !== 1 ? 's' : ''}.` : 'All corrective actions resolved.'}`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
  };
}

// ── Router ────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    const headers = origin ? getCorsHeaders(origin) : PUBLIC_CORS_HEADERS;
    return new Response(null, { status: 200, headers });
  }

  try {
    if (req.method === 'GET') return await handleGet(req);
    if (req.method === 'POST') return await handlePost(req);
    return jsonResponse({ error: 'Method not allowed' }, 405, PUBLIC_CORS_HEADERS);
  } catch (err) {
    console.error('[generate-report] Unhandled error:', err);
    return jsonResponse({ error: (err as Error).message || 'Internal error' }, 500, PUBLIC_CORS_HEADERS);
  }
});
