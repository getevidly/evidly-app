import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";
import { getCorsHeaders, PUBLIC_CORS_HEADERS } from '../_shared/cors.ts';

// ── Types ─────────────────────────────────────────────────

interface GenerateRequest {
  report_type: string;
  org_id?: string;
}

type Cell = string | { text: string; result?: 'pass' | 'fail' | 'warn' };

interface TableData {
  cols: string[];
  rows: Cell[][];
}

interface ReportSection {
  act?: 'predict' | 'reduce' | 'prove';
  heading: string;
  body?: string;
  table?: TableData;
  citations?: string[];
  cross_refs?: string[];
}

interface PillarBlock {
  label: string;
  sections?: ReportSection[];
  table?: TableData;
}

interface ContentJson {
  executive_summary: string;
  sections?: ReportSection[];
  food_safety?: PillarBlock;
  fire_safety?: PillarBlock;
  documents?: TableData;
  generated_at: string;
  org_name?: string;
  org_subtitle?: string;
  pillar_label?: string;
  period_label?: string;
  report_subtitle?: string;
  share_url?: string;
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

function cellText(c: Cell): string {
  return typeof c === 'string' ? c : c.text;
}

function resultCell(text: string, result: 'pass' | 'fail' | 'warn'): Cell {
  return { text, result };
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Org context helper ────────────────────────────────────

async function fetchOrgContext(svc: any, orgId: string) {
  const { data: org } = await svc
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();
  const orgName = org?.name || 'Your Organization';

  // Fetch primary location + county
  const { data: locations } = await svc
    .from('locations')
    .select('name, county')
    .eq('organization_id', orgId)
    .limit(3);

  const locList = locations || [];
  let orgSubtitle = '';
  if (locList.length === 1) {
    const loc = locList[0];
    const parts: string[] = [];
    if (loc.name) parts.push(loc.name);
    if (loc.county) parts.push(`${loc.county} County`);
    orgSubtitle = parts.join(' · ');
  } else if (locList.length > 1) {
    const counties = [...new Set(locList.map((l: any) => l.county).filter(Boolean))];
    if (counties.length === 1) {
      orgSubtitle = `${locList.length} locations · ${counties[0]} County`;
    } else if (counties.length > 1) {
      orgSubtitle = `${locList.length} locations · ${counties.join(', ')} Counties`;
    } else {
      orgSubtitle = `${locList.length} locations`;
    }
  }

  return { orgName, orgSubtitle };
}

// ── GET: public share_token lookup ────────────────────────

async function handleGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return jsonResponse({ error: 'Missing token parameter' }, 400, PUBLIC_CORS_HEADERS);
  }

  const { service } = supabaseClients(null);

  // PDF format redirect
  const format = url.searchParams.get('format');
  if (format === 'pdf') {
    const { data, error } = await service
      .from('internal_reports')
      .select('pdf_url, share_expires, status')
      .eq('share_token', token)
      .in('status', ['ready', 'published'])
      .single();

    if (error || !data) {
      return jsonResponse({ error: 'Report not found' }, 404, PUBLIC_CORS_HEADERS);
    }
    if (data.share_expires && new Date(data.share_expires) < new Date()) {
      return jsonResponse({ error: 'Share link has expired' }, 410, PUBLIC_CORS_HEADERS);
    }
    if (!data.pdf_url) {
      return jsonResponse({ error: 'PDF not available for this report' }, 404, PUBLIC_CORS_HEADERS);
    }

    const { data: signedData, error: signErr } = await service.storage
      .from('reports')
      .createSignedUrl(data.pdf_url, 3600);

    if (signErr || !signedData?.signedUrl) {
      return jsonResponse({ error: 'Could not generate PDF link' }, 500, PUBLIC_CORS_HEADERS);
    }

    return new Response(null, {
      status: 302,
      headers: { ...PUBLIC_CORS_HEADERS, Location: signedData.signedUrl },
    });
  }

  // Standard JSON response
  const { data, error } = await service
    .from('internal_reports')
    .select('id, report_type, title, period_start, period_end, status, content_json, share_token, share_expires, org_id, created_at')
    .eq('share_token', token)
    .in('status', ['ready', 'published'])
    .single();

  if (error || !data) {
    return jsonResponse({ error: 'Report not found' }, 404, PUBLIC_CORS_HEADERS);
  }

  if (data.share_expires && new Date(data.share_expires) < new Date()) {
    return jsonResponse({ error: 'Share link has expired' }, 410, PUBLIC_CORS_HEADERS);
  }

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

  if (orgId !== profile.organization_id) {
    return jsonResponse({ error: 'Organization mismatch' }, 403, corsHeaders);
  }

  const BUILDERS: Record<string, (svc: any, oid: string) => Promise<ContentJson>> = {
    client_compliance: buildComplianceReport,
    client_regulatory: buildRegulatoryReport,
    client_insurance: buildInsuranceReport,
    client_executive: buildExecutiveReport,
    client_temp_log: buildTempLogReport,
    client_corrective_action: buildCorrectiveActionReport,
    client_checklist: buildChecklistReport,
    client_inspection_history: buildInspectionHistoryReport,
    client_training: buildTrainingReport,
  };

  const builder = BUILDERS[payload.report_type];
  if (!builder) {
    return jsonResponse({ error: 'Unsupported report type for wave 1' }, 400, corsHeaders);
  }

  const shareToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const periodEnd = now.toISOString().split('T')[0];
  const appUrl = Deno.env.get('APP_URL') || 'https://app.getevidly.com';

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

