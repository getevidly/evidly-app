import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle2, Clock, Camera, FileText, Thermometer,
  User, MapPin, Phone, Download, Printer, Shield, Share2,
  DollarSign, Truck, AlertTriangle, Siren,
} from 'lucide-react';
import {
  activeIncidentPlaybooks, playbookTemplates, demoFoodDisposition,
  demoVendorContacts, demoInsuranceClaim, type PlaybookSeverity,
} from '../data/demoData';

// ── Severity badge config (matches existing pattern) ─────────────────────────
const SEVERITY_CONFIG: Record<PlaybookSeverity, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical', bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  high:     { label: 'High',     bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
  medium:   { label: 'Medium',   bg: '#fefce8', text: '#854d0e', border: '#fde047' },
  low:      { label: 'Low',      bg: '#f0fdf4', text: '#166534', border: '#86efac' },
};

// ── Decision badge colors for food disposition ───────────────────────────────
const DECISION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  keep:     { bg: '#dcfce7', text: '#166534', label: 'Keep' },
  discard:  { bg: '#fef2f2', text: '#991b1b', label: 'Discard' },
  cook_now: { bg: '#fefce8', text: '#854d0e', label: 'Cook Now' },
  refreeze: { bg: '#dbeafe', text: '#1e40af', label: 'Refreeze' },
};

// ── Insurance status badge ───────────────────────────────────────────────────
const INSURANCE_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  draft:        { bg: '#f1f5f9', text: '#475569', label: 'Draft' },
  filed:        { bg: '#dbeafe', text: '#1e40af', label: 'Filed' },
  under_review: { bg: '#fefce8', text: '#854d0e', label: 'Under Review' },
  approved:     { bg: '#dcfce7', text: '#166534', label: 'Approved' },
  denied:       { bg: '#fef2f2', text: '#991b1b', label: 'Denied' },
};

const font: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

