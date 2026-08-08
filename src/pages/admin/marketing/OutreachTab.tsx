/**
 * OutreachTab — six-panel outreach surface inside the Marketing console.
 *
 * Panels (in workflow order):
 *   1. How to run this      — staff guide
 *   2. Add a recipient      — single or pasted rows
 *   3. Schedule + sign-off  — step definitions, sign-off gate
 *   4. County review        — approval table (moved from standalone page)
 *   5. Cold handoff         — export cold recipients for HubSpot
 *   6. Queue                — all recipients, hold reasons inline
 *
 * Master pause toggle above everything — nothing sends while it is off.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  EV_NAVY, EV_EMBER, EV_MUTED, EV_FAINT, EV_LINE,
  EV_PAPER, EV_CREAM, EV_LIGHT, EV_SUCCESS, EV_WARN, EV_DANGER,
  DISPLAY, BODY,
} from './marketingTokens';

// ── Inline style helpers ─────────────────────────────────────────

const LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
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
  textTransform: 'uppercase', color: EV_MUTED,
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
  const [addCounty, setAddCounty] = useState('');
  const [addVariant, setAddVariant] = useState('cold');
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Step editor
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [stepForm, setStepForm] = useState<any>({});

  // County review — expanded row
  const [expandedCounty, setExpandedCounty] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewCounty, setPreviewCounty] = useState<string | null>(null);
  const [editingJur, setEditingJur] = useState<string | null>(null);
  const [jurForm, setJurForm] = useState<any>({});

  // Queue filter
  const [queueFilter, setQueueFilter] = useState('all');

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Data loading ─────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    const [stepsRes, countiesRes, recipientsRes] = await Promise.all([
      supabase.functions.invoke('county-briefing', { body: { action: 'list-steps' } }),
      supabase.functions.invoke('county-briefing', { body: { action: 'list' } }),
      supabase.from('county_briefing_recipients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const allSteps = stepsRes.data?.steps || [];
    setSteps(allSteps.filter((s: any) => s.step_number > 0));

    const masterRow = allSteps.find((s: any) => s.step_number === 0);
    setPaused(masterRow ? !masterRow.is_active : false);

    setCounties(countiesRes.data?.counties || []);
    setRecipients(recipientsRes.data || []);
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
    if (!addEmail || !addCounty) return;
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
        county: parts[3] || addCounty,
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

  const handlePreview = async (county: string, variant?: string) => {
    setActionLoading(`preview-${county}`);
    const { data, error } = await supabase.functions.invoke('county-briefing', {
      body: { action: 'preview', county, variant: variant || 'cold' },
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

      {/* ── Panel 1: How to run this ──────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={NUM_BADGE}>1</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: EV_NAVY, fontFamily: DISPLAY, margin: 0 }}>
            How to run this
          </h3>
        </div>
        <ol style={{ margin: 0, paddingLeft: 20, color: EV_MUTED, fontSize: 13, lineHeight: 2.0 }}>
          <li><strong style={{ color: EV_NAVY }}>Add recipients</strong> — email + county + cold or warm variant</li>
          <li><strong style={{ color: EV_NAVY }}>Define steps</strong> — sequence number, delay days, trigger type (manual or auto-cron)</li>
          <li><strong style={{ color: EV_NAVY }}>Edit copy</strong> — subject + body framing; four jurisdiction sections are locked</li>
          <li><strong style={{ color: EV_NAVY }}>Sign off each step</strong> — editing copy, delay, or trigger clears sign-off</li>
          <li><strong style={{ color: EV_NAVY }}>Approve each county</strong> — jurisdiction data change lapses the approval</li>
          <li><strong style={{ color: EV_NAVY }}>Send</strong> — warm sends from here, cold exports to HubSpot</li>
        </ol>
      </div>

      {/* ── Panel 2: Add a recipient ──────────────────────────── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={NUM_BADGE}>2</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: EV_NAVY, fontFamily: DISPLAY, margin: 0 }}>
            Add a recipient
          </h3>
          <div style={{ flex: 1 }} />
          <button onClick={() => setPasteMode(!pasteMode)} style={{ ...BTN(EV_LIGHT, EV_NAVY), fontSize: 11 }}>
            {pasteMode ? 'Single entry' : 'Paste rows'}
          </button>
        </div>

        {pasteMode ? (
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
              <select value={addCounty} onChange={e => setAddCounty(e.target.value)} required
                style={{ ...INPUT, background: '#FFF' }}>
                <option value="">Select</option>
                {counties.map((c: any) => <option key={c.county} value={c.county}>{c.county}</option>)}
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
                            <EvalDataRow label="Method" value={c.grading_type || 'none'} />
                            <EvalDataRow label="Agency" value={c.agency_name || '\u2014'} />
                            <EvalDataRow label="Verified" value={
                              c.jie_audit_status === 'verified'
                                ? '\u2705 verified'
                                : `\u26A0 ${c.jie_audit_status || 'unknown'}`
                            } />
                            {gc?.tiers && typeof gc.tiers === 'object' && !Array.isArray(gc.tiers) && (
                              <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: EV_MUTED, marginBottom: 4 }}>Tiers</div>
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
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: EV_MUTED, marginBottom: 4 }}>Point weights</div>
                                {Object.entries(gc.point_values).map(([cat, pts]: [string, any]) => (
                                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: EV_NAVY, padding: '2px 0' }}>
                                    <span>{cat.replace(/_/g, ' ')}</span>
                                    <span style={{ fontWeight: 600 }}>{pts} pts</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${EV_LINE}` }}>
                              <button
                                disabled
                                title="Jurisdiction write not wired yet"
                                style={{ ...BTN(EV_LIGHT, EV_MUTED), cursor: 'not-allowed', opacity: 0.6 }}
                              >
                                Edit jurisdiction
                              </button>
                              <span style={{ fontSize: 10, color: EV_MUTED, marginLeft: 8 }}>Not wired yet</span>
                            </div>
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