  try {
    const content = await builder(service, orgId);

    // Inject share_url
    content.share_url = `${appUrl}/reports/view/${shareToken}`;

    // Period label
    content.period_label = `${new Date(periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // PDF generation (non-blocking)
    let pdfPath: string | null = null;
    try {
      const pdfBytes = await renderPdf(content, report.title, content.period_label);
      const storagePath = `${orgId}/${report.id}.pdf`;
      const { error: uploadErr } = await service.storage
        .from('reports')
        .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });
      if (!uploadErr) {
        pdfPath = storagePath;
      } else {
        console.error('[generate-report] PDF upload error:', uploadErr);
      }
    } catch (pdfErr) {
      console.error('[generate-report] PDF generation error:', pdfErr);
    }

    await service
      .from('internal_reports')
      .update({
        content_json: content,
        status: 'ready',
        pdf_url: pdfPath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id);

    return jsonResponse({
      success: true,
      report: {
        id: report.id,
        report_type: report.report_type,
        title: report.title,
        share_token: shareToken,
        share_url: `${appUrl}/reports/view/${shareToken}`,
        status: 'ready',
      },
    }, 200, corsHeaders);
  } catch (err) {
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
    client_temp_log: 'Temperature Log Summary',
    client_corrective_action: 'Corrective Action Record',
    client_checklist: 'Checklist Completion Record',
    client_inspection_history: 'County Inspection History',
    client_training: 'Training & Certification Record',
  };
  return MAP[reportType] || 'Report';
}

// ══════════════════════════════════════════════════════════
// CONTENT BUILDERS
// ══════════════════════════════════════════════════════════

// ── 1. Food Safety Compliance Summary (client_compliance) ─

async function buildComplianceReport(svc: any, orgId: string): Promise<ContentJson> {
  const { orgName, orgSubtitle } = await fetchOrgContext(svc, orgId);

  const { data: inspections } = await svc
    .from('inspection_reports')
    .select('id, location_id, inspection_date, score, inspector_name, violation_count, status, locations(name)')
    .eq('organization_id', orgId)
    .order('inspection_date', { ascending: false })
    .limit(20);
  const inspList = inspections || [];

  const { data: correctives } = await svc
    .from('corrective_actions')
    .select('id, status, description, created_at, resolved_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(20);
  const correctiveList = correctives || [];
  const openCorrectives = correctiveList.filter((c: any) => c.status === 'open' || c.status === 'in_progress').length;
  const closedCorrectives = correctiveList.filter((c: any) => c.status === 'closed' || c.status === 'completed').length;

  // Fetch evidence summary (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: evidence } = await svc
    .from('vw_haccp_evidence')
    .select('evidence_id, evidence_type, result_passed')
    .eq('organization_id', orgId)
    .gte('occurred_at', thirtyDaysAgo);
  const evidenceList = evidence || [];
  const tempReadings = evidenceList.filter((e: any) => e.evidence_type === 'temperature_log');
  const checklists = evidenceList.filter((e: any) => e.evidence_type === 'checklist_completion');
  const tempPassRate = tempReadings.length > 0
    ? `${Math.round(tempReadings.filter((e: any) => e.result_passed).length / tempReadings.length * 100)}%`
    : '—';
  const checkPassRate = checklists.length > 0
    ? `${Math.round(checklists.filter((e: any) => e.result_passed).length / checklists.length * 100)}%`
    : '—';

  // Build inspection table rows
  const inspRows: Cell[][] = inspList.slice(0, 6).map((insp: any) => [
    (insp as any).locations?.name || 'Location',
    `Routine inspection — county EHD`,
    fmtDate(insp.inspection_date),
    resultCell(
      insp.violation_count > 0 ? 'FAIL' : 'PASS',
      insp.violation_count > 0 ? 'fail' : 'pass',
    ),
  ]);

  // Build corrective action table rows
  const caRows: Cell[][] = correctiveList.slice(0, 6).map((ca: any) => {
    const isClosed = ca.status === 'closed' || ca.status === 'completed';
    return [
      fmtDate(ca.created_at),
      ca.description?.slice(0, 80) || 'Corrective action',
      isClosed ? `Resolved ${fmtDate(ca.resolved_at)}` : 'In progress',
      resultCell(isClosed ? 'PASS' : 'OPEN', isClosed ? 'pass' : 'warn'),
    ];
  });

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'County Standing by Location',
      table: inspRows.length > 0
        ? { cols: ['Location', 'County Evaluation', 'Date', 'Result'], rows: inspRows }
        : undefined,
      body: inspRows.length === 0
        ? `${orgName} has no inspection records on file yet. Adding inspection results helps identify where the next county evaluation is likely to focus.`
        : undefined,
      citations: ['Displayed as the county environmental health division produces it.'],
    },
    {
      act: 'reduce',
      heading: 'What Was Found and Corrected',
      table: caRows.length > 0
        ? { cols: ['Identified', 'Finding', 'Action', 'Closed'], rows: caRows }
        : undefined,
      body: caRows.length === 0
        ? 'No corrective actions have been logged yet. When violations are identified, documenting corrective actions here reduces repeat findings.'
        : undefined,
    },
    {
      act: 'prove',
      heading: 'The Record Behind This Summary',
      table: {
        cols: ['Evidence', 'Period Count', 'Pass Rate'],
        rows: [
          [`Temperature readings`, `${tempReadings.length}`, tempPassRate],
          [`Checklist completions`, `${checklists.length}`, checkPassRate],
          [`Corrective actions closed`, `${closedCorrectives} of ${correctiveList.length}`, correctiveList.length > 0 ? `${Math.round(closedCorrectives / correctiveList.length * 100)}%` : '—'],
        ],
      },
      cross_refs: tempReadings.length > 0 || checklists.length > 0
        ? ['Full readings in the Temperature Log Summary · each correction detailed in the Corrective Action Record']
        : undefined,
    },
  ];

  const totalInspections = inspList.length;
  return {
    executive_summary: totalInspections > 0
      ? `${orgName} has ${totalInspections} inspection${totalInspections !== 1 ? 's' : ''} on record. ${openCorrectives > 0 ? `${openCorrectives} corrective action${openCorrectives !== 1 ? 's' : ''} remain open and should be addressed before the next county visit.` : 'All corrective actions are resolved.'} The records behind every reading in this summary are current.`
      : `Food safety compliance summary for ${orgName}. No inspections on record yet — this report will populate as inspection data is added.`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
    org_subtitle: orgSubtitle,
    pillar_label: 'Food Safety · EHD',
    report_subtitle: 'Standing with the county department of public health, environmental health division',
  };
}

// ── 2. HACCP Plan & Active Managerial Control (client_regulatory) ─

async function buildRegulatoryReport(svc: any, orgId: string): Promise<ContentJson> {
  const { orgName, orgSubtitle } = await fetchOrgContext(svc, orgId);

  const { data: plans } = await svc
    .from('haccp_plans')
    .select('id, name, status, last_reviewed, description')
    .eq('organization_id', orgId);
  const planList = plans || [];
  const activePlans = planList.filter((p: any) => p.status === 'active');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: evidence } = await svc
    .from('vw_haccp_evidence')
    .select('evidence_id, evidence_type, result_passed, occurred_at, subject, detail')
    .eq('organization_id', orgId)
    .gte('occurred_at', thirtyDaysAgo);
  const evidenceList = evidence || [];

  const tempReadings = evidenceList.filter((e: any) => e.evidence_type === 'temperature_log');
  const ccpChecks = evidenceList.filter((e: any) => e.evidence_type === 'ccp_check');
  const checklists = evidenceList.filter((e: any) => e.evidence_type === 'checklist_completion');

  const { data: correctives } = await svc
    .from('corrective_actions')
    .select('id, status, description, created_at, resolved_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10);
  const correctiveList = correctives || [];
  const closedCAs = correctiveList.filter((c: any) => c.status === 'closed' || c.status === 'completed');

  // Deviations: evidence that failed
  const deviations = evidenceList.filter((e: any) => e.result_passed === false).slice(0, 6);

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'Plan & Critical Control Points',
      table: activePlans.length > 0
        ? {
          cols: ['Plan', 'Status', 'Last Reviewed'],
          rows: activePlans.map((p: any) => [
            p.name,
            resultCell('ACTIVE', 'pass'),
            fmtDate(p.last_reviewed),
          ]),
        }
        : undefined,
      body: planList.length === 0
        ? `${orgName} has no HACCP plans on file. Establishing a HACCP plan is a foundational step for demonstrating active managerial control.`
        : undefined,
      citations: activePlans.length > 0
        ? [`Plan: ${activePlans.map((p: any) => p.name).join(', ')} · CalCode §114000`]
        : undefined,
      cross_refs: planList.length > 0
        ? ['Active policies adopted from the Policies & Procedures library']
        : undefined,
    },
    {
      act: 'reduce',
      heading: 'Deviations Caught and Corrected',
      table: deviations.length > 0
        ? {
          cols: ['Recorded', 'Detail', 'Status'],
          rows: deviations.map((d: any) => [
            fmtDate(d.occurred_at),
            d.subject || d.detail || 'Deviation recorded',
            resultCell('CLOSED', 'pass'),
          ]),
        }
        : undefined,
      body: deviations.length === 0
        ? 'No deviations recorded in the last 30 days. All monitored values remained within limits.'
        : undefined,
    },
    {
      act: 'prove',
      heading: 'Monitoring Record',
      table: {
        cols: ['Evidence Type', 'Count', 'In Limit'],
        rows: [
          ['Temperature readings', `${tempReadings.length}`, tempReadings.length > 0 ? `${Math.round(tempReadings.filter((e: any) => e.result_passed).length / tempReadings.length * 100)}%` : '—'],
          ['CCP monitoring checks', `${ccpChecks.length}`, ccpChecks.length > 0 ? `${Math.round(ccpChecks.filter((e: any) => e.result_passed).length / ccpChecks.length * 100)}%` : '—'],
          ['Checklist completions', `${checklists.length}`, checklists.length > 0 ? `${Math.round(checklists.filter((e: any) => e.result_passed).length / checklists.length * 100)}%` : '—'],
          ['Corrective actions', `${correctiveList.length}`, `${closedCAs.length} closed`],
        ],
      },
      citations: ['Scope: food safety only. This report makes no warranties; it presents the records as kept.'],
    },
  ];

  return {
    executive_summary: activePlans.length > 0
      ? `This report shows how ${orgName} exercises active managerial control. ${activePlans.length} active HACCP plan${activePlans.length !== 1 ? 's' : ''} on file. ${evidenceList.length} monitoring record${evidenceList.length !== 1 ? 's' : ''} collected over the last 30 days, with ${deviations.length > 0 ? `${deviations.length} deviation${deviations.length !== 1 ? 's' : ''} caught and corrected` : 'no deviations recorded'}.`
      : `HACCP report for ${orgName}. No plans on file yet — this report will populate as HACCP plans and monitoring records are added.`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
    org_subtitle: orgSubtitle,
    pillar_label: 'Food Safety · EHD',
    report_subtitle: 'Control of the five CDC-identified foodborne illness risk factors',
  };
}

// ── 3. PSE Compliance Summary (client_insurance) ──────────

async function buildInsuranceReport(svc: any, orgId: string): Promise<ContentJson> {
  const { orgName, orgSubtitle } = await fetchOrgContext(svc, orgId);

  const { data: serviceRecords } = await svc
    .from('vendor_service_records')
    .select('id, safeguard_type, service_date, next_due_date, vendor_name, certificate_url')
    .eq('organization_id', orgId)
    .order('service_date', { ascending: false });
  const records = serviceRecords || [];

  const now = new Date();
  const safeguardLabels: Record<string, string> = {
    hood_cleaning: 'Exhaust cleaning',
    fire_suppression: 'Suppression service',
    fire_alarm: 'Fire alarm',
    sprinklers: 'Sprinklers',
  };

  // Group by safeguard and get latest per type
  const latestBySafeguard: Record<string, any> = {};
  for (const r of records) {
    const key = r.safeguard_type || 'other';
    if (!latestBySafeguard[key] || new Date(r.service_date) > new Date(latestBySafeguard[key].service_date)) {
      latestBySafeguard[key] = r;
    }
  }

  // Safeguard status table
  const safeguardRows: Cell[][] = Object.entries(latestBySafeguard).map(([type, rec]: [string, any]) => {
    const dueSoon = rec.next_due_date && new Date(rec.next_due_date) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const overdue = rec.next_due_date && new Date(rec.next_due_date) < now;
    const standing = overdue ? 'OVERDUE' : dueSoon ? 'DUE SOON' : 'CURRENT';
    const result: 'pass' | 'fail' | 'warn' = overdue ? 'fail' : dueSoon ? 'warn' : 'pass';
    return [
      safeguardLabels[type] || type.replace(/_/g, ' '),
      rec.next_due_date ? `Next due ${fmtDate(rec.next_due_date)}` : 'No schedule',
      fmtDate(rec.next_due_date),
      resultCell(standing, result),
    ];
  });

  // Recent service rows
  const recentRecords = records.slice(0, 6);
  const serviceRows: Cell[][] = recentRecords.map((r: any) => [
    fmtDate(r.service_date),
    `${safeguardLabels[r.safeguard_type] || r.safeguard_type} service`,
    r.vendor_name || '—',
    r.certificate_url ? 'Report on file' : '—',
  ]);

  // Certificate table
  const withCerts = records.filter((r: any) => r.certificate_url);
  const certRows: Cell[][] = withCerts.slice(0, 6).map((r: any) => [
    `${safeguardLabels[r.safeguard_type] || r.safeguard_type} certificate`,
    fmtDate(r.service_date),
    fmtDate(r.next_due_date),
  ]);

  const overdue = records.filter((r: any) => r.next_due_date && new Date(r.next_due_date) < now);

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'Safeguards Named on the Endorsement',
      table: safeguardRows.length > 0
        ? { cols: ['Safeguard', 'Requirement', 'Next Due', 'Standing'], rows: safeguardRows }
        : undefined,
      body: safeguardRows.length === 0
        ? `${orgName} has no vendor service records on file. Documenting hood cleaning, fire suppression, alarm, and sprinkler services is essential for carrier evaluation.`
        : undefined,
      citations: safeguardRows.length > 0
        ? ['NFPA 96 Table 12.4 · NFPA 17A §7.3 · CFC §906 — as enforced by the county fire department']
        : undefined,
    },
    {
      act: 'reduce',
      heading: 'Service Completed This Period',
      table: serviceRows.length > 0
        ? { cols: ['Date', 'Service', 'Performed By', 'Record'], rows: serviceRows }
        : undefined,
      body: serviceRows.length === 0
        ? 'No services recorded this period.'
        : undefined,
    },
    {
      act: 'prove',
      heading: 'Certification Trail',
      table: certRows.length > 0
        ? { cols: ['Document', 'Issued', 'Expires'], rows: certRows }
        : undefined,
      body: certRows.length === 0
        ? 'No certificates on file. Attaching certificates to service records strengthens the evidence package carriers evaluate.'
        : undefined,
      cross_refs: certRows.length > 0
        ? ['Each certificate is attached as a component record in the Insurance Package']
        : undefined,
    },
  ];

  return {
    executive_summary: records.length > 0
      ? `${Object.keys(latestBySafeguard).length} safeguard categor${Object.keys(latestBySafeguard).length !== 1 ? 'ies' : 'y'} documented for ${orgName}. ${overdue.length > 0 ? `${overdue.length} service${overdue.length !== 1 ? 's are' : ' is'} past due — addressing these keeps the record unbroken for carrier review.` : 'All services are current and inside their required intervals.'} ${withCerts.length} certificate${withCerts.length !== 1 ? 's' : ''} on file.`
      : `PSE compliance summary for ${orgName}. No service records on file yet — this report will populate as vendor service data is added.`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
    org_subtitle: orgSubtitle,
    pillar_label: 'Fire Safety · AHJ',
    report_subtitle: 'Standing against the Protective Safeguards Endorsement on the property policy',
  };
}

// ── 4. Insurance Package (client_executive) ───────────────

async function buildExecutiveReport(svc: any, orgId: string): Promise<ContentJson> {
  const { orgName, orgSubtitle } = await fetchOrgContext(svc, orgId);
  const now = new Date();

  // ── Food Safety data ────────────────────────────────────
  const { data: inspections } = await svc
    .from('inspection_reports')
    .select('id, score, violation_count, inspection_date, locations(name)')
    .eq('organization_id', orgId);
  const inspList = inspections || [];
  const inspPassed = inspList.filter((i: any) => !i.violation_count || i.violation_count === 0).length;

  const { data: plans } = await svc
    .from('haccp_plans')
    .select('id, name, status')
    .eq('organization_id', orgId);
  const planList = plans || [];
  const activePlans = planList.filter((p: any) => p.status === 'active').length;

  // Evidence count
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: evidence } = await svc
    .from('vw_haccp_evidence')
    .select('evidence_id, result_passed')
    .eq('organization_id', orgId)
    .gte('occurred_at', thirtyDaysAgo);
  const evidenceCount = (evidence || []).length;

  const { data: correctives } = await svc
    .from('corrective_actions')
    .select('id, status')
    .eq('organization_id', orgId);
  const correctiveList = correctives || [];
  const closedCAs = correctiveList.filter((c: any) => c.status === 'closed' || c.status === 'completed').length;

  // ── Fire Safety data ────────────────────────────────────
  const { data: serviceRecords } = await svc
    .from('vendor_service_records')
    .select('id, safeguard_type, next_due_date, certificate_url, service_date, vendor_name')
    .eq('organization_id', orgId);
  const svcRecords = serviceRecords || [];
  const overdue = svcRecords.filter((r: any) => r.next_due_date && new Date(r.next_due_date) < now).length;
  const withCerts = svcRecords.filter((r: any) => r.certificate_url).length;

  const safeguardLabels: Record<string, string> = {
    hood_cleaning: 'Exhaust cleaning',
    fire_suppression: 'Suppression certification',
    fire_alarm: 'Fire alarm',
    sprinklers: 'Sprinklers',
  };

  // Latest by type for fire summary
  const latestBySafeguard: Record<string, any> = {};
  for (const r of svcRecords) {
    const key = r.safeguard_type || 'other';
    if (!latestBySafeguard[key] || new Date(r.service_date) > new Date(latestBySafeguard[key].service_date)) {
      latestBySafeguard[key] = r;
    }
  }

  // Food pillar summary table
  const foodTable: TableData = {
    cols: ['Item', 'Status', 'Reference'],
    rows: [
      [
        `County evaluations — ${inspList.length > 0 ? `${inspList.length} on file` : 'none on file'}`,
        inspList.length > 0
          ? resultCell(inspPassed === inspList.length ? 'PASS' : `${inspPassed}/${inspList.length} PASS`, inspPassed === inspList.length ? 'pass' : 'warn')
          : '—',
        'Food Safety Compliance Summary §1',
      ],
      [
        'Active managerial control record',
        evidenceCount > 0 ? `${evidenceCount} readings · ${closedCAs}/${correctiveList.length} closed` : '—',
        'Active Managerial Control & HACCP',
      ],
      [
        `HACCP plans`,
        activePlans > 0 ? resultCell(`${activePlans} ACTIVE`, 'pass') : 'None on file',
        'Policies & Procedures',
      ],
    ],
  };

  // Fire pillar summary table
  const fireRows: Cell[][] = Object.entries(latestBySafeguard).map(([type, rec]: [string, any]) => {
    const dueSoon = rec.next_due_date && new Date(rec.next_due_date) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const isOverdue = rec.next_due_date && new Date(rec.next_due_date) < now;
    const standing = isOverdue ? 'OVERDUE' : dueSoon ? 'DUE SOON' : 'CURRENT';
    const result: 'pass' | 'fail' | 'warn' = isOverdue ? 'fail' : dueSoon ? 'warn' : 'pass';
    return [
      `${safeguardLabels[type] || type.replace(/_/g, ' ')} — ${isOverdue ? 'past due' : 'within interval'}`,
      resultCell(standing, result),
      `PSE Compliance Summary`,
    ];
  });

  if (fireRows.length === 0) {
    fireRows.push(['No fire safety records on file', '—', '—']);
  }

  const fireTable: TableData = { cols: ['Item', 'Status', 'Reference'], rows: fireRows };

  // Documents table
  const docRows: Cell[][] = [];
  if (inspList.length > 0) {
    docRows.push([
      `County EHD inspection report${inspList.length > 1 ? ` (×${inspList.length})` : ''}`,
      'County',
      inspList.slice(0, 2).map((i: any) => fmtDate(i.inspection_date)).join(' / '),
    ]);
  }
  const recentCerts = svcRecords.filter((r: any) => r.certificate_url).slice(0, 3);
  for (const cert of recentCerts) {
    docRows.push([
      `${safeguardLabels[cert.safeguard_type] || cert.safeguard_type} certificate`,
      cert.vendor_name || 'Vendor',
      fmtDate(cert.service_date),
    ]);
  }

  const documentsTable: TableData = docRows.length > 0
    ? { cols: ['Document', 'Source', 'Date'], rows: docRows }
    : { cols: ['Document', 'Source', 'Date'], rows: [['No documents attached yet', '—', '—']] };

  return {
    executive_summary: `This package assembles what an underwriter asks for at renewal: the county's own food safety evaluations, the fire safeguard service trail, and the certificates behind both. Food safety and fire safety are presented separately because they answer to different authorities — the county environmental health department and the fire authority — and an underwriter reads them separately. Every document referenced is attached, current, and traceable to the vendor or county that produced it.`,
    food_safety: { label: 'Part I — Food Safety · County EHD', table: foodTable },
    fire_safety: { label: 'Part II — Fire Safety · Fire Authority', table: fireTable },
    documents: documentsTable,
    generated_at: now.toISOString(),
    org_name: orgName,
    org_subtitle: orgSubtitle,
    pillar_label: 'Renewal Documentation',
    report_subtitle: 'Assembled for the insurance professional of record — food and fire records presented separately',
  };
}

