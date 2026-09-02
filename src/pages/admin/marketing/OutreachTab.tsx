/**
 * OutreachTab — six-panel outreach surface inside the Marketing console.
 *
 * Panels (in workflow order):
 *   1. The flow            — stage-by-stage reference (FlowOverview)
 *   2. Add a recipient      — single or pasted rows
 *   3. Schedule + sign-off  — step definitions, sign-off gate
 *   4. County review        — approval table (moved from standalone page)
 *   5. Cold handoff         — export cold recipients for HubSpot
 *   6. Queue                — all recipients, hold reasons inline
 *   7. Missing clients      — orgs not in the briefing queue, with enroll action
 *
 * Master pause toggle above everything — nothing sends while it is off.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import FlowOverview from './FlowOverview';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_FAINT, EV_LINE,
  EV_PAPER, EV_CREAM, EV_LIGHT, EV_SUCCESS, EV_WARN, EV_DANGER,
  DISPLAY, BODY,
} from './marketingTokens';

// ── Inline style helpers ─────────────────────────────────────────

const LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700,
  letterSpacing: '0.12em', color: EV_MUTED, fontFamily: BODY, marginBottom: 4,
};

const INPUT: React.CSSProperties = {
  padding: '7px 10px', fontSize: 13, border: `1px solid ${EV_LINE}`,
  borderRadius: 6, outline: 'none', width: '100%', fontFamily: BODY,
  color: EV_NAVY, background: '#FFF',
};

const BTN = (bg: string, fg: string): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
  fontSize: 12, fontWeight: 700, background: bg, color: fg, fontFamily: BODY,
});

const CARD: React.CSSProperties = {
  border: `1px solid ${EV_LINE}`, borderRadius: 10,
  background: EV_PAPER, padding: 24, marginBottom: 20,
};

const TH: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 10,
  fontWeight: 700, letterSpacing: '0.12em',
  color: EV_MUTED,
};

const NUM_BADGE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 24, height: 24, borderRadius: '50%', background: EV_NAVY, color: '#FFF',
  fontSize: 11, fontWeight: 800, flexShrink: 0,
};

// ── Status helpers ───────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; fg: string; label?: string }> = {
  sent:     { bg: '#E3ECE1', fg: EV_SUCCESS, label: 'Sent' },
  approved: { bg: '#E3ECE1', fg: EV_SUCCESS, label: 'Approved' },
  lapsed:   { bg: '#F7EDD3', fg: EV_WARN, label: 'Lapsed' },
  blocked:  { bg: '#F6E3DF', fg: EV_DANGER },
  draft:    { bg: EV_LIGHT, fg: EV_MUTED, label: 'Draft' },
  pending:  { bg: EV_LIGHT, fg: EV_MUTED, label: 'Not reviewed' },
};

function Badge({ status, reason }: { status: string; reason?: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const label = s.label || reason || 'Blocked';
  return (
    <span title={reason || ''} style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 4,
      fontSize: 11, fontWeight: 700, background: s.bg, color: s.fg, fontFamily: BODY,
    }}>
      {label}{status === 'lapsed' && reason ? ` \u2014 ${reason}` : ''}
    </span>
  );
}

function getCountyStatus(c: any, recs?: any[]) {
  if (!c.sendable && c.block_reason) return 'blocked';
  if (c.lapsed) return 'lapsed';
  if (c.approved) {
    // If all recipients for this county are sent, status = sent
    const countyRecs = recs?.filter((r: any) => r.county === c.county) || [];
    if (countyRecs.length > 0 && countyRecs.every((r: any) => r.status === 'sent')) return 'sent';
    return 'approved';
  }
  // Has recipients but no approval
  return 'draft';
}

const REC_STATUS: Record<string, { bg: string; fg: string }> = {
  queued: { bg: EV_LIGHT, fg: EV_MUTED },
  sent:   { bg: '#E3ECE1', fg: EV_SUCCESS },
  held:   { bg: '#F7EDD3', fg: EV_WARN },
  failed: { bg: '#F6E3DF', fg: EV_DANGER },
};

// ── Main component ───────────────────────────────────────────────

/**
 * The `list` payload carries no jurisdiction_type, but it does carry city:
 * county rows come back with city null, the five city jurisdictions with a
 * value. San Francisco is a consolidated city-county and carries both, so it
 * reads as its own name rather than repeating itself as city and county.
 */
function isCityRow(c: any): boolean {
  return !!c.city && c.city !== c.county;
}

function jurLabel(c: any): string {
  return isCityRow(c) ? c.city + ' (city) · ' + c.county + ' County' : c.county;
}

