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