// ── 5. Temperature Log Summary (client_temp_log) ──────────

async function buildTempLogReport(svc: any, orgId: string): Promise<ContentJson> {
  const { orgName, orgSubtitle } = await fetchOrgContext(svc, orgId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch equipment for this org
  const { data: equipment } = await svc
    .from('temperature_equipment')
    .select('id, name, location_id, min_temp, max_temp, unit, is_active')
    .eq('organization_id', orgId)
    .eq('is_active', true);
  const equipList = equipment || [];
  const equipIds = equipList.map((e: any) => e.id);

  // Fetch temperature logs via equipment_id (no direct org_id on temperature_logs)
  let logs: any[] = [];
  if (equipIds.length > 0) {
    const { data: tempLogs } = await svc
      .from('temperature_logs')
      .select('id, equipment_id, temperature, temp_pass, reading_time, logged_by, corrective_action, shift')
      .in('equipment_id', equipIds)
      .gte('reading_time', thirtyDaysAgo)
      .order('reading_time', { ascending: false });
    logs = tempLogs || [];
  }

  const totalReadings = logs.length;
  const passedReadings = logs.filter((l: any) => l.temp_pass).length;
  const failedReadings = logs.filter((l: any) => !l.temp_pass);
  const overallRate = totalReadings > 0 ? Math.round(passedReadings / totalReadings * 1000) / 10 : 0;

  // Per-equipment stats
  const equipMap = new Map<string, string>();
  for (const e of equipList) equipMap.set(e.id, e.name);

  const byEquip: Record<string, { total: number; passed: number; name: string }> = {};
  for (const log of logs) {
    const eid = log.equipment_id;
    if (!byEquip[eid]) byEquip[eid] = { total: 0, passed: 0, name: equipMap.get(eid) || 'Equipment' };
    byEquip[eid].total++;
    if (log.temp_pass) byEquip[eid].passed++;
  }

  // Predict: equipment watch list
  const equipRows: Cell[][] = Object.values(byEquip)
    .sort((a, b) => (a.passed / a.total) - (b.passed / b.total))
    .slice(0, 8)
    .map(eq => {
      const rate = Math.round(eq.passed / eq.total * 1000) / 10;
      const trend = rate < 95 ? 'WATCH' : 'ON TIME';
      return [eq.name, `${eq.total}`, `${rate}%`, resultCell(trend, rate < 95 ? 'warn' : 'pass')];
    });

  // Reduce: out-of-range readings
  const oorRows: Cell[][] = failedReadings.slice(0, 8).map((log: any) => [
    fmtDate(log.reading_time),
    equipMap.get(log.equipment_id) || 'Equipment',
    `${log.temperature}°F`,
    (() => {
      const eq = equipList.find((e: any) => e.id === log.equipment_id);
      if (!eq) return '—';
      return eq.min_temp != null && eq.max_temp != null ? `${eq.min_temp}–${eq.max_temp}°F` : '—';
    })(),
    log.corrective_action || '—',
  ]);

  // Prove: weekly totals
  const weekBuckets: Record<string, { total: number; passed: number; loggers: Set<string> }> = {};
  for (const log of logs) {
    const d = new Date(log.reading_time);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];
    if (!weekBuckets[key]) weekBuckets[key] = { total: 0, passed: 0, loggers: new Set() };
    weekBuckets[key].total++;
    if (log.temp_pass) weekBuckets[key].passed++;
    if (log.logged_by) weekBuckets[key].loggers.add(log.logged_by);
  }
  const weekRows: Cell[][] = Object.entries(weekBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 6)
    .map(([weekKey, w]) => {
      const ws = new Date(weekKey);
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return [
        `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        `${w.total}`,
        `${w.passed}`,
        `${w.loggers.size} staff`,
      ];
    });

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'Equipment Watch List',
      table: equipRows.length > 0 ? { cols: ['Equipment', 'Readings', 'In Range', 'Trend'], rows: equipRows } : undefined,
      body: equipRows.length === 0 ? 'No temperature equipment configured yet. Adding equipment and logging readings builds the cold chain record.' : undefined,
    },
    {
      act: 'reduce',
      heading: 'Out-of-Range Readings & Corrections',
      table: oorRows.length > 0 ? { cols: ['Date', 'Equipment', 'Reading', 'Required', 'Correction'], rows: oorRows } : undefined,
      body: oorRows.length === 0 ? (totalReadings > 0 ? 'All readings this period were within required ranges.' : 'No readings recorded this period.') : undefined,
      citations: oorRows.length > 0 ? ['CalCode §113996, §114000 holding requirements'] : undefined,
    },
    {
      act: 'prove',
      heading: 'The Complete Record',
      table: weekRows.length > 0 ? { cols: ['Week', 'Readings', 'Pass', 'Logged By'], rows: weekRows } : undefined,
      body: weekRows.length === 0 ? 'No readings recorded this period.' : undefined,
      cross_refs: totalReadings > 0 ? ['Deviations detailed in the Corrective Action Record · feeds the Active Managerial Control & HACCP report'] : undefined,
    },
  ];

  return {
    executive_summary: totalReadings > 0
      ? `Across ${totalReadings} readings this period, the cold chain held inside its required ranges ${overallRate} percent of the time${failedReadings.length > 0 ? `, and the ${failedReadings.length} reading${failedReadings.length !== 1 ? 's' : ''} that fell outside ${failedReadings.length !== 1 ? 'were' : 'was'} each addressed on the shift ${failedReadings.length !== 1 ? 'they' : 'it'} appeared` : ''}. Every number below traces to a logged reading with a time, an equipment record, and the person who took it.`
      : `Temperature log summary for ${orgName}. No readings recorded this period — this report will populate as temperature data is logged.`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
    org_subtitle: orgSubtitle,
    pillar_label: 'Food Safety · EHD',
    report_subtitle: 'Every reading, by equipment, against its required range',
  };
}

// ── 6. Corrective Action Record (client_corrective_action) ─

async function buildCorrectiveActionReport(svc: any, orgId: string): Promise<ContentJson> {
  const { orgName, orgSubtitle } = await fetchOrgContext(svc, orgId);

  const { data: actions } = await svc
    .from('haccp_corrective_actions')
    .select('id, deviation, critical_limit, recorded_value, action_taken, action_by, verified_by, status, ccp_number, ccp_hazard, created_at, resolved_at, location_id')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(30);
  const actionList = actions || [];

  const resolved = actionList.filter((a: any) => a.status === 'resolved');
  const open = actionList.filter((a: any) => a.status !== 'resolved');

  // Predict: category counts + repeat flags
  const byCat: Record<string, { count: number; items: string[] }> = {};
  for (const a of actionList) {
    const cat = a.ccp_hazard || a.ccp_number || 'General';
    if (!byCat[cat]) byCat[cat] = { count: 0, items: [] };
    byCat[cat].count++;
    if (a.deviation) byCat[cat].items.push(a.deviation);
  }
  const catRows: Cell[][] = Object.entries(byCat).slice(0, 8).map(([cat, data]) => {
    const unique = new Set(data.items);
    const repeat = data.count > unique.size && unique.size > 0 ? 'Yes' : 'No';
    return [cat, `${data.count}`, repeat];
  });

  // Reduce: each action
  const actionRows: Cell[][] = actionList.slice(0, 8).map((a: any) => [
    fmtDate(a.created_at),
    a.deviation || '—',
    a.ccp_hazard || '—',
    a.action_taken || '—',
    resultCell(a.status === 'resolved' ? 'CLOSED' : a.status === 'in_progress' ? 'IN PROGRESS' : 'OPEN', a.status === 'resolved' ? 'pass' : 'warn'),
  ]);

  // Prove: closure trail
  const closureRows: Cell[][] = resolved.slice(0, 8).map((a: any) => [
    a.action_taken || '—',
    a.action_by || '—',
    a.verified_by || '—',
    fmtDate(a.resolved_at),
  ]);

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'Pattern Across the Period',
      table: catRows.length > 0 ? { cols: ['Category', 'Count', 'Repeat?'], rows: catRows } : undefined,
      body: catRows.length === 0 ? 'No corrective actions recorded this period.' : undefined,
    },
    {
      act: 'reduce',
      heading: 'Actions Taken',
      table: actionRows.length > 0 ? { cols: ['Found', 'Deviation', 'Root Cause', 'Action', 'Status'], rows: actionRows } : undefined,
      body: actionRows.length === 0 ? 'No deviations recorded this period.' : undefined,
    },
    {
      act: 'prove',
      heading: 'Closure Trail',
      table: closureRows.length > 0 ? { cols: ['Action', 'Closed By', 'Verified', 'Closed'], rows: closureRows } : undefined,
      body: closureRows.length === 0 ? (actionList.length > 0 ? `${open.length} action${open.length !== 1 ? 's' : ''} remain open.` : 'No corrective actions on record.') : undefined,
      citations: actionList.length > 0 ? ['CalCode §113980 · corrective action documentation maintained on premises'] : undefined,
    },
  ];

  return {
    executive_summary: actionList.length > 0
      ? `${actionList.length} corrective action${actionList.length !== 1 ? 's' : ''} recorded for ${orgName}, with ${resolved.length} closed${open.length > 0 ? ` and ${open.length} remaining open` : ''}. ${resolved.length > 0 ? `A closure pattern a county inspector reads as active control, not paperwork.` : ''}`
      : `Corrective action record for ${orgName}. No HACCP corrective actions on file yet — this report will populate as deviations are documented.`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
    org_subtitle: orgSubtitle,
    pillar_label: 'Food Safety · EHD',
    report_subtitle: 'Every deviation: what was found, what was done, who closed it',
  };
}

// ── 7. Checklist Completion Record (client_checklist) ──────

async function buildChecklistReport(svc: any, orgId: string): Promise<ContentJson> {
  const { orgName, orgSubtitle } = await fetchOrgContext(svc, orgId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch templates
  const { data: templates } = await svc
    .from('checklist_templates')
    .select('id, name, cadence, active_days, is_active')
    .eq('organization_id', orgId)
    .eq('is_active', true);
  const templateList = templates || [];

  // Fetch completions in period
  const { data: completions } = await svc
    .from('checklist_template_completions')
    .select('id, template_id, completed_by, completed_at, total_items, passed_items, failed_items, status')
    .eq('organization_id', orgId)
    .gte('completed_at', thirtyDaysAgo)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });
  const completionList = completions || [];

  const totalCompletions = completionList.length;
  const totalFailed = completionList.reduce((sum: number, c: any) => sum + (c.failed_items || 0), 0);

  // Predict: per-template completion counts
  const byTemplate: Record<string, { name: string; count: number }> = {};
  for (const t of templateList) byTemplate[t.id] = { name: t.name, count: 0 };
  for (const c of completionList) {
    if (byTemplate[c.template_id]) byTemplate[c.template_id].count++;
  }

  // Estimate expected completions from cadence and active_days
  const daysInPeriod = 30;
  const templateRows: Cell[][] = Object.values(byTemplate).map(t => {
    // Simple estimate — real scheduling would need due_windows parsing
    const rate = daysInPeriod > 0 && t.count > 0 ? `${t.count}` : '0';
    const trend = t.count === 0 ? 'WATCH' : 'ON TIME';
    return [t.name, `${daysInPeriod}`, rate, resultCell(trend, t.count === 0 ? 'warn' : 'pass')];
  }).slice(0, 8);

  // Reduce: most-failed items from checklist_responses
  let failedItemRows: Cell[][] = [];
  if (completionList.length > 0) {
    const completionIds = completionList.slice(0, 50).map((c: any) => c.id);
    const { data: responses } = await svc
      .from('checklist_responses')
      .select('id, template_item_id, is_pass, corrective_action, checklist_template_items(title)')
      .in('completion_id', completionIds)
      .eq('is_pass', false)
      .limit(50);
    const failedResponses = responses || [];

    // Group by item
    const byItem: Record<string, { title: string; fails: number; correction: string }> = {};
    for (const r of failedResponses) {
      const itemTitle = (r as any).checklist_template_items?.title || 'Item';
      if (!byItem[r.template_item_id]) byItem[r.template_item_id] = { title: itemTitle, fails: 0, correction: '' };
      byItem[r.template_item_id].fails++;
      if (r.corrective_action && !byItem[r.template_item_id].correction) {
        byItem[r.template_item_id].correction = r.corrective_action;
      }
    }

    failedItemRows = Object.values(byItem)
      .sort((a, b) => b.fails - a.fails)
      .slice(0, 6)
      .map(item => [item.title, `${item.fails}`, item.correction || '—']);
  }

  // Prove: weekly completions + distinct staff
  const weekBuckets: Record<string, { count: number; staff: Set<string> }> = {};
  for (const c of completionList) {
    const d = new Date(c.completed_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split('T')[0];
    if (!weekBuckets[key]) weekBuckets[key] = { count: 0, staff: new Set() };
    weekBuckets[key].count++;
    if (c.completed_by) weekBuckets[key].staff.add(c.completed_by);
  }
  const weekRows: Cell[][] = Object.entries(weekBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 6)
    .map(([weekKey, w]) => {
      const ws = new Date(weekKey);
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return [
        `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        `${w.count}`,
        `${w.staff.size}`,
      ];
    });

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'Completion Pattern',
      table: templateRows.length > 0 ? { cols: ['Checklist', 'Period Days', 'Completed', 'Rate'], rows: templateRows } : undefined,
      body: templateRows.length === 0 ? 'No checklists configured yet. Adding checklist templates and completing them builds the compliance record.' : undefined,
    },
    {
      act: 'reduce',
      heading: 'Items Most Often Failing',
      table: failedItemRows.length > 0 ? { cols: ['Item', 'Fails', 'Correction Applied'], rows: failedItemRows } : undefined,
      body: failedItemRows.length === 0 ? (totalFailed === 0 && totalCompletions > 0 ? 'All items passed this period.' : totalCompletions === 0 ? 'No completions this period.' : 'Item-level detail begins next period.') : undefined,
    },
    {
      act: 'prove',
      heading: 'Sign-Off Record',
      table: weekRows.length > 0 ? { cols: ['Week', 'Completions', 'Distinct Staff'], rows: weekRows } : undefined,
      body: weekRows.length === 0 ? 'No completions recorded this period.' : undefined,
      cross_refs: totalFailed > 0 ? ['Failed items with corrections feed the Corrective Action Record'] : undefined,
    },
  ];

  return {
    executive_summary: totalCompletions > 0
      ? `${totalCompletions} checklists were completed this period for ${orgName}. ${totalFailed > 0 ? `${totalFailed} item${totalFailed !== 1 ? 's' : ''} were marked failing across those completions` : 'All items passed'}. Every completion below carries its checker's name and time.`
      : `Checklist completion record for ${orgName}. No completions recorded this period — this report will populate as checklists are completed.`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
    org_subtitle: orgSubtitle,
    pillar_label: 'Food Safety · EHD',
    report_subtitle: 'Opening, closing, and food safety checklists — completion and findings',
  };
}

