import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================
// STATUS LOGIC
// =============================================

interface Deficiency {
  id: string;
  component: string;
  field: string;
  value: string;
  deficiency_text: string;
  corrective_action: string | null;
  severity: 'critical' | 'major' | 'minor';
  nfpa_code_id: string | null;
}

function getOverallStatus(deficiencies: Deficiency[], serviceType: string) {
  const hasGreaseIssues = deficiencies.some(d => d.component === 'grease');
  const hasServiceIssues = deficiencies.some(d => d.component !== 'grease');

  if (serviceType.includes('Cleaning') || serviceType === 'KEC') {
    if (deficiencies.length === 0) return { status: 'compliant', text: 'COMPLIANT (SYSTEM CLEANED)', color: '#166534', bgColor: '#DCFCE7' };
    return { status: 'non_compliant', text: 'NON-COMPLIANT (ISSUES NOTED)', color: '#991B1B', bgColor: '#FEE2E2' };
  }

  if (!hasGreaseIssues && !hasServiceIssues) return { status: 'compliant', text: 'COMPLIANT (CLEANING NOT REQUIRED)', color: '#166534', bgColor: '#DCFCE7' };
  if (hasGreaseIssues && !hasServiceIssues) return { status: 'non_compliant', text: 'NON-COMPLIANT (CLEANING REQUIRED)', color: '#991B1B', bgColor: '#FEE2E2' };
  if (!hasGreaseIssues && hasServiceIssues) return { status: 'partial', text: 'PARTIALLY-COMPLIANT (SERVICE REQUIRED)', color: '#92400E', bgColor: '#FEF3C7' };
  return { status: 'non_compliant', text: 'NON-COMPLIANT (CLEANING & SERVICE REQUIRED)', color: '#991B1B', bgColor: '#FEE2E2' };
}

// =============================================
// JOB NUMBER GENERATOR
// =============================================

async function generateJobNumber(supabase: any, vendorId: string, serviceType: string): Promise<string> {
  const prefixMap: Record<string, string> = {
    'kitchen_exhaust_cleaning': 'KEC',
    'KEC': 'KEC',
    'fan_performance_management': 'FPM',
    'FPM': 'FPM',
    'grease_filter_exchange': 'GFX',
    'GFX': 'GFX',
    'rooftop_grease_containment': 'RGC',
    'RGC': 'RGC',
  };

  const prefix = prefixMap[serviceType] || 'JOB';
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data } = await supabase
    .from('service_reports')
    .select('certificate_id')
    .eq('vendor_id', vendorId)
    .ilike('certificate_id', `${prefix} ${yymm}-%`)
    .order('certificate_id', { ascending: false })
    .limit(1);

  let sequence = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].certificate_id.split('-').pop();
    sequence = parseInt(lastNumber, 10) + 1;
  }

  return `${prefix} ${yymm}-${String(sequence).padStart(3, '0')}`;
}

