// ── Risk Register format tab ─────────────────────────────────────────────
import { useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { type BISignal, type RiskPlan, DIMENSIONS, SEV_ORDER, getHighestSeverity } from './types';
import { SevBadge } from './SevBadge';
import { RiskCards } from './RiskCards';
import { RiskLevelTooltip } from '../../RiskLevelTooltip';
import { NAVY, GOLD, CARD_BORDER, TEXT_TERTIARY } from '../../dashboard/shared/constants';

interface Props {
  signals: BISignal[];
  riskPlans: Map<string, RiskPlan>;
  onSaveRiskPlan: (plan: RiskPlan) => void;
  isDemoMode: boolean;
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    not_started: { bg: '#F3F4F6', text: '#6B7280', label: 'Not Started' },
    in_progress: { bg: '#DBEAFE', text: '#1D4ED8', label: 'In Progress' },
    completed:   { bg: '#D1FAE5', text: '#059669', label: 'Completed' },
    accepted:    { bg: '#FEF3C7', text: '#D97706', label: 'Accepted' },
  };
  const c = colors[status] || colors.not_started;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

function formatCategory(cat: string): string {
  return cat
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Get suggested owner based on signal category */
function suggestOwner(category: string): string {
  const mapping: Record<string, string> = {
    food_safety: 'Compliance Officer',
    facility_safety: 'Facilities Manager',
    regulatory: 'Compliance Officer',
    recall: 'Kitchen Manager',
    certification: 'Compliance Officer',
    health_alert: 'Compliance Officer',
  };
  return mapping[category] || 'Compliance Officer';
}

/** Get suggested due date based on highest severity */
function suggestDueDate(severity: string): string {
  const daysMap: Record<string, number> = { critical: 7, high: 14, moderate: 30, medium: 30, low: 60 };
  const days = daysMap[severity] || 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const AI_BTN_STYLE: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  padding: '2px 6px',
  borderRadius: 4,
  border: '1px solid #E9D5FF',
  background: '#FAF5FF',
  color: '#7C3AED',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  whiteSpace: 'nowrap',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#0B1628',
  marginBottom: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  fontSize: 12,
  padding: '6px 10px',
  borderRadius: 6,
  border: `1px solid ${CARD_BORDER}`,
  color: '#0B1628',
  outline: 'none',
};

export function RegisterFormat({ signals, riskPlans, onSaveRiskPlan, isDemoMode }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drawerOpenId, setDrawerOpenId] = useState<string | null>(null);

  // Drawer form state
  const [formStatus, setFormStatus] = useState<RiskPlan['status']>('not_started');
  const [formOwner, setFormOwner] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formMitigation, setFormMitigation] = useState('');
  const [formAccepted, setFormAccepted] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const sorted = [...signals].sort((a, b) => {
    const sevA = SEV_ORDER[getHighestSeverity(a)] || 0;
    const sevB = SEV_ORDER[getHighestSeverity(b)] || 0;
    return sevB - sevA;
  });

  // Summary counts
  const plansByStatus = { not_started: 0, in_progress: 0, completed: 0, accepted: 0 };
  riskPlans.forEach(p => {
    if (p.status in plansByStatus) plansByStatus[p.status as keyof typeof plansByStatus]++;
  });
  const totalPlans = riskPlans.size;

  /** Open drawer with pre-filled data from existing plan (if any) */
  function openDrawer(signal: BISignal) {
    const existing = riskPlans.get(signal.id);
    if (existing) {
      setFormStatus(existing.status);
      setFormOwner(existing.owner_name);
      setFormDueDate(existing.due_date);
      setFormMitigation(existing.mitigation_steps);
      setFormAccepted(existing.accepted_reason);
      setFormNotes(existing.notes);
    } else {
      setFormStatus('not_started');
      setFormOwner('');
      setFormDueDate('');
      setFormMitigation('');
      setFormAccepted('');
      setFormNotes('');
    }
    setDrawerOpenId(signal.id);
  }

  function handleSave(signal: BISignal) {
    onSaveRiskPlan({
      id: crypto.randomUUID(),
      signal_id: signal.id,
      status: formStatus,
      owner_name: formOwner,
      due_date: formDueDate,
      mitigation_steps: formMitigation,
      accepted_reason: formAccepted,
      notes: formNotes,
    });
    setDrawerOpenId(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Summary Bar ── */}
      <div style={{
        background: '#fff',
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 10,
        padding: '12px 16px',
        textAlign: 'center',
        fontSize: 12,
        color: '#3D5068',
      }}>
        {totalPlans > 0 ? (
          <span>
            {plansByStatus.in_progress > 0 && (
              <><strong>{plansByStatus.in_progress}</strong> In Progress</>
            )}
            {plansByStatus.completed > 0 && (
              <>{plansByStatus.in_progress > 0 && <span style={{ margin: '0 6px', color: '#D1D9E6' }}>&middot;</span>}<strong>{plansByStatus.completed}</strong> Completed</>
            )}
            {plansByStatus.accepted > 0 && (
              <>{(plansByStatus.in_progress > 0 || plansByStatus.completed > 0) && <span style={{ margin: '0 6px', color: '#D1D9E6' }}>&middot;</span>}<strong>{plansByStatus.accepted}</strong> Risk Accepted</>
            )}
            {plansByStatus.not_started > 0 && (
              <>{(plansByStatus.in_progress > 0 || plansByStatus.completed > 0 || plansByStatus.accepted > 0) && <span style={{ margin: '0 6px', color: '#D1D9E6' }}>&middot;</span>}<strong>{plansByStatus.not_started}</strong> Not Started</>
            )}
          </span>
        ) : (
          <span style={{ color: TEXT_TERTIARY }}>
            No risk plans created yet — click a row to manage
          </span>
        )}
      </div>

      {/* ── Register Table ── */}
      <div style={{
        background: '#fff',
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '32px 1.6fr 96px 76px 76px 76px 76px 76px 120px',
          alignItems: 'center',
          background: '#F8F9FC',
          borderBottom: `2px solid ${CARD_BORDER}`,
          padding: '8px 0',
          fontSize: 10,
          fontWeight: 700,
          color: NAVY,
          textTransform: 'uppercase',
          letterSpacing: 0.3,
        }}>
          <div style={{ textAlign: 'center' }}>#</div>
          <div style={{ paddingLeft: 8 }}>Finding</div>
          <div style={{ textAlign: 'center' }}>Category</div>
          <div style={{ textAlign: 'center' }}>Revenue</div>
          <div style={{ textAlign: 'center' }}>Liability</div>
          <div style={{ textAlign: 'center' }}>Cost</div>
          <div style={{ textAlign: 'center' }}>Oper.</div>
          <div style={{ textAlign: 'center' }}>Workforce</div>
          <div style={{ textAlign: 'center' }}>Risk Plan</div>
        </div>

        {/* Table rows */}
        {sorted.map((signal, idx) => {
          const isExpanded = expandedId === signal.id;
          const isDrawerOpen = drawerOpenId === signal.id;
          const plan = riskPlans.get(signal.id);
          const severity = getHighestSeverity(signal);

          return (
            <div key={signal.id}>
              {/* Main row */}
              <div
                onClick={() => {
                  if (isExpanded) {
                    setExpandedId(null);
                    setDrawerOpenId(null);
                  } else {
                    setExpandedId(signal.id);
                  }
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1.6fr 96px 76px 76px 76px 76px 76px 120px',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: isExpanded ? 'none' : `1px solid #F0F2F5`,
                  cursor: 'pointer',
                  background: isExpanded ? '#FAFBFC' : '#fff',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = '#FAFBFC'; }}
                onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = '#fff'; }}
              >
                <div style={{ textAlign: 'center', fontSize: 11, color: TEXT_TERTIARY, fontWeight: 500 }}>
                  {idx + 1}
                </div>
                <div style={{
                  paddingLeft: 8,
                  paddingRight: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0B1628',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {signal.title}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: '#F3F4F6',
                    color: '#4B5563',
                    whiteSpace: 'nowrap',
                  }}>
                    {formatCategory(signal.category)}
                  </span>
                </div>
                <div style={{ textAlign: 'center' }}><RiskLevelTooltip dimension="revenue" level={signal.risk_revenue}><SevBadge level={signal.risk_revenue} compact /></RiskLevelTooltip></div>
                <div style={{ textAlign: 'center' }}><RiskLevelTooltip dimension="liability" level={signal.risk_liability}><SevBadge level={signal.risk_liability} compact /></RiskLevelTooltip></div>
                <div style={{ textAlign: 'center' }}><RiskLevelTooltip dimension="cost" level={signal.risk_cost}><SevBadge level={signal.risk_cost} compact /></RiskLevelTooltip></div>
                <div style={{ textAlign: 'center' }}><RiskLevelTooltip dimension="operational" level={signal.risk_operational}><SevBadge level={signal.risk_operational} compact /></RiskLevelTooltip></div>
                <div style={{ textAlign: 'center' }}><RiskLevelTooltip dimension="workforce" level={signal.workforce_risk_level}><SevBadge level={signal.workforce_risk_level} compact /></RiskLevelTooltip></div>
                <div style={{ textAlign: 'center' }}>
                  {plan ? <StatusPill status={plan.status} /> : <span style={{ color: '#9CA3AF', fontSize: 11 }}>&mdash;</span>}
                </div>
              </div>

              {/* ── Expanded Section ── */}
              {isExpanded && (
                <div style={{
                  padding: '16px 20px 20px',
                  background: '#FAFBFC',
                  borderBottom: `1px solid ${CARD_BORDER}`,
                }}>
                  {/* Signal summary */}
                  <div style={{ fontSize: 12, color: '#3D5068', lineHeight: 1.7, marginBottom: 14 }}>
                    {signal.summary}
                  </div>

                  {/* RiskCards for this single signal */}
                  <div style={{ marginBottom: 14 }}>
                    <RiskCards signals={[signal]} />
                  </div>

                  {/* Recommended action */}
                  {signal.recommended_action && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                      fontSize: 12,
                      color: '#92400E',
                      background: '#FFFBEB',
                      border: '1px solid #FEF3C7',
                      borderRadius: 6,
                      padding: '8px 12px',
                      marginBottom: 14,
                    }}>
                      <AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span><strong>Recommended Action:</strong> {signal.recommended_action}</span>
                    </div>
                  )}

                  {/* Manage Risk Plan button */}
                  {!isDrawerOpen && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openDrawer(signal); }}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '8px 16px',
                        borderRadius: 6,
                        border: 'none',
                        background: NAVY,
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Manage Risk Plan
                    </button>
                  )}

                  {/* ── Risk Plan Drawer (inline) ── */}
                  {isDrawerOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        marginTop: 8,
                        background: '#fff',
                        border: `1px solid ${CARD_BORDER}`,
                        borderRadius: 10,
                        padding: 20,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 16 }}>
                        Risk Plan
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Plan Status */}
                        <div>
                          <div style={LABEL_STYLE}>Plan Status</div>
                          <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value as RiskPlan['status'])}
                            style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="accepted">Risk Accepted</option>
                          </select>
                        </div>

                        {/* Assigned Owner */}
                        <div>
                          <div style={LABEL_STYLE}>
                            Assigned Owner
                            <button
                              onClick={() => setFormOwner(suggestOwner(signal.category))}
                              style={AI_BTN_STYLE}
                            >
                              <Sparkles size={9} /> AI Suggest
                            </button>
                          </div>
                          <input
                            type="text"
                            value={formOwner}
                            onChange={(e) => setFormOwner(e.target.value)}
                            placeholder="e.g. Compliance Officer"
                            style={INPUT_STYLE}
                          />
                        </div>

                        {/* Target Completion Date */}
                        <div>
                          <div style={LABEL_STYLE}>
                            Target Completion Date
                            <button
                              onClick={() => setFormDueDate(suggestDueDate(severity))}
                              style={AI_BTN_STYLE}
                            >
                              <Sparkles size={9} /> AI Suggest
                            </button>
                          </div>
                          <input
                            type="date"
                            value={formDueDate}
                            onChange={(e) => setFormDueDate(e.target.value)}
                            style={INPUT_STYLE}
                          />
                        </div>

                        {/* Mitigation Steps */}
                        <div>
                          <div style={LABEL_STYLE}>
                            Mitigation Steps
                            <button
                              onClick={() => setFormMitigation(signal.recommended_action || '')}
                              style={AI_BTN_STYLE}
                            >
                              <Sparkles size={9} /> AI Suggest
                            </button>
                          </div>
                          <textarea
                            value={formMitigation}
                            onChange={(e) => setFormMitigation(e.target.value)}
                            placeholder={signal.recommended_action || 'Describe mitigation steps...'}
                            rows={3}
                            style={{ ...INPUT_STYLE, resize: 'vertical' }}
                          />
                        </div>

                        {/* Risk Accepted Justification — only when status === 'accepted' */}
                        {formStatus === 'accepted' && (
                          <div>
                            <div style={LABEL_STYLE}>
                              Risk Accepted Justification
                              <button
                                onClick={() =>
                                  setFormAccepted(
                                    `Risk has been evaluated and accepted. The organization acknowledges the ${severity} risk level for this signal and has determined that current controls are adequate.`
                                  )
                                }
                                style={AI_BTN_STYLE}
                              >
                                <Sparkles size={9} /> AI Suggest
                              </button>
                            </div>
                            <div style={{
                              fontSize: 10,
                              color: '#D97706',
                              background: '#FEF3C7',
                              border: '1px solid #FDE68A',
                              borderRadius: 4,
                              padding: '4px 8px',
                              marginBottom: 6,
                            }}>
                              Risk acceptance is logged and timestamped for compliance records.
                            </div>
                            <textarea
                              value={formAccepted}
                              onChange={(e) => setFormAccepted(e.target.value)}
                              placeholder="Provide justification for accepting this risk..."
                              rows={3}
                              style={{ ...INPUT_STYLE, resize: 'vertical' }}
                            />
                          </div>
                        )}

                        {/* Notes */}
                        <div>
                          <div style={LABEL_STYLE}>
                            Notes
                            <button
                              onClick={() =>
                                setFormNotes(
                                  `Related to ${signal.title} in ${signal.county}. See ${signal.source_name || 'source'} for details.`
                                )
                              }
                              style={AI_BTN_STYLE}
                            >
                              <Sparkles size={9} /> AI Suggest
                            </button>
                          </div>
                          <textarea
                            value={formNotes}
                            onChange={(e) => setFormNotes(e.target.value)}
                            placeholder="Additional notes..."
                            rows={2}
                            style={{ ...INPUT_STYLE, resize: 'vertical' }}
                          />
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                          <button
                            onClick={() => setDrawerOpenId(null)}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '8px 16px',
                              borderRadius: 6,
                              border: `1px solid ${CARD_BORDER}`,
                              background: '#fff',
                              color: '#3D5068',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(signal)}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '8px 16px',
                              borderRadius: 6,
                              border: 'none',
                              background: NAVY,
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            Save Risk Plan
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