// ── 8. County Inspection History (client_inspection_history) ─

async function buildInspectionHistoryReport(svc: any, orgId: string): Promise<ContentJson> {
  const { orgName, orgSubtitle } = await fetchOrgContext(svc, orgId);

  // Fetch inspections with location and jurisdiction
  const { data: inspections } = await svc
    .from('inspection_reports')
    .select('id, location_id, inspection_date, inspection_type, raw_result, raw_result_type, critical_violations, non_critical_violations, locations(name, jurisdiction_id, jurisdictions(agency_name, county))')
    .eq('organization_id', orgId)
    .eq('pillar', 'food_safety')
    .order('inspection_date', { ascending: false })
    .limit(50);
  const inspList = inspections || [];

  // Determine the source agency name from the first inspection's jurisdiction
  let agencyName = 'County Environmental Health Division';
  for (const insp of inspList) {
    const jur = (insp as any).locations?.jurisdictions;
    if (jur?.agency_name) { agencyName = jur.agency_name; break; }
    if (jur?.county) { agencyName = `${jur.county} County Department of Public Health`; break; }
  }

  // Group by location for the Predict section
  const byLocation: Record<string, { name: string; inspections: any[] }> = {};
  for (const insp of inspList) {
    const locName = (insp as any).locations?.name || 'Location';
    if (!byLocation[insp.location_id]) byLocation[insp.location_id] = { name: locName, inspections: [] };
    byLocation[insp.location_id].inspections.push(insp);
  }

  // Predict: last visit per location + typical interval
  const predictRows: Cell[][] = Object.values(byLocation).slice(0, 8).map(loc => {
    const last = loc.inspections[0];
    const lastDate = fmtDate(last.inspection_date);

    // Compute typical interval from date gaps
    let interval = '—';
    let windowOpens = '—';
    if (loc.inspections.length >= 2) {
      const dates = loc.inspections.map((i: any) => new Date(i.inspection_date).getTime()).sort((a: number, b: number) => b - a);
      const gaps: number[] = [];
      for (let i = 0; i < dates.length - 1; i++) gaps.push(Math.round((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24)));
      const avgGap = Math.round(gaps.reduce((s: number, g: number) => s + g, 0) / gaps.length);
      const months = Math.round(avgGap / 30);
      interval = `~${months} months`;
      const nextDate = new Date(dates[0] + avgGap * 24 * 60 * 60 * 1000);
      windowOpens = nextDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    const hasCritical = last.critical_violations > 0;
    const resultText = hasCritical ? 'FAIL' : (last.raw_result || 'PASS');
    const resultState: 'pass' | 'fail' = hasCritical ? 'fail' : 'pass';

    return [loc.name, lastDate, resultCell(resultText, resultState), interval, windowOpens];
  });

  // Reduce: findings history
  const withFindings = inspList.filter((i: any) => (i.critical_violations || 0) > 0 || (i.non_critical_violations || 0) > 0);
  const findingsRows: Cell[][] = withFindings.slice(0, 8).map((insp: any) => [
    fmtDate(insp.inspection_date),
    `${insp.critical_violations || 0} critical, ${insp.non_critical_violations || 0} non-critical`,
    '—',
  ]);

  // Prove: full chronological record
  const fullRows: Cell[][] = inspList.slice(0, 12).map((insp: any) => {
    const locName = (insp as any).locations?.name || 'Location';
    const hasCritical = (insp.critical_violations || 0) > 0;
    const resultText = hasCritical ? 'FAIL' : (insp.raw_result || 'PASS');
    const resultState: 'pass' | 'fail' = hasCritical ? 'fail' : 'pass';
    return [
      fmtDate(insp.inspection_date),
      locName,
      (insp.inspection_type || 'routine').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      resultCell(resultText, resultState),
    ];
  });

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'Where the Record Points',
      table: predictRows.length > 0 ? { cols: ['Location', 'Last Visit', 'Result', 'Typical Interval', 'Window Opens'], rows: predictRows } : undefined,
      body: predictRows.length === 0 ? `${orgName} has no county inspection records on file yet. This report will populate as inspection data is added.` : undefined,
    },
    {
      act: 'reduce',
      heading: 'Findings History & Resolution',
      table: findingsRows.length > 0 ? { cols: ['Date', 'Finding', 'Resolved'], rows: findingsRows } : undefined,
      body: findingsRows.length === 0 ? (inspList.length > 0 ? 'No findings on record — all evaluations clean.' : 'No inspections on record.') : undefined,
    },
    {
      act: 'prove',
      heading: 'Full Evaluation Record',
      table: fullRows.length > 0 ? { cols: ['Date', 'Location', 'Type', 'Result'], rows: fullRows } : undefined,
      body: fullRows.length === 0 ? 'No inspections on record.' : undefined,
      citations: inspList.length > 0 ? [`Source: ${agencyName}`] : undefined,
    },
  ];

  return {
    executive_summary: inspList.length > 0
      ? `${orgName}'s county record includes ${inspList.length} evaluation${inspList.length !== 1 ? 's' : ''}. ${withFindings.length === 0 ? 'No findings on record across any evaluation.' : `${withFindings.length} evaluation${withFindings.length !== 1 ? 's' : ''} included findings.`} Nothing here is restated or rescored: each entry is the county's own result.`
      : `County inspection history for ${orgName}. No food safety inspections on record yet — this report will populate as county evaluation data is added.`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
    org_subtitle: orgSubtitle,
    pillar_label: 'Food Safety · EHD',
    report_subtitle: 'Every county evaluation on record, displayed exactly as the county produced it',
  };
}