// =============================================
// HTML TEMPLATE RENDERER
// =============================================

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function renderGreaseTable(greaseData: Record<string, any>, noAccessComponents: string[]): string {
  const components = [
    { key: 'filter_tract', label: 'Filter Tract' },
    { key: 'hood_interior', label: 'Hood Interior' },
    { key: 'vertical_duct', label: 'Vertical Duct' },
    { key: 'horizontal_duct', label: 'Horiz. Duct' },
    { key: 'plenum', label: 'Plenum' },
    { key: 'fan_bowl', label: 'Fan Bowl' },
    { key: 'fan_blades', label: 'Fan Blades' },
  ];

  const rows = components.map(c => {
    if (noAccessComponents.includes(c.key)) {
      return `<tr><td>${c.label}</td><td>—</td><td>—</td><td class="no-access">No Access</td></tr>`;
    }
    const before = greaseData[c.key]?.before || '—';
    const after = greaseData[c.key]?.after || '—';
    const status = after === 'bare_metal' || after === 'Bare Metal' ? '✓ Cleaned' : '—';
    return `<tr><td>${c.label}</td><td>${before}</td><td>${after}</td><td class="cleaned">${status}</td></tr>`;
  }).join('\n');

  return `
    <div class="section">
      <h3>1. GREASE ACCUMULATION LEVELS</h3>
      <table class="grease-table">
        <thead>
          <tr><th>Component</th><th>Before</th><th>After</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderSectionFields(title: string, number: number, data: Record<string, any>): string {
  if (!data || Object.keys(data).length === 0) {
    return `<div class="section"><h3>${number}. ${title}</h3><p class="na">N/A</p></div>`;
  }
  const fields = Object.entries(data).map(([key, value]) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const displayValue = value === true ? 'Yes' : value === false ? 'No' : String(value || '—');
    const warning = displayValue === 'No' || displayValue === 'not_working' || displayValue === 'missing' ? ' ⚠️' : '';
    return `<span class="field"><strong>${label}:</strong> ${displayValue}${warning}</span>`;
  }).join('  ');
  return `<div class="section"><h3>${number}. ${title}</h3><div class="field-grid">${fields}</div></div>`;
}

function renderFireSafety(fireSafety: any): string {
  if (!fireSafety) return '';

  const inspectionWarning = fireSafety.suppression_inspection_current === 'No' ? ' ⚠️ Overdue' : '';

  let extinguisherRows = '';
  if (fireSafety.extinguishers?.length > 0) {
    extinguisherRows = fireSafety.extinguishers.map((ext: any) => {
      const expired = ext.expiry && new Date(ext.expiry) < new Date();
      const status = expired ? `Expired ⚠️` : (ext.tag_current ? 'Current' : 'Expired ⚠️');
      return `<div class="ext-row">${ext.location}: ${ext.type} — ${status}</div>`;
    }).join('');
  }

  return `
    <div class="section fire-safety">
      <h3>🧯 FIRE SAFETY (COURTESY)</h3>
      <div class="fire-box">
        <div class="fire-sub">
          <strong>SUPPRESSION:</strong> ${fireSafety.suppression_system_type || 'N/A'}<br>
          <strong>Company:</strong> ${fireSafety.suppression_company_name || 'N/A'}<br>
          Nozzle Caps: ${fireSafety.suppression_nozzle_caps}
          Nozzles Clean: ${fireSafety.suppression_nozzles_clean}<br>
          Inspection: ${fireSafety.suppression_inspection_current}${inspectionWarning}
          ${fireSafety.suppression_last_inspection ? `  Last: ${formatDateShort(fireSafety.suppression_last_inspection)}` : ''}
        </div>
        ${fireSafety.extinguishers?.length > 0 ? `
        <div class="fire-sub">
          <strong>EXTINGUISHERS</strong><br>
          <strong>Company:</strong> ${fireSafety.extinguisher_company_name || 'N/A'}<br>
          ${extinguisherRows}
        </div>` : ''}
      </div>
    </div>`;
}

function renderPhotoDocumentation(photos: any[], noAccessComponents: string[]): string {
  const components = ['filter_tract', 'hood_interior', 'vertical_duct', 'horizontal_duct', 'plenum', 'fan_bowl', 'fan_blades'];

  const photoGridItems = components.map(comp => {
    const label = comp.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    if (noAccessComponents.includes(comp)) {
      return `<div class="photo-pair"><div class="photo-no-access">🚫 NO ACCESS<br><small>${label}</small></div></div>`;
    }
    const before = photos.find((p: any) => p.component === comp && p.phase === 'before');
    const after = photos.find((p: any) => p.component === comp && p.phase === 'after');
    return `
      <div class="photo-pair">
        <div class="photo-slot">
          <div class="photo-label">BEFORE</div>
          ${before ? `<div class="photo-img">[Photo]</div>` : `<div class="photo-missing">—</div>`}
          <div class="photo-caption">${label}</div>
        </div>
        <div class="photo-slot">
          <div class="photo-label">AFTER</div>
          ${after ? `<div class="photo-img">[Photo]</div>` : `<div class="photo-missing">—</div>`}
          <div class="photo-caption">${label}</div>
        </div>
      </div>`;
  }).join('');

  return `<div class="section"><h3>PHOTO DOCUMENTATION</h3><div class="photo-grid">${photoGridItems}</div></div>`;
}

function renderDeficiencies(deficiencies: Deficiency[]): string {
  if (deficiencies.length === 0) return '';
  const items = deficiencies.map(d => {
    const nfpa = d.nfpa_code_id ? ` (${d.field})` : '';
    return `<li class="deficiency-${d.severity}">${d.component}: ${d.deficiency_text}${nfpa}</li>`;
  }).join('');
  return `<div class="section"><h3>⚠️ DEFICIENCIES</h3><ul class="deficiency-list">${items}</ul></div>`;
}

function renderCorrectiveActions(deficiencies: Deficiency[]): string {
  const actions = deficiencies.filter(d => d.corrective_action).map(d =>
    `<li>${d.corrective_action}</li>`
  ).join('');
  if (!actions) return '';
  return `<div class="section"><h3>✓ CORRECTIVE ACTIONS</h3><ul class="action-list">${actions}</ul></div>`;
}

function generateReportHtml(report: any, systems: any[], photos: any[], deficiencies: Deficiency[], fireSafety: any, customer: any): string {
  const status = getOverallStatus(deficiencies, report.service_type);
  const noAccessComponents = photos.filter((p: any) => p.no_access).map((p: any) => p.component);

  // Render each system
  const systemsHtml = systems.map((system: any, idx: number) => {
    const greaseHtml = renderGreaseTable(system.grease_levels || {}, noAccessComponents);
    const hoodHtml = renderSectionFields('HOOD', 2, system.hood_data);
    const filterHtml = renderSectionFields('FILTERS & AIRFLOW', 3, system.filter_data);
    const ductHtml = renderSectionFields('DUCT & ACCESS', 4, system.duct_data);
    const fanMechHtml = renderSectionFields('FAN DIAGNOSTICS (MECHANICAL)', 5, system.fan_mechanical);
    const fanElecHtml = renderSectionFields('FAN DIAGNOSTICS (ELECTRICAL)', 6, system.fan_electrical);
    const solidFuelHtml = renderSectionFields('SOLID FUEL', 7, system.solid_fuel);
    const postCleanHtml = renderSectionFields('POST CLEANING CHECKS', 8, system.post_cleaning);

    return `
      <div class="system-header">SYSTEM #${idx + 1}: ${system.location_name || `System ${idx + 1}`}</div>
      ${greaseHtml}
      ${hoodHtml}
      ${filterHtml}
      ${ductHtml}
      ${fanMechHtml}
      ${fanElecHtml}
      ${solidFuelHtml}
      ${postCleanHtml}`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: letter; margin: 0.5in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #1a1a1a; line-height: 1.4; position: relative; }

  /* Watermark */
  body::before {
    content: 'IKECA Member ID 76716495';
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-45deg);
    font-size: 48pt; color: rgba(30, 77, 107, 0.06);
    font-weight: 700; white-space: nowrap; pointer-events: none; z-index: -1;
  }

  .report { max-width: 8.5in; margin: 0 auto; }

  /* Header */
  .header { text-align: center; padding: 16px 0; border-bottom: 2px solid #1e4d6b; }
  .header-logos { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 20px; }
  .header-logo { font-size: 14pt; font-weight: 700; color: #1e4d6b; }
  .ikeca-id { color: #6B7F96; font-size: 9pt; margin: 4px 0; }
  .report-title { font-size: 14pt; font-weight: 700; color: #1e4d6b; letter-spacing: 0.5px; }
  .report-subtitle { font-size: 10pt; color: #3D5068; }

  /* Status Banner */
  .status-banner { padding: 10px 16px; text-align: center; font-size: 12pt; font-weight: 700; border-radius: 6px; margin: 12px 0; letter-spacing: 0.5px; }

  /* Info Rows */
  .info-row { padding: 8px 0; border-bottom: 1px solid #E8EDF5; display: flex; flex-wrap: wrap; gap: 16px; }
  .info-row span { font-size: 9.5pt; }
  .info-row strong { color: #1e4d6b; }

  /* System Header */
  .system-header { background: #1e4d6b; color: white; padding: 8px 12px; font-weight: 700; font-size: 11pt; margin-top: 16px; }

  /* Sections */
  .section { padding: 8px 0; border-bottom: 1px solid #E8EDF5; }
  .section h3 { font-size: 10pt; color: #1e4d6b; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
  .field-grid { display: flex; flex-wrap: wrap; gap: 4px 16px; }
  .field { font-size: 9pt; }
  .field strong { color: #3D5068; }
  .na { color: #6B7F96; font-style: italic; font-size: 9pt; }

  /* Grease Table */
  .grease-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .grease-table th { background: #1e4d6b; color: white; padding: 4px 8px; text-align: left; font-weight: 600; }
  .grease-table td { padding: 4px 8px; border-bottom: 1px solid #E8EDF5; }
  .grease-table tr:nth-child(even) td { background: #F8F9FC; }
  .cleaned { color: #166534; font-weight: 600; }
  .no-access { color: #6B7F96; font-style: italic; }

  /* Fire Safety */
  .fire-safety { background: #FFF8F0; border: 1px solid #F59E0B; border-radius: 6px; padding: 12px; margin: 12px 0; }
  .fire-box { border: 1px solid #D1D9E6; border-radius: 4px; overflow: hidden; }
  .fire-sub { padding: 8px 12px; border-bottom: 1px solid #D1D9E6; font-size: 9pt; line-height: 1.6; }
  .fire-sub:last-child { border-bottom: none; }
  .ext-row { padding: 2px 0; }

  /* Photos */
  .photo-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .photo-pair { display: flex; gap: 4px; }
  .photo-slot { width: 80px; text-align: center; border: 1px solid #D1D9E6; border-radius: 4px; padding: 4px; }
  .photo-label { font-size: 7pt; font-weight: 700; color: #1e4d6b; text-transform: uppercase; }
  .photo-img { width: 70px; height: 50px; background: #E8EDF5; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #6B7F96; margin: 2px auto; }
  .photo-caption { font-size: 7pt; color: #3D5068; }
  .photo-missing { width: 70px; height: 50px; background: #F4F6FA; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #B8C4D8; margin: 2px auto; }
  .photo-no-access { width: 164px; height: 70px; background: #F4F6FA; border: 1px solid #D1D9E6; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6B7F96; font-size: 9pt; }

  /* Deficiencies */
  .deficiency-list { list-style: none; padding: 0; }
  .deficiency-list li { padding: 4px 0 4px 16px; position: relative; font-size: 9pt; }
  .deficiency-list li::before { content: '•'; position: absolute; left: 0; color: #991B1B; font-weight: 700; }
  .deficiency-critical { color: #991B1B; }
  .deficiency-major { color: #92400E; }
  .deficiency-minor { color: #3D5068; }

  /* Actions */
  .action-list { list-style: none; padding: 0; }
  .action-list li { padding: 3px 0 3px 16px; position: relative; font-size: 9pt; }
  .action-list li::before { content: '•'; position: absolute; left: 0; color: #166534; }

  /* Notes */
  .notes { background: #F8F9FC; border: 1px solid #E8EDF5; border-radius: 4px; padding: 8px 12px; font-size: 9pt; margin: 8px 0; }

  /* Compliance */
  .compliance { background: #F0F4F8; border: 1px solid #D1D9E6; border-radius: 4px; padding: 10px 12px; margin: 12px 0; font-size: 8.5pt; color: #3D5068; }
  .certification { text-align: center; font-style: italic; font-size: 9pt; padding: 10px 20px; color: #1e4d6b; border: 1px solid #1e4d6b; border-radius: 4px; margin: 12px 0; }

  /* Signatures */
  .signatures { display: flex; justify-content: space-between; gap: 16px; margin: 16px 0; }
  .sig-block { flex: 1; text-align: center; }
  .sig-line { border-bottom: 1px solid #1a1a1a; height: 40px; margin-bottom: 4px; display: flex; align-items: flex-end; justify-content: center; }
  .sig-line img { max-height: 36px; }
  .sig-name { font-weight: 700; font-size: 9pt; }
  .sig-title { font-size: 8pt; color: #6B7F96; }
  .sig-cert { font-size: 8pt; color: #1e4d6b; }

  /* Footer */
  .footer { text-align: center; padding: 12px 0; border-top: 2px solid #1e4d6b; margin-top: 16px; font-size: 8pt; color: #6B7F96; }
  .footer strong { color: #1e4d6b; }
  .footer-legal { font-size: 7.5pt; color: #B8C4D8; margin-top: 4px; }
</style>
</head>
<body>
<div class="report">
  <!-- HEADER -->
  <div class="header">
    <div class="header-logos">
      <span class="header-logo">CPP</span>
      <span class="header-logo" style="color: #3D5068; font-size: 11pt;">${customer?.name || report.customer_name || ''}</span>
      <span class="header-logo">IKECA</span>
    </div>
    <div class="ikeca-id">IKECA Member ID: 76716495</div>
    <div class="report-title">CERTIFICATE OF PERFORMANCE & COMPLIANCE</div>
    <div class="report-subtitle">Kitchen Exhaust Maintenance Cleaning</div>
  </div>

  <!-- STATUS BANNER -->
  <div class="status-banner" style="background: ${status.bgColor}; color: ${status.color}; border: 1px solid ${status.color};">
    ${status.text}
  </div>

  <!-- REPORT INFO -->
  <div class="info-row">
    <span><strong>Certificate ID:</strong> ${report.certificate_id}</span>
    <span><strong>Date of Service:</strong> ${formatDate(report.service_date)}</span>
    <span><strong>Frequency:</strong> ${report.frequency}</span>
    ${report.next_due_date ? `<span><strong>Next Due:</strong> ${formatDate(report.next_due_date)}</span>` : ''}
  </div>

  <!-- CLIENT INFO -->
  <div class="info-row">
    <span><strong>Client:</strong> ${customer?.name || report.customer_name || '—'}</span>
    ${customer?.contact_name ? `<span><strong>POC:</strong> ${customer.contact_name}${customer.contact_title ? ', ' + customer.contact_title : ''}</span>` : ''}
    ${customer?.address ? `<span><strong>Address:</strong> ${customer.address}</span>` : ''}
    ${customer?.phone ? `<span><strong>Phone:</strong> ${customer.phone}</span>` : ''}
    ${customer?.email ? `<span><strong>Email:</strong> ${customer.email}</span>` : ''}
  </div>

  <!-- SYSTEMS -->
  ${systemsHtml}

  <!-- FIRE SAFETY -->
  ${renderFireSafety(fireSafety)}

  <!-- PHOTOS -->
  ${renderPhotoDocumentation(photos, photos.filter((p: any) => p.no_access).map((p: any) => p.component))}

  <!-- DEFICIENCIES -->
  ${renderDeficiencies(deficiencies)}

  <!-- CORRECTIVE ACTIONS -->
  ${renderCorrectiveActions(deficiencies)}

  <!-- TECHNICIAN NOTES -->
  ${report.technician_notes ? `
  <div class="section">
    <h3>TECHNICIAN NOTES</h3>
    <div class="notes">${report.technician_notes}</div>
  </div>` : ''}

  <!-- COMPLIANCE STATEMENT -->
  <div class="compliance">
    Cleaned by <strong>Cleaning Pros Plus LLC</strong> (IKECA #76716495)<br>
    per NFPA 96, ANSI/IKECA C10, CA Fire Code 609, CP 04 11 (P-5, P-9).
  </div>

  <!-- CERTIFICATION -->
  <div class="certification">
    "I hereby certify that the exhaust system has been cleaned to BARE METAL.<br>
    All grease removed to less than 0.002 inches (50 microns)."
  </div>

  <!-- SIGNATURES -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">
        ${report.lead_tech_signature_url ? `<img src="${report.lead_tech_signature_url}" alt="Tech Signature" />` : ''}
      </div>
      <div class="sig-name">${report.lead_tech_name || 'Lead Technician'}</div>
      <div class="sig-cert">${report.lead_tech_cert || 'PECT'}</div>
      <div class="sig-title">Lead Technician</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">
        ${report.reviewer_signature_url ? `<img src="${report.reviewer_signature_url}" alt="Reviewer Signature" />` : ''}
      </div>
      <div class="sig-name">${report.reviewer_name || 'Reviewer'}</div>
      <div class="sig-cert">${report.reviewer_cert || 'CECS'}</div>
      <div class="sig-title">Reviewer</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">
        ${report.customer_signature_url ? `<img src="${report.customer_signature_url}" alt="Customer Signature" />` : ''}
      </div>
      <div class="sig-name">${report.customer_name || 'Customer'}</div>
      <div class="sig-title">${customer?.contact_title || 'Authorized Representative'}</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <strong>Cleaning Pros Plus LLC</strong> • IKECA #76716495<br>
    (209) 636-6116 • cleaningprosplus.com<br>
    <div class="footer-legal">
      Electronic signature is legal equivalent of manual signature.<br>
      Certificate ID: ${report.certificate_id}
    </div>
  </div>
</div>
</body>
</html>`;
}