export default function OutreachTab() {
  const [paused, setPaused] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);
  const [counties, setCounties] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Add recipient
  const [addEmail, setAddEmail] = useState('');
  const [addFirstName, setAddFirstName] = useState('');
  const [addOrgName, setAddOrgName] = useState('');
  // Bound to jurisdiction_id, not the county name: a city row can share its
  // county's name, so the id is the only unambiguous handle.
  const [addJurId, setAddJurId] = useState('');
  const [addVariant, setAddVariant] = useState('cold');
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Bulk import
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  type BulkRow = { email: string; first_name: string; org_name: string; county: string; variant: string; jurisdiction_id?: string; error?: string };
  const [bulkPreview, setBulkPreview] = useState<BulkRow[] | null>(null);
  const [bulkResult, setBulkResult] = useState<{ inserted: number; skipped: number; invalid: number } | null>(null);

  // Step editor
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [stepForm, setStepForm] = useState<any>({});

  // County review — expanded row
  const [expandedCounty, setExpandedCounty] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewCounty, setPreviewCounty] = useState<string | null>(null);
  const [editingJur, setEditingJur] = useState<string | null>(null);
  const [jurForm, setJurForm] = useState<any>({});
  const [jurConfirm, setJurConfirm] = useState<{ county: string; changes: { field: string; before: string; after: string }[] } | null>(null);
  const [sourceConfirmed, setSourceConfirmed] = useState(false);

  // Standalone county preview — stores jurisdiction_id
  const [previewAnyJurId, setPreviewAnyJurId] = useState('');

  // Queue filter
  const [queueFilter, setQueueFilter] = useState('all');

  // Missing clients reconciliation
  type MissingClient = { id: string; name: string; email: string | null; county: string | null; jurisdiction_id: string | null; created_at: string; reason: string };
  const [missingClients, setMissingClients] = useState<MissingClient[]>([]);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Data loading ─────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    const [stepsRes, countiesRes, recipientsRes, orgsRes] = await Promise.all([
      supabase.functions.invoke('county-briefing', { body: { action: 'list-steps' } }),
      supabase.functions.invoke('county-briefing', { body: { action: 'list' } }),
      supabase.functions.invoke('county-briefing', { body: { action: 'list-recipients' } }),
      supabase.from('organizations')
        .select('id, name, primary_contact_email, created_at')
        .order('created_at', { ascending: false }),
    ]);

    const allSteps = stepsRes.data?.steps || [];
    setSteps(allSteps.filter((s: any) => s.step_number > 0));

    const masterRow = allSteps.find((s: any) => s.step_number === 0);
    setPaused(masterRow ? !masterRow.is_active : false);

    setCounties(countiesRes.data?.counties || []);
    // Recipients now come from the edge function's service-role read. The
    // direct query this replaced was silently returning zero rows under
    // platform_admin_read, which also left the dedupe set below empty.
    const recs = recipientsRes.data?.recipients || [];
    setRecipients(recs);

    // Reconcile: orgs whose contact email is NOT in county_briefing_recipients
    const recipientEmails = new Set(recs.map((r: any) => (r.email || '').toLowerCase()));
    const orgs = orgsRes.data || [];
    const missing: MissingClient[] = [];
    for (const org of orgs) {
      const email = (org.primary_contact_email || '').trim().toLowerCase();
      if (email && recipientEmails.has(email)) continue;

      // Resolve county + jurisdiction_id from first location
      let county: string | null = null;
      let jurisdictionId: string | null = null;
      const { data: loc } = await supabase
        .from('locations')
        .select('jurisdiction_id')
        .eq('organization_id', org.id)
        .not('jurisdiction_id', 'is', null)
        .limit(1)
        .maybeSingle();
      if (loc?.jurisdiction_id) {
        jurisdictionId = loc.jurisdiction_id;
        const { data: jur } = await supabase
          .from('jurisdictions')
          .select('county')
          .eq('id', loc.jurisdiction_id)
          .maybeSingle();
        county = jur?.county || null;
      }

      let reason = 'Ready to enroll';
      if (!email) reason = 'No contact email';
      else if (!county) reason = 'County not resolved';

      missing.push({
        id: org.id,
        name: org.name,
        email: email || null,
        county,
        jurisdiction_id: jurisdictionId,
        created_at: org.created_at,
        reason,
      });
    }
    setMissingClients(missing);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Master pause ─────────────────────────────────────────────

  const togglePause = async () => {
    setPauseLoading(true);
    await supabase.functions.invoke('county-briefing', {
      body: {
        action: 'upsert-step',
        step_number: 0,
        label: '__master_pause',
        trigger_type: 'manual',
        is_active: paused, // if paused → resume (is_active true)
      },
    });
    setPaused(!paused);
    setPauseLoading(false);
  };

  // ── Add recipients ───────────────────────────────────────────

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const addJur = counties.find((c: any) => c.jurisdiction_id === addJurId);
    if (!addEmail || !addJur) return;
    const addCounty = addJur.county;
    setActionLoading('add');
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: {
        action: 'add-recipients',
        recipients: [{
          email: addEmail,
          first_name: addFirstName || undefined,
          org_name: addOrgName || undefined,
          county: addCounty,
          variant: addVariant,
          jurisdiction_id: addJur.jurisdiction_id,
        }],
      },
    });
    setActionLoading(null);
    if (error || !data?.inserted) {
      flash(`Add failed: ${error?.message || data?.error || 'Unknown error'}`);
      return;
    }
    flash(`Added ${addEmail} for ${addCounty}`);
    setAddEmail(''); setAddFirstName(''); setAddOrgName('');
    loadAll();
  };

  const handlePaste = async () => {
    const lines = pasteText.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return;
    const parsed = lines.map(line => {
      const parts = line.split('\t').map(s => s.trim());
      return {
        email: parts[0],
        first_name: parts[1] || undefined,
        org_name: parts[2] || undefined,
        county: parts[3] || (counties.find((c: any) => c.jurisdiction_id === addJurId)?.county ?? ''),
        variant: parts[4] || 'cold',
      };
    }).filter(r => r.email && r.county);
    if (parsed.length === 0) { flash('No valid rows found'); return; }
    setActionLoading('paste');
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: { action: 'add-recipients', recipients: parsed },
    });
    setActionLoading(null);
    if (error || !data?.inserted) {
      flash(`Paste failed: ${error?.message || data?.error || 'Unknown error'}`);
      return;
    }
    flash(`Added ${data.inserted} recipient(s)`);
    setPasteText('');
    loadAll();
  };

  // ── Bulk import ─────────────────────────────────────────────

  const parseBulk = () => {
    const lines = bulkText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) { flash('Need a header line + at least one data row'); return; }

    // Parse header (case-insensitive, trimmed)
    const hdr = lines[0].includes('\t')
      ? lines[0].split('\t').map(h => h.trim().toLowerCase())
      : lines[0].split(',').map(h => h.trim().toLowerCase());
    const sep = lines[0].includes('\t') ? '\t' : ',';

    const idx = (name: string) => hdr.indexOf(name);
    const iEmail = idx('email');
    const iFirst = idx('first_name');
    const iOrg = idx('org_name');
    const iCounty = idx('county');
    const iVariant = idx('variant');
    const iCity = idx('city');

    if (iEmail === -1 || iCounty === -1) {
      flash('Header must contain at least "email" and "county" columns');
      return;
    }

    const existingEmails = new Set(recipients.map((r: any) => (r.email as string).toLowerCase()));
    const seenEmails = new Set<string>();

    const rows: BulkRow[] = lines.slice(1).map(line => {
      const parts = line.split(sep).map(s => s.trim());
      const email = (parts[iEmail] || '').toLowerCase();
      const first_name = iFirst !== -1 ? parts[iFirst] || '' : '';
      const org_name = iOrg !== -1 ? parts[iOrg] || '' : '';
      const county = iCounty !== -1 ? parts[iCounty] || '' : '';
      const variant = iVariant !== -1 ? (parts[iVariant] || 'cold').toLowerCase() : 'cold';
      const city = iCity !== -1 ? (parts[iCity] || '').trim() : '';

      // Validate
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { email, first_name, org_name, county, variant, error: 'Invalid email' };
      }
      if (!county) {
        return { email, first_name, org_name, county, variant, error: 'County missing' };
      }

      // Resolve jurisdiction — city column narrows to a city row; otherwise county-level
      let matched: any = null;
      if (city) {
        matched = counties.find((c: any) =>
          (c.city || '').toLowerCase() === city.toLowerCase()
          && (c.county || '').toLowerCase() === county.toLowerCase()
        );
        if (!matched) {
          return { email, first_name, org_name, county, variant, error: `City "${city}" not found in ${county} County` };
        }
      } else {
        matched = counties.find((c: any) =>
          !c.city
          && (c.county || '').toLowerCase() === county.toLowerCase()
        );
        if (!matched) {
          // Fallback: any row matching county name
          matched = counties.find((c: any) => (c.county || '').toLowerCase() === county.toLowerCase());
        }
        if (!matched) {
          return { email, first_name, org_name, county, variant, error: `County "${county}" not found` };
        }
      }

      if (variant !== 'cold' && variant !== 'warm') {
        return { email, first_name, org_name, county: matched.county, variant, error: `Invalid variant "${variant}"` };
      }
      if (existingEmails.has(email) || seenEmails.has(email)) {
        return { email, first_name, org_name, county: matched.county, variant, jurisdiction_id: matched.jurisdiction_id, error: 'Duplicate — already exists or repeated' };
      }
      seenEmails.add(email);
      return { email, first_name, org_name, county: matched.county, variant, jurisdiction_id: matched.jurisdiction_id };
    });

    setBulkPreview(rows);
    setBulkResult(null);
  };

  const submitBulk = async () => {
    if (!bulkPreview) return;
    const valid = bulkPreview.filter(r => !r.error);
    if (valid.length === 0) { flash('No valid rows to import'); return; }

    setActionLoading('bulk');
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: {
        action: 'add-recipients',
        recipients: valid.map(r => ({
          email: r.email,
          first_name: r.first_name || undefined,
          org_name: r.org_name || undefined,
          county: r.county,
          variant: r.variant,
          ...(r.jurisdiction_id ? { jurisdiction_id: r.jurisdiction_id } : {}),
        })),
      },
    });
    setActionLoading(null);

    if (error || !data?.inserted) {
      flash(`Import failed: ${error?.message || data?.error || 'Unknown error'}`);
      return;
    }

    const invalid = bulkPreview.filter(r => r.error && r.error !== 'Duplicate — already exists or repeated').length;
    const skipped = bulkPreview.filter(r => r.error === 'Duplicate — already exists or repeated').length;
    setBulkResult({ inserted: data.inserted, skipped, invalid });
    flash(`Imported ${data.inserted}, skipped ${skipped}, invalid ${invalid}`);
    loadAll();
  };

  // ── Enroll missing client ────────────────────────────────────

  const enrollMissing = async (client: MissingClient) => {
    if (!client.email || !client.county) return;
    setEnrollingId(client.id);
    try {
      const firstName = client.name ? client.name.split(/\s+/)[0] : undefined;
      const recipient: any = {
        email: client.email,
        first_name: firstName,
        org_name: client.name || undefined,
        county: client.county,
        variant: 'warm',
      };
      if (client.jurisdiction_id) recipient.jurisdiction_id = client.jurisdiction_id;
      const { error } = await supabase.functions.invoke('county-briefing', {
        body: { action: 'add-recipients', recipients: [recipient] },
      });
      if (error) throw error;
      flash(`Enrolled ${client.email} for ${client.county} County`);
      loadAll();
    } catch (err: any) {
      flash(`Enroll failed: ${err.message || 'Unknown error'}`);
    } finally {
      setEnrollingId(null);
    }
  };

  // ── Step management ──────────────────────────────────────────

  const startEditStep = (step: any) => {
    setEditingStep(step.step_number);
    setStepForm({
      label: step.label,
      subject_template: step.subject_template,
      body_template: step.body_template,
      delay_days: step.delay_days,
      trigger_type: step.trigger_type,
      variant_scope: step.variant_scope,
    });
  };

  const saveStep = async () => {
    if (editingStep === null) return;
    setActionLoading(`save-step-${editingStep}`);
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: { action: 'upsert-step', step_number: editingStep, ...stepForm },
    });
    setActionLoading(null);
    if (error || data?.error) {
      flash(`Save failed: ${error?.message || data?.error}`);
      return;
    }
    flash(`Step ${editingStep} saved${data?.step?.signed_off_at ? '' : ' \u2014 sign-off cleared'}`);
    setEditingStep(null);
    loadAll();
  };

  const signOffStep = async (stepNumber: number) => {
    setActionLoading(`signoff-${stepNumber}`);
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: { action: 'sign-off-step', step_number: stepNumber },
    });
    setActionLoading(null);
    if (error || data?.error) {
      flash(`Sign-off failed: ${error?.message || data?.error}`);
      return;
    }
    flash(`Step ${stepNumber} signed off`);
    loadAll();
  };

  const addNewStep = async () => {
    const maxStep = steps.reduce((max: number, s: any) => Math.max(max, s.step_number), 0);
    setActionLoading('add-step');
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: {
        action: 'upsert-step',
        step_number: maxStep + 1,
        label: `Step ${maxStep + 1}`,
        trigger_type: 'manual',
        delay_days: 0,
        variant_scope: 'both',
        subject_template: '',
        body_template: '',
      },
    });
    setActionLoading(null);
    if (error || data?.error) {
      flash(`Add step failed: ${error?.message || data?.error}`);
      return;
    }
    flash(`Step ${maxStep + 1} created`);
    loadAll();
  };

  // ── County actions ───────────────────────────────────────────

  const handlePreview = async (county: string, variant?: string, jurisdictionId?: string) => {
    const key = jurisdictionId || county;
    setActionLoading(`preview-${key}`);
    const reqBody: any = { action: 'preview', county, variant: variant || 'cold' };
    if (jurisdictionId) reqBody.jurisdiction_id = jurisdictionId;
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: reqBody,
    });
    setActionLoading(null);
    if (error || !data?.preview_html) {
      flash(`Preview failed: ${error?.message || data?.error || 'Unknown'}`);
      return;
    }
    setPreviewHtml(data.preview_html);
    setPreviewCounty(county);
  };

  const handleApprove = async (county: string) => {
    setActionLoading(`approve-${county}`);
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: { action: 'approve', county },
    });
    setActionLoading(null);
    if (error || !data?.approval_id) {
      flash(`Approve failed: ${error?.message || data?.error || 'Unknown'}`);
      return;
    }
    flash(`${county} approved`);
    loadAll();
  };

  const handleSend = async (county: string, queuedCount: number) => {
    if (paused) { flash('Sending is paused'); return; }
    if (!confirm(`Send the ${county} briefing to ${queuedCount} recipient${queuedCount !== 1 ? 's' : ''} now?`)) return;
    setActionLoading(`send-${county}`);
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: { action: 'send', county },
    });
    setActionLoading(null);
    if (error) {
      flash(`Send failed: ${error.message || data?.error || 'Unknown'}`);
      return;
    }
    flash(`${county}: ${data.sent} sent, ${data.failed} failed, ${data.held} held`);
    loadAll();
  };

  // ── Jurisdiction edit helpers ────────────────────────────

  const startEditJur = (c: any) => {
    const gc = c.grading_config || {};
    setEditingJur(c.county);
    setJurForm({
      grading_type: c.grading_type || 'letter_grade',
      agency_name: c.agency_name || '',
      jie_audit_status: c.jie_audit_status || 'unknown',
      tiers_json: gc.tiers ? JSON.stringify(gc.tiers, null, 2) : '{}',
      point_values_json: gc.point_values ? JSON.stringify(gc.point_values, null, 2) : '{}',
    });
  };

  const buildJurConfirm = (c: any) => {
    const gc = c.grading_config || {};
    const changes: { field: string; before: string; after: string }[] = [];

    if (jurForm.grading_type !== (c.grading_type || 'letter_grade')) {
      changes.push({ field: 'Grading type', before: c.grading_type || 'letter_grade', after: jurForm.grading_type });
    }
    if (jurForm.agency_name !== (c.agency_name || '')) {
      changes.push({ field: 'Agency name', before: c.agency_name || '\u2014', after: jurForm.agency_name });
    }
    if (jurForm.jie_audit_status !== (c.jie_audit_status || 'unknown')) {
      changes.push({ field: 'Verified status', before: c.jie_audit_status || 'unknown', after: jurForm.jie_audit_status });
    }

    const oldTiers = JSON.stringify(gc.tiers || {}, null, 2);
    const newTiers = jurForm.tiers_json?.trim() || '{}';
    if (oldTiers !== newTiers) {
      changes.push({ field: 'Tiers', before: oldTiers, after: newTiers });
    }

    const oldPts = JSON.stringify(gc.point_values || {}, null, 2);
    const newPts = jurForm.point_values_json?.trim() || '{}';
    if (oldPts !== newPts) {
      changes.push({ field: 'Point weights', before: oldPts, after: newPts });
    }

    if (changes.length === 0) {
      flash('No changes detected');
      return;
    }
    setJurConfirm({ county: c.county, changes });
  };

  const handleJurWrite = async () => {
    if (!jurConfirm) return;
    const county = jurConfirm.county;
    const c = counties.find((x: any) => x.county === county);
    if (!c) { flash(`County ${county} not found`); return; }

    const edits: Record<string, any> = {};

    if (jurForm.grading_type !== (c.grading_type || 'letter_grade')) {
      edits.grading_type = jurForm.grading_type;
    }
    if (jurForm.agency_name !== (c.agency_name || '')) {
      edits.agency_name = jurForm.agency_name;
    }
    if (jurForm.jie_audit_status !== (c.jie_audit_status || 'unknown')) {
      edits.jie_audit_status = jurForm.jie_audit_status;
    }

    // Merge tiers / point_values back into grading_config
    const gc = { ...(c.grading_config || {}) };
    let gcChanged = false;

    try {
      const newTiers = JSON.parse(jurForm.tiers_json || '{}');
      if (JSON.stringify(gc.tiers || {}) !== JSON.stringify(newTiers)) {
        gc.tiers = newTiers;
        gcChanged = true;
      }
    } catch { flash('Invalid tiers JSON'); return; }

    try {
      const newPts = JSON.parse(jurForm.point_values_json || '{}');
      if (JSON.stringify(gc.point_values || {}) !== JSON.stringify(newPts)) {
        gc.point_values = newPts;
        gcChanged = true;
      }
    } catch { flash('Invalid point weights JSON'); return; }

    if (gcChanged) edits.grading_config = gc;

    if (Object.keys(edits).length === 0) {
      flash('No changes to write');
      return;
    }

    setActionLoading('jur-write');
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: { action: 'update-jurisdiction', county, edits, source_confirmed: sourceConfirmed },
    });
    setActionLoading(null);

    if (error || data?.error) {
      flash(`Write failed: ${error?.message || data?.error}`);
      return;
    }

    flash(`${county} jurisdiction updated (${data.changes} field${data.changes !== 1 ? 's' : ''})`);
    setJurConfirm(null);
    setEditingJur(null);
    setJurForm({});
    setSourceConfirmed(false);

    // Re-render from freshly-written row
    await loadAll();
    handlePreview(county);
  };

  // ── Cold export ──────────────────────────────────────────────

  const exportCold = () => {
    const cold = recipients.filter((r: any) => r.variant === 'cold' && r.status === 'queued');
    if (cold.length === 0) { flash('No cold queued recipients to export'); return; }
    const header = 'email,first_name,org_name,county,step_number';
    const rows = cold.map((r: any) =>
      [r.email, r.first_name || '', r.org_name || '', r.county, r.step_number].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cold-outreach-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flash(`Exported ${cold.length} cold recipient(s)`);
  };

  // ── Derived counts ───────────────────────────────────────────

  const queueCounts = {
    all: recipients.length,
    queued: recipients.filter((r: any) => r.status === 'queued').length,
    held: recipients.filter((r: any) => r.status === 'held').length,
    sent: recipients.filter((r: any) => r.status === 'sent').length,
    failed: recipients.filter((r: any) => r.status === 'failed').length,
  };

  const filteredRecipients = queueFilter === 'all'
    ? recipients
    : recipients.filter((r: any) => r.status === queueFilter);

  // Counties that have at least one recipient — the focused review list
  const countiesWithRecipientNames = new Set(recipients.map((r: any) => r.county));
  const countiesWithRecipients = counties.filter((c: any) => countiesWithRecipientNames.has(c.county));

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: EV_MUTED, fontSize: 13, fontFamily: BODY }}>
        Loading outreach data...
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: BODY }}>
      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: 6, marginBottom: 16,
          background: '#E3ECE1', color: EV_SUCCESS, fontSize: 13, fontFamily: BODY,
        }}>
          {message}
        </div>
      )}

      {/* ── Master pause ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderRadius: 8, marginBottom: 24,
        background: paused ? '#FDF3F0' : '#E3ECE1',
        border: `1px solid ${paused ? '#E8C4BA' : '#C4D9C4'}`,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: paused ? EV_DANGER : EV_SUCCESS }}>
          {paused
            ? '\u23F8 Sending is paused \u2014 nothing fires until resumed'
            : '\u25B6 Sending is active \u2014 cron runs weekdays at 14:00 UTC'}
        </span>
        <button onClick={togglePause} disabled={pauseLoading}
          style={BTN(paused ? EV_SUCCESS : EV_DANGER, '#FFF')}>
          {pauseLoading ? '...' : paused ? 'Resume sending' : 'Pause sending'}
        </button>
      </div>

      {/* ── Panel 1: The flow, stage by stage ─────────────────── */}
      <FlowOverview />

      {/* ── Panel 2: Add a recipient ──────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={NUM_BADGE}>2</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: EV_NAVY, fontFamily: DISPLAY, margin: 0 }}>
            Add a recipient
          </h3>
          <div style={{ flex: 1 }} />
          <button onClick={() => { setBulkMode(false); setPasteMode(!pasteMode); }} style={{ ...BTN(EV_LIGHT, EV_NAVY), fontSize: 11 }}>
            {pasteMode ? 'Single entry' : 'Paste rows'}
          </button>
          <button onClick={() => { setPasteMode(false); setBulkMode(!bulkMode); setBulkPreview(null); setBulkResult(null); }} style={{ ...BTN(EV_LIGHT, EV_NAVY), fontSize: 11 }}>
            {bulkMode ? 'Single entry' : 'Bulk import'}
          </button>
        </div>

        {bulkMode ? (
          <div>
            <div style={LABEL}>Paste CSV or tab-separated rows with a header line: email, first_name, org_name, county, variant, city (optional)</div>
            <textarea
              value={bulkText}
              onChange={e => { setBulkText(e.target.value); setBulkPreview(null); setBulkResult(null); }}
              rows={8}
              placeholder={'email,first_name,org_name,county,variant,city\njane@example.com,Jane,Jane\'s Kitchen,Los Angeles,warm,\njohn@example.com,John,,Los Angeles,cold,Long Beach'}
              style={{ ...INPUT, resize: 'vertical' as const, fontFamily: 'monospace', fontSize: 12 }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={parseBulk} style={BTN(EV_NAVY, '#FFF')}>
                Preview import
              </button>
              {bulkPreview && bulkPreview.some(r => !r.error) && (
                <button onClick={submitBulk} disabled={actionLoading === 'bulk'} style={BTN(EV_EMBER, '#FFF')}>
                  {actionLoading === 'bulk' ? 'Importing...' : `Import ${bulkPreview.filter(r => !r.error).length} valid rows`}
                </button>
              )}
            </div>

            {bulkResult && (
              <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 6, background: '#E3ECE1', fontSize: 13 }}>
                Inserted: {bulkResult.inserted} &middot; Skipped: {bulkResult.skipped} &middot; Invalid: {bulkResult.invalid}
              </div>
            )}

            {bulkPreview && (
              <div style={{ marginTop: 12, maxHeight: 320, overflowY: 'auto', border: `1px solid ${EV_LINE}`, borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: EV_CREAM }}>
                      <th style={TH}>#</th>
                      <th style={TH}>Email</th>
                      <th style={TH}>First name</th>
                      <th style={TH}>Org</th>
                      <th style={TH}>County</th>
                      <th style={TH}>Variant</th>
                      <th style={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreview.map((r, i) => (
                      <tr key={i} style={{ background: r.error ? '#FDF0ED' : '#FFF' }}>
                        <td style={{ padding: '6px 12px', color: EV_MUTED }}>{i + 1}</td>
                        <td style={{ padding: '6px 12px' }}>{r.email || '\u2014'}</td>
                        <td style={{ padding: '6px 12px', color: EV_MUTED }}>{r.first_name || '\u2014'}</td>
                        <td style={{ padding: '6px 12px', color: EV_MUTED }}>{r.org_name || '\u2014'}</td>
                        <td style={{ padding: '6px 12px' }}>{r.county || '\u2014'}</td>
                        <td style={{ padding: '6px 12px' }}>{r.variant}</td>
                        <td style={{ padding: '6px 12px', color: r.error ? EV_DANGER : EV_SUCCESS, fontWeight: 600, fontSize: 11 }}>
                          {r.error || 'Valid'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '8px 12px', fontSize: 11, color: EV_MUTED, borderTop: `1px solid ${EV_LINE}` }}>
                  {bulkPreview.length} rows &middot; {bulkPreview.filter(r => !r.error).length} valid &middot; {bulkPreview.filter(r => r.error).length} excluded
                </div>
              </div>
            )}
          </div>
        ) : pasteMode ? (
          <div>
            <div style={LABEL}>Paste tab-separated rows: email, first_name, org_name, county, variant</div>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              rows={5}
              placeholder={'jane@example.com\tJane\tJane\'s Kitchen\tLos Angeles\tcold\njohn@example.com\tJohn\t\tOrange\twarm'}
              style={{ ...INPUT, resize: 'vertical' as const }}
            />
            <button onClick={handlePaste} disabled={actionLoading === 'paste'}
              style={{ ...BTN(EV_EMBER, '#FFF'), marginTop: 10 }}>
              {actionLoading === 'paste' ? 'Adding...' : 'Add pasted rows'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleAddSingle} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto',
            gap: 10, alignItems: 'end',
          }}>
            <div>
              <div style={LABEL}>Email *</div>
              <input type="email" required value={addEmail} onChange={e => setAddEmail(e.target.value)}
                placeholder="name@example.com" style={INPUT} />
            </div>
            <div>
              <div style={LABEL}>First name</div>
              <input value={addFirstName} onChange={e => setAddFirstName(e.target.value)}
                placeholder="Optional" style={INPUT} />
            </div>
            <div>
              <div style={LABEL}>Org name</div>
              <input value={addOrgName} onChange={e => setAddOrgName(e.target.value)}
                placeholder="Optional" style={INPUT} />
            </div>
            <div>
              <div style={LABEL}>County *</div>
              <select value={addJurId} onChange={e => setAddJurId(e.target.value)} required
                style={{ ...INPUT, background: '#FFF' }}>
                <option value="">Select</option>
                {/* Every active CA jurisdiction, cities included — they are valid
                    briefing targets, so they belong here rather than hidden. */}
                {counties.map((c: any) => (
                  <option key={c.jurisdiction_id} value={c.jurisdiction_id}>{jurLabel(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={LABEL}>Variant</div>
              <select value={addVariant} onChange={e => setAddVariant(e.target.value)}
                style={{ ...INPUT, background: '#FFF' }}>
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
              </select>
            </div>
            <button type="submit" disabled={actionLoading === 'add'} style={BTN(EV_EMBER, '#FFF')}>
              {actionLoading === 'add' ? '...' : 'Add'}
            </button>
          </form>
        )}
      </div>

      {/* ── Panel 3: Schedule + sign-off ──────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={NUM_BADGE}>3</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: EV_NAVY, fontFamily: DISPLAY, margin: 0 }}>
            Schedule + sign-off
          </h3>
          <div style={{ flex: 1 }} />
          <button onClick={addNewStep} disabled={!!actionLoading} style={BTN(EV_NAVY, '#FFF')}>
            {actionLoading === 'add-step' ? '...' : '+ Add step'}
          </button>
        </div>

        <div style={{
          padding: '8px 14px', borderRadius: 6, marginBottom: 16,
          background: '#FDF8EE', border: `1px solid ${EV_LINE}`,
          fontSize: 12, color: EV_WARN, fontWeight: 600,
        }}>
          Editing copy, delay, or trigger clears sign-off. Four jurisdiction sections are auto-generated and locked.
        </div>

        {steps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: EV_MUTED, fontSize: 13 }}>
            No steps defined. Add a step to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {steps.map((step: any) => (
              <div key={step.step_number} style={{
                border: `1px solid ${EV_LINE}`, borderRadius: 8,
                background: editingStep === step.step_number ? EV_CREAM : '#FFF',
                overflow: 'hidden',
              }}>
                {/* Step header */}
                <div
                  onClick={() => editingStep === step.step_number ? setEditingStep(null) : startEditStep(step)}
                  style={{
                    display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 1fr',
                    alignItems: 'center', padding: '12px 16px', cursor: 'pointer', gap: 12,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 800, color: EV_NAVY }}>#{step.step_number}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: EV_NAVY }}>{step.label}</span>
                  <span style={{ fontSize: 11, color: EV_MUTED }}>
                    {step.trigger_type === 'auto' ? 'Auto (cron)' : 'Manual'}
                  </span>
                  <span style={{ fontSize: 11, color: EV_MUTED }}>
                    {step.delay_days > 0 ? `+${step.delay_days}d delay` : 'No delay'}
                  </span>
                  <span style={{ fontSize: 11, color: EV_MUTED }}>
                    {step.variant_scope === 'both' ? 'Cold + Warm' : step.variant_scope}
                  </span>
                  <span>
                    {step.signed_off_at ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                        background: '#E3ECE1', color: EV_SUCCESS,
                      }}>Signed off</span>
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                        background: '#F6E3DF', color: EV_DANGER,
                      }}>Unsigned</span>
                    )}
                    {!step.signed_off_at && (
                      <button
                        onClick={(e) => { e.stopPropagation(); signOffStep(step.step_number); }}
                        disabled={!!actionLoading}
                        style={BTN(EV_SUCCESS, '#FFF')}
                      >
                        {actionLoading === `signoff-${step.step_number}` ? 'Signing…' : 'Sign off'}
                      </button>
                    )}
                  </span>
                </div>

                {/* Expanded editor */}
                {editingStep === step.step_number && (
                  <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${EV_LINE}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
                      <div>
                        <div style={LABEL}>Label</div>
                        <input value={stepForm.label || ''} onChange={e => setStepForm({ ...stepForm, label: e.target.value })} style={INPUT} />
                      </div>
                      <div>
                        <div style={LABEL}>Trigger</div>
                        <select value={stepForm.trigger_type}
                          onChange={e => setStepForm({ ...stepForm, trigger_type: e.target.value })}
                          style={{ ...INPUT, background: '#FFF' }}>
                          <option value="manual">Manual</option>
                          <option value="auto">Auto (cron)</option>
                        </select>
                      </div>
                      <div>
                        <div style={LABEL}>Delay (days)</div>
                        <input type="number" min={0} value={stepForm.delay_days}
                          onChange={e => setStepForm({ ...stepForm, delay_days: parseInt(e.target.value) || 0 })}
                          style={INPUT} />
                      </div>
                      <div>
                        <div style={LABEL}>Variant scope</div>
                        <select value={stepForm.variant_scope}
                          onChange={e => setStepForm({ ...stepForm, variant_scope: e.target.value })}
                          style={{ ...INPUT, background: '#FFF' }}>
                          <option value="both">Both</option>
                          <option value="cold">Cold only</option>
                          <option value="warm">Warm only</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <div style={LABEL}>Subject template</div>
                      <input value={stepForm.subject_template || ''}
                        onChange={e => setStepForm({ ...stepForm, subject_template: e.target.value })}
                        placeholder="{{COUNTY}} County Briefing — How This County Evaluates Commercial Kitchens"
                        style={INPUT} />
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <div style={LABEL}>Body template (framing copy)</div>
                      <textarea value={stepForm.body_template || ''}
                        onChange={e => setStepForm({ ...stepForm, body_template: e.target.value })}
                        rows={4} placeholder="Editable framing around the four locked jurisdiction sections"
                        style={{ ...INPUT, resize: 'vertical' as const }} />
                    </div>

                    {/* Locked sections */}
                    <div style={{
                      marginTop: 14, padding: '10px 14px', borderRadius: 6,
                      background: EV_LIGHT, border: `1px solid ${EV_LINE}`,
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <span style={{ color: EV_MUTED, marginTop: 1, fontSize: 13 }}>{'\uD83D\uDD12'}</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: EV_NAVY, marginBottom: 4 }}>
                          Locked jurisdiction sections (auto-generated at send time)
                        </div>
                        <div style={{ fontSize: 11, color: EV_MUTED, lineHeight: 1.6 }}>
                          Who Inspects You &middot; How This County Evaluates &middot; What It Weights Heaviest &middot; Hood Cleaning Frequency
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingStep(null)} style={BTN(EV_LIGHT, EV_NAVY)}>Cancel</button>
                      <button onClick={saveStep} disabled={actionLoading === `save-step-${editingStep}`}
                        style={BTN(EV_NAVY, '#FFF')}>
                        {actionLoading === `save-step-${editingStep}` ? 'Saving...' : 'Save'}
                      </button>
                      {!step.signed_off_at && (
                        <button onClick={() => signOffStep(step.step_number)} disabled={!!actionLoading}
                          style={BTN(EV_SUCCESS, '#FFF')}>
                          {actionLoading === `signoff-${step.step_number}` ? '...' : 'Sign off'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Panel 4: County review ────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={NUM_BADGE}>4</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: EV_NAVY, fontFamily: DISPLAY, margin: 0 }}>
            County review
          </h3>
        </div>

        {/* Standalone preview — any jurisdiction */}
        <div style={{
          display: 'flex', flexWrap: 'wrap' as const, alignItems: 'end', gap: 10,
          padding: '14px 16px', borderRadius: 8, marginBottom: 16,
          background: EV_LIGHT, border: `1px solid ${EV_LINE}`,
        }}>
          <div style={{ flex: '0 0 auto' }}>
            <div style={LABEL}>Preview any jurisdiction ({counties.length})</div>
            <select
              value={previewAnyJurId}
              onChange={e => setPreviewAnyJurId(e.target.value)}
              style={{ ...INPUT, width: 320, background: '#FFF' }}
            >
              <option value="">Select a jurisdiction</option>
              {counties.map((c: any) => (
                <option key={c.jurisdiction_id} value={c.jurisdiction_id}>
                  {jurLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              if (!previewAnyJurId) return;
              const sel = counties.find((c: any) => c.jurisdiction_id === previewAnyJurId);
              if (sel) handlePreview(sel.county, undefined, sel.jurisdiction_id);
            }}
            disabled={!previewAnyJurId || !!actionLoading}
            style={{
              ...BTN(EV_NAVY, '#FFF'),
              opacity: previewAnyJurId ? 1 : 0.4,
              cursor: previewAnyJurId ? 'pointer' : 'not-allowed',
            }}
          >
            {actionLoading === `preview-${previewAnyJurId}` ? 'Loading...' : 'Preview'}
          </button>
          {previewCounty && (
            <button
              onClick={() => { setPreviewHtml(null); setPreviewCounty(null); }}
              style={BTN(EV_LIGHT, EV_NAVY)}
            >
              Close preview
            </button>
          )}
        </div>

        {/* Standalone preview render */}
        {previewHtml && previewCounty && (
          <div style={{
            border: `1px solid ${EV_LINE}`, borderRadius: 8,
            overflow: 'auto', maxHeight: 600, background: '#FFF',
            marginBottom: 16,
          }}>
            <div style={{
              padding: '8px 16px', background: EV_CREAM, borderBottom: `1px solid ${EV_LINE}`,
              fontSize: 12, fontWeight: 700, color: EV_NAVY,
            }}>
              {previewCounty} County briefing preview
            </div>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        )}

        {countiesWithRecipients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: EV_MUTED, fontSize: 13 }}>
            No counties with recipients. Add recipients above to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {countiesWithRecipients.map((c: any) => {
              const status = getCountyStatus(c, recipients);
              const isExpanded = expandedCounty === c.county;
              const countyRecs = recipients.filter((r: any) => r.county === c.county);
              const variants = [...new Set(countyRecs.map((r: any) => r.variant))].join(', ');
              const gc = c.grading_config as Record<string, any> | null;

              return (
                <div key={c.county} style={{
                  border: `1px solid ${EV_LINE}`, borderRadius: 8,
                  background: isExpanded ? EV_CREAM : '#FFF', overflow: 'hidden',
                }}>
                  {/* Row header */}
                  <div
                    onClick={() => setExpandedCounty(isExpanded ? null : c.county)}
                    style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                      alignItems: 'center', padding: '12px 16px', cursor: 'pointer', gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: EV_NAVY }}>{c.county} County</span>
                    <span style={{ fontSize: 12, color: EV_MUTED }}>{countyRecs.length} recipient{countyRecs.length !== 1 ? 's' : ''}</span>
                    <span style={{ fontSize: 11, color: EV_MUTED }}>{variants || '\u2014'}</span>
                    <Badge status={status} reason={status === 'blocked' ? c.block_reason : c.lapse_reason} />
                    <span style={{ fontSize: 12, color: EV_MUTED, textAlign: 'right' as const }}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${EV_LINE}` }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>

                        {/* LEFT: Email preview */}
                        <div>
                          <div style={{ ...LABEL, marginBottom: 8 }}>Email preview</div>
                          {previewCounty === c.county && previewHtml ? (
                            <div style={{
                              border: `1px solid ${EV_LINE}`, borderRadius: 6, overflow: 'auto',
                              maxHeight: 500, background: '#FFF',
                            }}>
                              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: 40, background: '#FFF', borderRadius: 6, border: `1px solid ${EV_LINE}` }}>
                              <button
                                onClick={() => handlePreview(c.county)}
                                disabled={!!actionLoading}
                                style={BTN(EV_NAVY, '#FFF')}
                              >
                                {actionLoading === `preview-${c.county}` ? 'Loading...' : 'Load preview'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* RIGHT: Evaluate data panel */}
                        <div>
                          <div style={{ ...LABEL, marginBottom: 8 }}>Evaluate data (jurisdiction row)</div>
                          <div style={{
                            background: '#FFF', border: `1px solid ${EV_LINE}`, borderRadius: 6,
                            padding: 16, fontSize: 13,
                          }}>
                            {editingJur === c.county ? (
                              <>
                                <div style={{ marginBottom: 10 }}>
                                  <div style={LABEL}>Grading type</div>
                                  <select value={jurForm.grading_type || ''}
                                    onChange={e => setJurForm({ ...jurForm, grading_type: e.target.value })}
                                    style={{ ...INPUT, background: '#FFF' }}>
                                    <option value="letter_grade">Letter grade</option>
                                    <option value="score_100">Score (0-100)</option>
                                    <option value="color_placard">Color placard</option>
                                    <option value="report_only">Report only</option>
                                    <option value="score_negative">Negative scale</option>
                                    <option value="letter_grade_strict">Letter grade (strict)</option>
                                  </select>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                  <div style={LABEL}>Agency name</div>
                                  <input value={jurForm.agency_name || ''}
                                    onChange={e => setJurForm({ ...jurForm, agency_name: e.target.value })}
                                    style={INPUT} />
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                  <div style={LABEL}>Verified status</div>
                                  <select value={jurForm.jie_audit_status || 'unknown'}
                                    onChange={e => setJurForm({ ...jurForm, jie_audit_status: e.target.value })}
                                    style={{ ...INPUT, background: '#FFF' }}>
                                    <option value="verified">Verified</option>
                                    <option value="needs_review">Needs review</option>
                                    <option value="unknown">Unknown</option>
                                  </select>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                  <div style={LABEL}>Tiers (JSON)</div>
                                  <textarea value={jurForm.tiers_json || '{}'}
                                    onChange={e => setJurForm({ ...jurForm, tiers_json: e.target.value })}
                                    rows={5} style={{ ...INPUT, fontFamily: 'monospace', fontSize: 11, resize: 'vertical' as const }} />
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                  <div style={LABEL}>Point weights (JSON)</div>
                                  <textarea value={jurForm.point_values_json || '{}'}
                                    onChange={e => setJurForm({ ...jurForm, point_values_json: e.target.value })}
                                    rows={5} style={{ ...INPUT, fontFamily: 'monospace', fontSize: 11, resize: 'vertical' as const }} />
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${EV_LINE}` }}>
                                  <button onClick={() => { setEditingJur(null); setJurForm({}); }}
                                    style={BTN(EV_LIGHT, EV_NAVY)}>Cancel</button>
                                  <button onClick={() => buildJurConfirm(c)}
                                    style={BTN(EV_NAVY, '#FFF')}>Review changes</button>
                                </div>
                              </>
                            ) : (
                              <>
                                <EvalDataRow label="Method" value={c.grading_type || 'none'} />
                                <EvalDataRow label="Agency" value={c.agency_name || '\u2014'} />
                                <EvalDataRow label="Verified" value={
                                  c.jie_audit_status === 'verified'
                                    ? '\u2705 verified'
                                    : `\u26A0 ${c.jie_audit_status || 'unknown'}`
                                } />
                                {gc?.tiers && typeof gc.tiers === 'object' && !Array.isArray(gc.tiers) && (
                                  <div style={{ marginTop: 8 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: EV_MUTED, marginBottom: 4 }}>Tiers</div>
                                    {Object.entries(gc.tiers).map(([name, range]: [string, any]) => (
                                      <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: EV_NAVY, padding: '2px 0' }}>
                                        <span>{name}</span>
                                        <span style={{ color: EV_MUTED }}>
                                          {Array.isArray(range) ? (range[1] != null ? `${range[0]}\u2013${range[1]}` : `${range[0]}+`) : String(range)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {gc?.point_values && typeof gc.point_values === 'object' && (
                                  <div style={{ marginTop: 8 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: EV_MUTED, marginBottom: 4 }}>Point weights</div>
                                    {Object.entries(gc.point_values).map(([cat, pts]: [string, any]) => (
                                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: EV_NAVY, padding: '2px 0' }}>
                                        <span>{cat.replace(/_/g, ' ')}</span>
                                        <span style={{ fontWeight: 600 }}>{pts} pts</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${EV_LINE}` }}>
                                  <button onClick={() => startEditJur(c)}
                                    style={BTN(EV_EMBER, '#FFF')}>
                                    Edit jurisdiction
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* RECIPIENTS sub-table */}
                      <div style={{ marginTop: 16 }}>
                        <div style={{ ...LABEL, marginBottom: 8 }}>Recipients</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: `2px solid ${EV_LINE}` }}>
                              {['Email', 'Name', 'Variant', 'Status', 'Reason'].map(h => (
                                <th key={h} style={TH}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {countyRecs.map((r: any) => {
                              const rs = REC_STATUS[r.status] || REC_STATUS.queued;
                              return (
                                <tr key={r.id} style={{ borderBottom: `1px solid ${EV_LINE}` }}>
                                  <td style={{ padding: '6px 10px', fontWeight: 600, color: EV_NAVY }}>{r.email}</td>
                                  <td style={{ padding: '6px 10px', color: EV_MUTED }}>{r.first_name || '\u2014'}</td>
                                  <td style={{ padding: '6px 10px' }}>
                                    <span style={{
                                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                      background: r.variant === 'warm' ? '#F6E9E3' : EV_LIGHT,
                                      color: r.variant === 'warm' ? EV_EMBER : EV_MUTED,
                                    }}>{r.variant}</span>
                                  </td>
                                  <td style={{ padding: '6px 10px' }}>
                                    <span style={{
                                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                                      background: rs.bg, color: rs.fg,
                                    }}>{r.status}</span>
                                  </td>
                                  <td style={{ padding: '6px 10px', fontSize: 11, color: r.hold_reason ? EV_WARN : EV_FAINT }}>
                                    {r.hold_reason || '\u2014'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* ACTION BAR */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
                        {status !== 'approved' && status !== 'sent' && status !== 'blocked' && (
                          <button
                            onClick={() => handleApprove(c.county)}
                            disabled={!!actionLoading}
                            style={BTN('#E3ECE1', EV_SUCCESS)}
                          >
                            {actionLoading === `approve-${c.county}` ? '...' : 'Approve'}
                          </button>
                        )}
                        <button
                          disabled={status !== 'approved' || !!actionLoading || paused}
                          title={status !== 'approved' ? 'Approve first' : paused ? 'Sending is paused' : `Send to ${countyRecs.filter((r: any) => r.status === 'queued').length} recipient(s)`}
                          onClick={() => {
                            const queued = countyRecs.filter((r: any) => r.status === 'queued').length;
                            if (queued === 0) { flash(`No queued recipients for ${c.county}`); return; }
                            handleSend(c.county, queued);
                          }}
                          style={{
                            ...BTN(EV_NAVY, '#FFF'),
                            cursor: status === 'approved' && !paused ? 'pointer' : 'not-allowed',
                            opacity: status === 'approved' ? 1 : 0.3,
                          }}
                        >
                          {actionLoading === `send-${c.county}` ? 'Sending...' : 'Send now'}
                        </button>
                        <button
                          disabled
                          title="Schedule not wired yet"
                          style={{ ...BTN(EV_LIGHT, EV_NAVY), cursor: 'not-allowed', opacity: status === 'approved' ? 0.6 : 0.3 }}
                        >
                          Schedule
                        </button>
                        {status !== 'approved' && status !== 'sent' && (
                          <span style={{ fontSize: 10, color: EV_MUTED, marginLeft: 4 }}>Approve first to enable send</span>
                        )}
                        {status === 'approved' && paused && (
                          <span style={{ fontSize: 10, color: EV_WARN, marginLeft: 4 }}>Sending is paused</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Panel 5: Cold handoff ─────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={NUM_BADGE}>5</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: EV_NAVY, fontFamily: DISPLAY, margin: 0 }}>
            Cold handoff
          </h3>
          <div style={{ flex: 1 }} />
          <button onClick={exportCold} style={BTN(EV_NAVY, '#FFF')}>Export for HubSpot</button>
        </div>
        <p style={{ fontSize: 12, color: EV_MUTED, marginBottom: 14 }}>
          Cold recipients never send from EvidLY. Export their list for HubSpot.
        </p>
        <ColdTable recipients={recipients} counties={counties} />
      </div>

      {/* ── Panel 6: Queue ────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={NUM_BADGE}>6</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: EV_NAVY, fontFamily: DISPLAY, margin: 0 }}>
            Queue
          </h3>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['all', 'queued', 'held', 'sent', 'failed'] as const).map(f => (
            <button key={f} onClick={() => setQueueFilter(f)} style={{
              padding: '5px 12px', borderRadius: 20,
              border: `1px solid ${queueFilter === f ? EV_NAVY : EV_LINE}`,
              background: queueFilter === f ? EV_NAVY : '#FFF',
              color: queueFilter === f ? '#FFF' : EV_MUTED,
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: BODY,
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({queueCounts[f as keyof typeof queueCounts]})
            </button>
          ))}
        </div>

        {filteredRecipients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: EV_MUTED, fontSize: 13 }}>
            {queueFilter === 'all' ? 'No recipients yet.' : `No ${queueFilter} recipients.`}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${EV_LINE}` }}>
                  {['Email', 'County', 'Variant', 'Step', 'Status', 'Reason', 'Date'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecipients.slice(0, 100).map((r: any) => {
                  const rs = REC_STATUS[r.status] || REC_STATUS.queued;
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${EV_LINE}` }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: EV_NAVY }}>{r.email}</td>
                      <td style={{ padding: '8px 10px', color: EV_MUTED }}>{r.county}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                          background: r.variant === 'warm' ? '#F6E9E3' : EV_LIGHT,
                          color: r.variant === 'warm' ? EV_EMBER : EV_MUTED,
                        }}>{r.variant}</span>
                      </td>
                      <td style={{ padding: '8px 10px', color: EV_MUTED }}>{r.step_number}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: rs.bg, color: rs.fg,
                        }}>{r.status}</span>
                      </td>
                      <td style={{
                        padding: '8px 10px', fontSize: 11,
                        color: r.hold_reason ? EV_WARN : EV_FAINT,
                        fontWeight: r.hold_reason ? 600 : 400,
                      }}>
                        {r.hold_reason || (r.status === 'sent' && r.sent_at
                          ? `Sent ${new Date(r.sent_at).toLocaleDateString()}`
                          : '\u2014')}
                      </td>
                      <td style={{ padding: '8px 10px', color: EV_FAINT, fontSize: 11 }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredRecipients.length > 100 && (
              <div style={{ textAlign: 'center', padding: 12, color: EV_MUTED, fontSize: 12 }}>
                Showing 100 of {filteredRecipients.length}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Panel 7: Clients not in the briefing queue ─────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={NUM_BADGE}>7</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: EV_NAVY, fontFamily: DISPLAY, margin: 0 }}>
            Clients not in the briefing queue
          </h3>
          <span style={{ fontSize: 12, color: EV_MUTED }}>{missingClients.length} org{missingClients.length !== 1 ? 's' : ''}</span>
        </div>

        {missingClients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: EV_MUTED, fontSize: 13 }}>
            All active organizations are in the briefing queue.
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto', border: `1px solid ${EV_LINE}`, borderRadius: 6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: EV_CREAM }}>
                  {['Org name', 'Contact email', 'County', 'Created', 'Status', ''].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {missingClients.map(c => {
                  const tagColors: Record<string, { bg: string; fg: string }> = {
                    'Ready to enroll': { bg: '#E3ECE1', fg: EV_SUCCESS },
                    'County not resolved': { bg: '#F7EDD3', fg: EV_WARN },
                    'No contact email': { bg: '#F6E3DF', fg: EV_DANGER },
                  };
                  const tag = tagColors[c.reason] || { bg: EV_FAINT, fg: EV_MUTED };
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${EV_LINE}` }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: EV_NAVY }}>{c.name}</td>
                      <td style={{ padding: '8px 12px', color: c.email ? EV_MUTED : EV_DANGER }}>
                        {c.email || 'none on file'}
                      </td>
                      <td style={{ padding: '8px 12px', color: c.county ? EV_MUTED : EV_WARN }}>
                        {c.county || 'not resolved'}
                      </td>
                      <td style={{ padding: '8px 12px', color: EV_FAINT, fontSize: 11 }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: tag.bg, color: tag.fg,
                        }}>{c.reason}</span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {c.reason === 'Ready to enroll' && (
                          <button
                            onClick={() => enrollMissing(c)}
                            disabled={enrollingId === c.id}
                            style={{ ...BTN(EV_EMBER, '#FFF'), fontSize: 11, padding: '4px 10px' }}
                          >
                            {enrollingId === c.id ? '...' : 'Enroll'}
                          </button>
                        )}
                        {c.reason === 'County not resolved' && (
                          <span style={{ fontSize: 10, color: EV_WARN, fontWeight: 600 }}>Check location</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Jurisdiction edit confirm dialog ──────────────── */}
      {jurConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#FFF', borderRadius: 12, padding: 28, maxWidth: 600, width: '90%',
            maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: EV_NAVY, fontFamily: DISPLAY, margin: '0 0 16px' }}>
              Confirm edit &mdash; {jurConfirm.county} County
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${EV_LINE}` }}>
                  <th style={{ ...TH, width: '25%' }}>Field</th>
                  <th style={TH}>Before</th>
                  <th style={TH}>After</th>
                </tr>
              </thead>
              <tbody>
                {jurConfirm.changes.map(ch => (
                  <tr key={ch.field} style={{ borderBottom: `1px solid ${EV_LINE}` }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: EV_NAVY }}>{ch.field}</td>
                    <td style={{ padding: '8px 10px', color: EV_MUTED, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap' as const }}>{ch.before}</td>
                    <td style={{ padding: '8px 10px', color: EV_NAVY, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap' as const }}>{ch.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{
              padding: '10px 14px', borderRadius: 6, marginBottom: 16,
              background: '#FDF8EE', border: `1px solid #E8C4BA`, fontSize: 12, color: EV_WARN, lineHeight: 1.6,
            }}>
              This writes to the shared <strong>jurisdictions</strong> row for {jurConfirm.county} County.
              It will change the county briefing email content for all recipients.
              The edit will be logged to <strong>jurisdiction_edits</strong> for audit.
            </div>
            {jurConfirm.changes.some(ch => ch.field === 'Grading type' || ch.field === 'Tiers' || ch.field === 'Point weights') && (
              <label style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16,
                padding: '10px 14px', borderRadius: 6, background: EV_LIGHT, border: `1px solid ${EV_LINE}`,
                fontSize: 12, color: EV_NAVY, cursor: 'pointer',
              }}>
                <input type="checkbox" checked={sourceConfirmed}
                  onChange={e => setSourceConfirmed(e.target.checked)}
                  style={{ marginTop: 2 }} />
                <span>
                  <strong>I confirmed this against a primary source.</strong>{' '}
                  If unchecked, the verified flag will be set to <em>needs_review</em> on save.
                </span>
              </label>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setJurConfirm(null); setSourceConfirmed(false); }}
                style={BTN(EV_LIGHT, EV_NAVY)}>Cancel</button>
              <button onClick={handleJurWrite} disabled={actionLoading === 'jur-write'}
                style={BTN(EV_EMBER, '#FFF')}>
                {actionLoading === 'jur-write' ? 'Writing...' : 'Confirm + write'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal removed — preview is now inline per county row */}
    </div>
  );
}

// ── Eval data row helper ─────────────────────────────────────────

function EvalDataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: EV_MUTED, fontWeight: 600 }}>{label}</span>
      <span style={{ color: EV_NAVY, textAlign: 'right' as const, maxWidth: '60%', wordBreak: 'break-word' as const }}>{value}</span>
    </div>
  );
}