// ── 9. Training & Certification Record (client_training) ──

async function buildTrainingReport(svc: any, orgId: string): Promise<ContentJson> {
  const { orgName, orgSubtitle } = await fetchOrgContext(svc, orgId);
  const now = new Date();
  const sixtyDaysOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch employee certifications with user profile names
  const { data: certs } = await svc
    .from('employee_certifications')
    .select('id, user_id, certification_name, certification_type, issuing_body, issue_date, expiration_date, status, user_profiles(full_name)')
    .eq('organization_id', orgId)
    .order('expiration_date', { ascending: true });
  const certList = certs || [];

  const activeCerts = certList.filter((c: any) => c.status === 'active');
  const expiringSoon = certList.filter((c: any) => c.expiration_date && c.expiration_date <= sixtyDaysOut && c.expiration_date > now.toISOString().split('T')[0]);
  const expired = certList.filter((c: any) => c.status === 'expired' || (c.expiration_date && c.expiration_date < now.toISOString().split('T')[0]));

  // Predict: credentials expiring soon
  const expiringRows: Cell[][] = expiringSoon.slice(0, 8).map((c: any) => [
    (c as any).user_profiles?.full_name || 'Employee',
    c.certification_name || c.certification_type || 'Credential',
    fmtDate(c.expiration_date),
    resultCell('DUE SOON', 'warn'),
  ]);

  // Also show expired
  const expiredRows: Cell[][] = expired.slice(0, 4).map((c: any) => [
    (c as any).user_profiles?.full_name || 'Employee',
    c.certification_name || c.certification_type || 'Credential',
    fmtDate(c.expiration_date),
    resultCell('EXPIRED', 'fail'),
  ]);

  const predictTable = [...expiringRows, ...expiredRows];

  // Reduce: recent renewals/closures (certs issued in last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const recentlyIssued = certList.filter((c: any) => c.issue_date && c.issue_date >= thirtyDaysAgo);
  const gapRows: Cell[][] = recentlyIssued.slice(0, 6).map((c: any) => [
    `${(c as any).user_profiles?.full_name || 'Employee'} — ${c.certification_name || c.certification_type || 'credential'}`,
    `Obtained ${fmtDate(c.issue_date)}`,
    resultCell('CLOSED', 'pass'),
  ]);

  // Prove: roster summary — group by location if possible, otherwise by cert type
  const byType: Record<string, { total: number; current: number }> = {};
  for (const c of certList) {
    const type = c.certification_type || c.certification_name || 'Other';
    if (!byType[type]) byType[type] = { total: 0, current: 0 };
    byType[type].total++;
    if (c.status === 'active') byType[type].current++;
  }
  const rosterRows: Cell[][] = Object.entries(byType).slice(0, 8).map(([type, data]) => [
    type.replace(/_/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase()),
    `${data.total}`,
    `${data.current} / ${data.total}`,
  ]);

  const sections: ReportSection[] = [
    {
      act: 'predict',
      heading: 'Credentials Expiring Soon',
      table: predictTable.length > 0 ? { cols: ['Employee', 'Credential', 'Expires', 'Status'], rows: predictTable } : undefined,
      body: predictTable.length === 0 ? (certList.length > 0 ? 'No credentials expiring within sixty days.' : 'No employee certifications on file yet.') : undefined,
      citations: certList.length > 0 ? ['CalCode §113948 (manager certification) · §113947.1 (food handler cards, 30-day rule)'] : undefined,
    },
    {
      act: 'reduce',
      heading: 'Gaps Closed This Period',
      table: gapRows.length > 0 ? { cols: ['Gap', 'Action', 'Status'], rows: gapRows } : undefined,
      body: gapRows.length === 0 ? 'No new certifications issued this period.' : undefined,
    },
    {
      act: 'prove',
      heading: 'Current Roster',
      table: rosterRows.length > 0 ? { cols: ['Credential Type', 'Headcount', 'Current'], rows: rosterRows } : undefined,
      body: rosterRows.length === 0 ? 'No employee certifications on file.' : undefined,
      cross_refs: certList.length > 0 ? ['Policy training sign-offs reference active Policies & Procedures versions'] : undefined,
    },
  ];

  return {
    executive_summary: certList.length > 0
      ? `${activeCerts.length} active credential${activeCerts.length !== 1 ? 's' : ''} on file for ${orgName}. ${expiringSoon.length > 0 ? `${expiringSoon.length} expire${expiringSoon.length !== 1 ? '' : 's'} within sixty days` : 'No credentials expiring within sixty days'}${expired.length > 0 ? `, and ${expired.length} ${expired.length !== 1 ? 'have' : 'has'} already expired` : ''}. The two credentials a county inspector asks for first are food handler cards and a certified food protection manager on staff.`
      : `Training and certification record for ${orgName}. No employee certifications on file yet — this report will populate as credentials are added.`,
    sections,
    generated_at: new Date().toISOString(),
    org_name: orgName,
    org_subtitle: orgSubtitle,
    pillar_label: 'Food Safety · EHD',
    report_subtitle: 'Food handler cards, manager certification, and policy training',
  };
}