// =============================================
// MAIN HANDLER
// =============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { report_id } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: 'report_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from('service_reports')
      .select('*')
      .eq('id', report_id)
      .single();
    if (reportError || !report) throw new Error('Report not found');

    // Fetch systems
    const { data: systems } = await supabase
      .from('report_systems')
      .select('*')
      .eq('report_id', report_id)
      .order('system_number', { ascending: true });

    // Fetch photos
    const { data: photos } = await supabase
      .from('report_photos')
      .select('*')
      .eq('report_id', report_id);

    // Fetch deficiencies
    const { data: deficiencies } = await supabase
      .from('report_deficiencies')
      .select('*')
      .eq('report_id', report_id);

    // Fetch fire safety
    const { data: fireSafety } = await supabase
      .from('report_fire_safety')
      .select('*')
      .eq('report_id', report_id)
      .single();

    // Generate certificate ID if missing
    if (!report.certificate_id || report.certificate_id.startsWith('CERT-')) {
      const newCertId = await generateJobNumber(supabase, report.vendor_id, report.service_type);
      await supabase.from('service_reports').update({ certificate_id: newCertId }).eq('id', report_id);
      report.certificate_id = newCertId;
    }

    // Generate HTML
    const html = generateReportHtml(
      report,
      systems || [],
      photos || [],
      (deficiencies || []) as Deficiency[],
      fireSafety,
      null // customer data would come from a join in production
    );

    // Store HTML reference
    await supabase.from('service_reports').update({
      pdf_url: `html://${report_id}`,
      updated_at: new Date().toISOString(),
    }).eq('id', report_id);

    return new Response(JSON.stringify({
      success: true,
      html,
      certificate_id: report.certificate_id,
      status: getOverallStatus((deficiencies || []) as Deficiency[], report.service_type),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