// ── Cold table sub-component ─────────────────────────────────────

function ColdTable({ recipients, counties }: { recipients: any[]; counties: any[] }) {
  const coldQueued = recipients.filter((r: any) => r.variant === 'cold' && r.status === 'queued');
  const approvedCounties = new Set(
    counties.filter((c: any) => getCountyStatus(c) === 'approved').map((c: any) => c.county)
  );
  const coldByCounty: Record<string, number> = {};
  for (const r of coldQueued) {
    coldByCounty[r.county] = (coldByCounty[r.county] || 0) + 1;
  }
  const entries = Object.entries(coldByCounty).sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 20, color: EV_MUTED, fontSize: 13 }}>
        No cold recipients queued.
      </div>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: `2px solid ${EV_LINE}` }}>
          {['County', 'Cold queued', 'County approved'].map(h => (
            <th key={h} style={TH}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.map(([county, count]) => (
          <tr key={county} style={{ borderBottom: `1px solid ${EV_LINE}` }}>
            <td style={{ padding: '10px 12px', fontWeight: 600, color: EV_NAVY }}>{county}</td>
            <td style={{ padding: '10px 12px', color: EV_MUTED }}>{count}</td>
            <td style={{ padding: '10px 12px' }}>
              {approvedCounties.has(county) ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: EV_SUCCESS }}>Yes</span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: EV_WARN }}>No</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