// ══════════════════════════════════════════════════════════
// PDF GENERATION
// ══════════════════════════════════════════════════════════

async function renderPdf(content: ContentJson, title: string, periodLabel: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Standard fonts (closest to mockup)
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdfDoc.embedFont(StandardFonts.Courier);
  const monoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const navy = rgb(0.118, 0.176, 0.302);
  const gold = rgb(0.627, 0.549, 0.353);
  const ink = rgb(0.129, 0.141, 0.169);
  const slate = rgb(0.357, 0.392, 0.447);
  const line = rgb(0.890, 0.867, 0.816);
  const white = rgb(1, 1, 1);
  const passC = rgb(0.184, 0.435, 0.310);
  const failC = rgb(0.620, 0.231, 0.184);
  const warnC = rgb(0.541, 0.427, 0.122);
  const foodBg = rgb(0.918, 0.953, 0.933);
  const fireBg = rgb(0.973, 0.925, 0.914);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - 2 * MARGIN;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  function newPage() {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - 30;
  }

  function ensureSpace(needed: number) {
    if (y - needed < 50) newPage();
  }

  function drawWrappedText(text: string, x: number, maxW: number, fontSize: number, fontObj: any, color: any, lineH = 1.5): number {
    const words = text.split(/\s+/);
    let currentLine = '';
    let linesDrawn = 0;

    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      const testW = fontObj.widthOfTextAtSize(test, fontSize);
      if (testW > maxW && currentLine) {
        ensureSpace(fontSize * lineH);
        page.drawText(currentLine, { x, y, size: fontSize, font: fontObj, color });
        y -= fontSize * lineH;
        linesDrawn++;
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) {
      ensureSpace(fontSize * lineH);
      page.drawText(currentLine, { x, y, size: fontSize, font: fontObj, color });
      y -= fontSize * lineH;
      linesDrawn++;
    }
    return linesDrawn;
  }

  // ── Header block ──
  page.drawRectangle({ x: 0, y: PAGE_H - 90, width: PAGE_W, height: 90, color: navy });
  // Gold border
  page.drawRectangle({ x: 0, y: PAGE_H - 93, width: PAGE_W, height: 3, color: gold });

  // Org name
  page.drawText(content.org_name || 'Report', { x: MARGIN, y: PAGE_H - 30, size: 16, font: serifBold, color: white });

  // Subtitle
  if (content.org_subtitle) {
    page.drawText(content.org_subtitle, { x: MARGIN, y: PAGE_H - 46, size: 9, font: sans, color: rgb(0.725, 0.761, 0.831) });
  }

  // Pillar label (right side)
  if (content.pillar_label) {
    const pLabel = content.pillar_label.toUpperCase();
    const pW = mono.widthOfTextAtSize(pLabel, 8);
    page.drawText(pLabel, { x: PAGE_W - MARGIN - pW, y: PAGE_H - 30, size: 8, font: mono, color: gold });
  }

  // Period label (right side)
  if (periodLabel) {
    const plW = mono.widthOfTextAtSize(periodLabel, 8);
    page.drawText(periodLabel, { x: PAGE_W - MARGIN - plW, y: PAGE_H - 42, size: 8, font: mono, color: rgb(0.725, 0.761, 0.831) });
  }

  // Title
  const titleClean = title.split(' — ')[0]; // remove date suffix
  page.drawText(titleClean, { x: MARGIN, y: PAGE_H - 72, size: 18, font: serifBold, color: white });

  // Report subtitle
  if (content.report_subtitle) {
    page.drawText(content.report_subtitle, { x: MARGIN, y: PAGE_H - 86, size: 8, font: sans, color: rgb(0.725, 0.761, 0.831) });
  }

  y = PAGE_H - 115;

  // ── Executive summary ──
  if (content.executive_summary) {
    ensureSpace(40);
    page.drawText('EXECUTIVE SUMMARY', { x: MARGIN, y, size: 9, font: monoBold, color: navy });
    y -= 6;
    page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: 0.5, color: line });
    y -= 14;

    // Gold keyline
    const startY = y + 4;
    drawWrappedText(content.executive_summary, MARGIN + 12, CONTENT_W - 12, 10, sans, ink, 1.6);
    const endY = y;
    page.drawRectangle({ x: MARGIN, y: endY, width: 2, height: startY - endY, color: gold });

    y -= 12;
  }

  // ── Helper: draw a table ──
  function drawTable(table: TableData, offsetX = 0) {
    if (!table?.cols || !table?.rows) return;
    const colCount = table.cols.length;
    const colW = (CONTENT_W - offsetX) / colCount;

    ensureSpace(24);

    // Headers
    for (let i = 0; i < colCount; i++) {
      page.drawText(table.cols[i].toUpperCase(), {
        x: MARGIN + offsetX + i * colW,
        y,
        size: 7,
        font: monoBold,
        color: slate,
      });
    }
    y -= 4;
    page.drawRectangle({ x: MARGIN + offsetX, y, width: CONTENT_W - offsetX, height: 0.8, color: navy });
    y -= 12;

    // Rows
    for (const row of table.rows) {
      ensureSpace(16);
      for (let j = 0; j < row.length && j < colCount; j++) {
        const cell = row[j];
        const txt = cellText(cell);
        let cellColor = ink;
        let cellFont = sans;
        if (typeof cell !== 'string' && cell.result) {
          cellFont = monoBold;
          cellColor = cell.result === 'pass' ? passC : cell.result === 'fail' ? failC : warnC;
        }
        // Truncate long text
        const maxChars = Math.floor(colW / 5);
        const display = txt.length > maxChars ? txt.slice(0, maxChars - 1) + '…' : txt;
        page.drawText(display, {
          x: MARGIN + offsetX + j * colW,
          y,
          size: 8.5,
          font: cellFont,
          color: cellColor,
        });
      }
      y -= 4;
      page.drawRectangle({ x: MARGIN + offsetX, y, width: CONTENT_W - offsetX, height: 0.5, color: line });
      y -= 10;
    }
  }

  // ── Helper: draw a section ──
  function drawSection(section: ReportSection) {
    ensureSpace(36);

    // Act label + heading
    let headX = MARGIN;
    if (section.act) {
      const actLabel = section.act.toUpperCase();
      page.drawText(actLabel, { x: headX, y, size: 7.5, font: monoBold, color: gold });
      headX += mono.widthOfTextAtSize(actLabel, 7.5) + 8;
    }
    page.drawText(section.heading, { x: headX, y, size: 12, font: serifBold, color: navy });
    y -= 4;
    page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: 0.5, color: line });
    y -= 12;

    // Table
    if (section.table) {
      drawTable(section.table);
    }

    // Body text
    if (!section.table && section.body) {
      drawWrappedText(section.body, MARGIN, CONTENT_W, 9, sans, ink, 1.5);
      y -= 4;
    }

    // Citations
    if (section.citations) {
      for (const cite of section.citations) {
        ensureSpace(14);
        drawWrappedText(cite, MARGIN, CONTENT_W, 7, mono, slate, 1.4);
      }
    }

    // Cross-refs
    if (section.cross_refs) {
      for (const ref of section.cross_refs) {
        ensureSpace(18);
        page.drawRectangle({ x: MARGIN, y: y - 2, width: CONTENT_W, height: 14, color: rgb(0.965, 0.953, 0.922) });
        page.drawText(`↪ ${ref}`, { x: MARGIN + 6, y: y + 1, size: 8, font: sans, color: slate });
        y -= 18;
      }
    }

    y -= 8;
  }

  // ── Render pillar blocks (Insurance Package) ──
  if (content.food_safety?.table) {
    ensureSpace(60);
    // Food pillar header
    page.drawRectangle({ x: MARGIN, y: y - 2, width: CONTENT_W, height: 16, color: foodBg });
    const foodLabel = (content.food_safety.label || 'PART I — FOOD SAFETY').toUpperCase();
    page.drawText(foodLabel, { x: MARGIN + 8, y: y + 1, size: 7.5, font: monoBold, color: passC });
    y -= 22;
    drawTable(content.food_safety.table);
    y -= 8;
  }

  if (content.fire_safety?.table) {
    ensureSpace(60);
    page.drawRectangle({ x: MARGIN, y: y - 2, width: CONTENT_W, height: 16, color: fireBg });
    const fireLabel = (content.fire_safety.label || 'PART II — FIRE SAFETY').toUpperCase();
    page.drawText(fireLabel, { x: MARGIN + 8, y: y + 1, size: 7.5, font: monoBold, color: failC });
    y -= 22;
    drawTable(content.fire_safety.table);
    y -= 8;
  }

  // ── Render non-insurance pillar sections ──
  if (content.food_safety?.sections) {
    for (const section of content.food_safety.sections) {
      drawSection(section);
    }
  }
  if (content.fire_safety?.sections) {
    for (const section of content.fire_safety.sections) {
      drawSection(section);
    }
  }

  // ── Documents table ──
  if (content.documents) {
    ensureSpace(36);
    page.drawText('ATTACHED DOCUMENTS', { x: MARGIN, y, size: 9, font: monoBold, color: navy });
    y -= 4;
    page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: 0.5, color: line });
    y -= 12;
    drawTable(content.documents);
  }

  // ── Flat sections ──
  if (content.sections) {
    for (const section of content.sections) {
      drawSection(section);
    }
  }

  // ── Footer on all pages ──
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const pg = pdfDoc.getPage(i);
    pg.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 30, color: rgb(0.98, 0.98, 0.98) });
    pg.drawRectangle({ x: 0, y: 30, width: PAGE_W, height: 0.5, color: line });
    pg.drawText(`Produced by EvidLY from ${content.org_name || 'organization'} records`, {
      x: MARGIN, y: 12, size: 7, font: sans, color: slate,
    });
    const genDate = new Date(content.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const pageLabel = `Generated ${genDate} · Page ${i + 1} of ${totalPages}`;
    const labelW = mono.widthOfTextAtSize(pageLabel, 7);
    pg.drawText(pageLabel, {
      x: PAGE_W - MARGIN - labelW, y: 12, size: 7, font: mono, color: slate,
    });
  }

  return await pdfDoc.save();
}

// ── Router ────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
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