// ── Helper: format ISO string to readable time ───────────────────────────────
function fmtTime(iso: string | null): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function diffMinutes(start: string | null, end: string | null): string {
  if (!start || !end) return '--';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function totalDuration(start: string | null, end: string | null): string {
  if (!start || !end) return 'Ongoing';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hrs = Math.round(ms / 3600000 * 10) / 10;
  if (hrs < 1) {
    const mins = Math.round(ms / 60000);
    return `${mins} minutes`;
  }
  return `${hrs} hours`;
}

// ── Step node color helper ───────────────────────────────────────────────────
function stepCircleColor(status: string, stepIndex: number): string {
  if (status === 'skipped') return '#dc2626';
  if (status === 'pending') return '#d1d5db';
  if (status === 'in_progress') return '#3b82f6';
  // completed — mark steps 4+ as "completed late" (yellow) for demo
  if (stepIndex >= 3) return '#f59e0b';
  return '#22c55e';
}

export function PlaybookTimeline() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const incident = activeIncidentPlaybooks.find(i => i.id === id);
  const template = incident ? playbookTemplates.find(t => t.id === incident.templateId) : null;

  // ── Not found state ──────────────────────────────────────────────────────
  if (!incident || !template) {
    return (
      <div style={{ ...font, padding: 40, textAlign: 'center' }}>
        <AlertTriangle size={48} color="#d4af37" style={{ marginBottom: 16 }} />
        <h2 style={{ color: '#1e4d6b', fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>
          Incident Not Found
        </h2>
        <p style={{ color: '#64748b', fontSize: 15, marginBottom: 24 }}>
          No incident with ID "{id}" was found in the system.
        </p>
        <button
          onClick={() => navigate('/playbooks')}
          style={{
            ...font, background: '#1e4d6b', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Back to Playbooks
        </button>
      </div>
    );
  }

  const sev = SEVERITY_CONFIG[incident.severity];

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div style={{ ...font, maxWidth: 960, margin: '0 auto', padding: '24px 16px 64px' }}>

      {/* ── Back Link ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/playbooks')}
        style={{
          ...font, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none',
          border: 'none', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          padding: 0, marginBottom: 20,
        }}
      >
        <ArrowLeft size={16} /> Back to Playbooks
      </button>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#1e4d6b' }}>
            {incident.templateTitle}
          </h1>
          <span style={{
            display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '3px 10px',
            borderRadius: 999, background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`,
          }}>
            {sev.label}
          </span>
          {incident.status === 'completed' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700,
              padding: '3px 10px', borderRadius: 999, background: '#dcfce7', color: '#166534',
              border: '1px solid #86efac',
            }}>
              <CheckCircle2 size={13} /> Completed
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 14, color: '#475569' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={15} color="#64748b" /> {incident.location}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <User size={15} color="#64748b" /> Initiated by {incident.initiatedBy}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Clock size={15} color="#64748b" />
            {fmtDate(incident.initiatedAt)} at {fmtTime(incident.initiatedAt)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Siren size={15} color="#64748b" />
            Duration: {totalDuration(incident.initiatedAt, incident.completedAt)}
          </span>
        </div>
      </div>

      {/* ── Vertical Timeline ──────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e4d6b', margin: '0 0 20px' }}>
        Step-by-Step Timeline
      </h2>
      <div style={{ position: 'relative', paddingLeft: 36, marginBottom: 40 }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 13, top: 4, bottom: 4, width: 2,
          background: '#1e4d6b', borderRadius: 1,
        }} />

        {template.steps.map((step, idx) => {
          const log = incident.stepLogs[idx];
          const circleColor = stepCircleColor(log?.status || 'pending', idx);
          const actionTotal = step.actionItems.length;
          const actionDone = log ? log.actionItemsCompleted.length : 0;

          return (
            <div key={step.id} style={{ position: 'relative', marginBottom: idx < template.steps.length - 1 ? 28 : 0 }}>
              {/* Circle node */}
              <div style={{
                position: 'absolute', left: -36 + 5, top: 2, width: 18, height: 18,
                borderRadius: '50%', background: circleColor, border: '3px solid #fff',
                boxShadow: `0 0 0 2px ${circleColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {log?.status === 'completed' && <CheckCircle2 size={11} color="#fff" />}
                {log?.status === 'in_progress' && <Clock size={11} color="#fff" />}
              </div>

              {/* Step content */}
              <div style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                padding: '16px 20px',
                borderLeft: `3px solid ${circleColor}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#fff', background: '#1e4d6b',
                    borderRadius: 999, width: 22, height: 22, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {step.stepNumber}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    {step.title}
                  </span>
                </div>

                {/* Timestamps */}
                {log && log.startedAt && (
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                    Started: {fmtTime(log.startedAt)}
                    {log.completedAt && (
                      <> &mdash; Completed: {fmtTime(log.completedAt)} ({diffMinutes(log.startedAt, log.completedAt)})</>
                    )}
                    {!log.completedAt && log.status === 'in_progress' && (
                      <span style={{ color: '#3b82f6', fontWeight: 600 }}> &mdash; In Progress</span>
                    )}
                  </div>
                )}
                {log?.status === 'pending' && (
                  <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Pending</div>
                )}

                {/* Completed by */}
                {log?.status === 'completed' && (
                  <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
                    Completed by <strong>{incident.initiatedBy}</strong>
                  </div>
                )}

                {/* Notes */}
                {log && log.notes && (
                  <div style={{
                    fontSize: 13, color: '#334155', marginTop: 8, padding: '8px 12px',
                    background: '#f8fafc', borderRadius: 6, lineHeight: 1.5,
                  }}>
                    {log.notes}
                  </div>
                )}

                {/* Meta row: photos + action items */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, fontSize: 13 }}>
                  {log && log.photosTaken > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      color: '#1e4d6b', fontWeight: 600,
                    }}>
                      <Camera size={14} /> {log.photosTaken} photo{log.photosTaken > 1 ? 's' : ''}
                    </span>
                  )}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    color: actionDone === actionTotal && actionTotal > 0 ? '#16a34a' : '#64748b',
                    fontWeight: 600,
                  }}>
                    <CheckCircle2 size={14} /> {actionDone}/{actionTotal} items completed
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Food Disposition Summary ──────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
        borderTop: `4px solid #d4af37`, padding: '20px 24px', marginBottom: 28,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e4d6b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Thermometer size={18} color="#d4af37" /> Food Disposition Summary
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                {['Food Item', 'Qty', 'Temp', 'Decision', 'Cost'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 10px', color: '#64748b',
                    fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {demoFoodDisposition.map(item => {
                const dec = DECISION_COLORS[item.decision] || DECISION_COLORS.keep;
                const cost = item.quantity * item.costPerUnit;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: '#0f172a' }}>
                      {item.foodName}
                    </td>
                    <td style={{ padding: '10px 10px', color: '#475569' }}>
                      {item.quantity} {item.unit}
                    </td>
                    <td style={{ padding: '10px 10px', color: item.currentTemp > 41 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                      {item.currentTemp}&deg;F
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 999, background: dec.bg, color: dec.text,
                      }}>
                        {dec.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 10px', color: '#475569', fontWeight: 600 }}>
                      ${cost.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer — total loss + insurance */}
        {(() => {
          const totalLoss = demoFoodDisposition
            .filter(i => i.decision === 'discard')
            .reduce((sum, i) => sum + i.quantity * i.costPerUnit, 0);
          return (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 12, marginTop: 14, paddingTop: 14,
              borderTop: '2px solid #e2e8f0', fontSize: 14,
            }}>
              <span style={{ fontWeight: 700, color: '#991b1b' }}>
                <DollarSign size={15} style={{ verticalAlign: -2 }} /> Total Loss (discarded): ${totalLoss.toFixed(2)}
              </span>
              <span style={{ color: '#475569' }}>
                Insurance Status: <strong style={{ color: '#1e40af' }}>
                  {INSURANCE_STATUS[demoInsuranceClaim.status]?.label || demoInsuranceClaim.status}
                </strong>
              </span>
            </div>
          );
        })()}
      </div>

      {/* ── Vendor Contact Log ────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
        padding: '20px 24px', marginBottom: 28,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e4d6b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Phone size={18} color="#1e4d6b" /> Vendor Contact Log
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {demoVendorContacts.map(vc => (
            <div key={vc.id} style={{
              padding: '14px 16px', background: '#f8fafc', borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Truck size={16} color="#1e4d6b" />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{vc.vendorName}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#64748b', background: '#e2e8f0',
                  borderRadius: 999, padding: '1px 8px',
                }}>
                  {vc.role}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: '#475569', marginBottom: 8 }}>
                <span><strong>Contact:</strong> {vc.contactName}</span>
                <span><strong>Phone:</strong> {vc.phone}</span>
                <span><strong>Contacted:</strong> {fmtTime(vc.contactedAt)}</span>
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                {vc.response}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                Ticket #: <strong style={{ color: '#1e4d6b' }}>{vc.ticketNumber}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Insurance Claim Card ──────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
        padding: '20px 24px', marginBottom: 28,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e4d6b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarSign size={18} color="#d4af37" /> Insurance Claim
        </h3>
        {(() => {
          const ic = demoInsuranceClaim;
          const st = INSURANCE_STATUS[ic.status] || INSURANCE_STATUS.filed;
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, fontSize: 14, color: '#475569' }}>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Claim #</div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{ic.claimNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Carrier</div>
                <div style={{ fontWeight: 600 }}>{ic.carrier}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Total Loss</div>
                <div style={{ fontWeight: 700, color: '#991b1b' }}>${ic.totalLoss.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Deductible</div>
                <div style={{ fontWeight: 600 }}>${ic.deductible.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
                <span style={{
                  display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '2px 10px',
                  borderRadius: 999, background: st.bg, color: st.text,
                }}>
                  {st.label}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Filed</div>
                <div style={{ fontWeight: 600 }}>{fmtDate(ic.filedAt)} by {ic.filedBy}</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Download Buttons Row ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28,
      }}>
        <button
          onClick={() => toast.info('PDF report generation coming soon')}
          style={{
            ...font, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e4d6b',
            color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Download size={15} /> Full PDF Report
        </button>
        <button
          onClick={() => toast.info('Insurance claim package coming soon')}
          style={{
            ...font, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#d4af37',
            color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <FileText size={15} /> Insurance Claim Package
        </button>
        <button
          onClick={() => toast.info('Health dept report coming soon')}
          style={{
            ...font, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff',
            color: '#1e4d6b', border: '2px solid #1e4d6b', borderRadius: 8, padding: '10px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Printer size={15} /> Health Dept Report
        </button>
        <button
          onClick={() => toast.info('Legal summary coming soon')}
          style={{
            ...font, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff',
            color: '#1e4d6b', border: '2px solid #1e4d6b', borderRadius: 8, padding: '10px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <FileText size={15} /> Legal Summary
        </button>
      </div>

      {/* ── Share with Insurance Button ───────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <button
          onClick={() => toast.info('Insurance sharing coming soon')}
          style={{
            ...font, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#d4af37',
            color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Share2 size={17} /> Share with Insurance
        </button>
      </div>

      {/* ── Compliance Narrative ──────────────────────────────────────────── */}
      <div style={{
        background: '#eef4f8', border: '1px solid #b8d4e8', borderRadius: 12,
        padding: '20px 24px',
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e4d6b', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} color="#1e4d6b" /> Compliance Narrative
        </h3>
        <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 10px' }}>
            On <strong>{fmtDate(incident.initiatedAt)}</strong> at <strong>{fmtTime(incident.initiatedAt)}</strong>,
            a <strong>{incident.templateTitle.toLowerCase()}</strong> incident was initiated
            at <strong>{incident.location}</strong> by <strong>{incident.initiatedBy}</strong>.
            The incident was classified as <strong>{SEVERITY_CONFIG[incident.severity].label.toLowerCase()}</strong> severity.
          </p>
          <p style={{ margin: '0 0 10px' }}>
            The response followed the <strong>{template.title}</strong> playbook
            ({template.stepCount} steps, estimated {template.estimatedMinutes} minutes),
            which is based on <strong>{template.regulatoryBasis}</strong>.
            {incident.status === 'completed'
              ? ` All ${incident.totalSteps} of ${incident.totalSteps} steps were completed. The incident was resolved on ${fmtDate(incident.completedAt)} at ${fmtTime(incident.completedAt)}, for a total duration of ${totalDuration(incident.initiatedAt, incident.completedAt)}.`
              : ` ${incident.currentStepNumber} of ${incident.totalSteps} steps have been completed so far. The incident is currently in progress.`
            }
          </p>
          <p style={{ margin: '0 0 10px' }}>
            All actions were documented in real time through EvidLY with timestamped entries,
            photo evidence ({incident.stepLogs.reduce((s, l) => s + l.photosTaken, 0)} photos captured),
            and vendor communication logs. This record constitutes a complete compliance trail
            demonstrating adherence to the regulatory standards cited above and is suitable for
            presentation to health department inspectors, insurance adjusters, and legal counsel.
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
            Auto-generated by EvidLY Compliance Engine &mdash; {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PlaybookTimeline;
