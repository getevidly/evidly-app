import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Award, CheckCircle2, XCircle, Clock, Upload,
  GraduationCap, AlertTriangle, MapPin, Mail, Calendar, Flame,
  FileText, User, Plus,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { AssignTrainingModal } from '../components/training/AssignTrainingModal';
import {
  TRAINING_EMPLOYEES, daysUntilExpiry, getTrainingStatus,
  getStatusLabel, getStatusColors,
  type TrainingEmployee,
} from '../data/trainingRecordsDemoData';
import { certificationRequirements } from '../data/demoData';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, TEXT_TERTIARY } from '../components/dashboard/shared/constants';

const NAVY = '#1e4d6b';
const F: React.CSSProperties = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

function formatDate(d: string | null): string {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getCertIcon(type: string) {
  if (type.includes('fire') || type.includes('hood')) return <Flame size={16} color="#dc2626" />;
  if (type.includes('cfpm') || type.includes('haccp')) return <EvidlyIcon size={16} />;
  if (type.includes('allergen')) return <AlertTriangle size={16} color="#d97706" />;
  return <Award size={16} color="#15803d" />;
}

function certStatusBadge(expires: string | null) {
  const days = daysUntilExpiry(expires);
  if (days === null) return { label: 'Active (No Expiry)', bg: '#dcfce7', text: '#15803d' };
  if (days < 0) return { label: 'Needs Renewal', bg: '#fee2e2', text: '#dc2626' };
  if (days <= 30) return { label: `${days}d left`, bg: '#fee2e2', text: '#dc2626' };
  if (days <= 90) return { label: `Coming Due (${days}d)`, bg: '#fef3c7', text: '#92400e' };
  return { label: 'Current', bg: '#dcfce7', text: '#15803d' };
}

function trainingStatusBadge(status: string) {
  switch (status) {
    case 'completed': return { bg: '#dcfce7', text: '#15803d', label: 'Completed' };
    case 'in_progress': return { bg: '#e0f2fe', text: '#0369a1', label: 'In Progress' };
    case 'not_started': return { bg: '#f3f4f6', text: '#6b7280', label: 'Not Started' };
    case 'overdue': return { bg: '#fee2e2', text: '#dc2626', label: 'Overdue' };
    default: return { bg: '#f3f4f6', text: '#6b7280', label: status };
  }
}

export function EmployeeTrainingProfile() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [showAssignModal, setShowAssignModal] = useState(false);

  const employees = isDemoMode ? TRAINING_EMPLOYEES : [];
  const employee = employees.find(e => e.id === employeeId);

  if (!employee) {
    return (
      <div style={F}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <GraduationCap size={48} color="#d1d5db" />
          <p style={{ color: MUTED, marginTop: 16, fontSize: 14 }}>Employee not found</p>
          <button
            onClick={() => navigate('/dashboard/training')}
            style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, background: NAVY, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Back to Training Records
          </button>
        </div>
      </div>
    );
  }

  const status = getTrainingStatus(employee);
  const statusColors = getStatusColors(status);

  // Jurisdiction requirements
  const requiredReqs = certificationRequirements.filter(r => r.required && r.requiredForRoles.includes(employee.appRole));
  const heldCertTypes = new Set(employee.certifications.map(c => c.type));

  const handleUpload = () => {
    guardAction('upload', 'Training Records', () => {
      toast.info('Certificate upload available in full version');
    });
  };

  const handleAssign = () => {
    guardAction('assign', 'Training Records', () => {
      setShowAssignModal(true);
    });
  };

  return (
    <div style={F}>
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard/training')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: TEXT_TERTIARY, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}
      >
        <ArrowLeft size={16} /> Back to Training Records
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: BODY_TEXT, margin: '0 0 6px' }}>{employee.name}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: MUTED }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={14} /> {employee.role}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={14} /> {employee.email}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {employee.locationName}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> Hired {formatDate(employee.hireDate)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: statusColors.bg, color: statusColors.text }}>
            {getStatusLabel(status)}
          </span>
          <button onClick={handleAssign}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: 'transparent', color: NAVY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> Assign Training
          </button>
          <button onClick={handleUpload}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: NAVY, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={14} /> Upload Certificate
          </button>
        </div>
      </div>

      {/* ── Section 1: Food Handler Certifications ────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={18} color={NAVY} /> Certifications ({employee.certifications.length})
        </h2>

        {employee.certifications.length === 0 ? (
          <div style={{ background: PANEL_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: 32, textAlign: 'center' }}>
            <Award size={28} color="#d1d5db" />
            <p style={{ color: MUTED, fontSize: 13, marginTop: 8 }}>No certifications yet for {employee.name}. Upload a certification to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {employee.certifications.map(cert => {
              const badge = certStatusBadge(cert.expires);
              return (
                <div key={cert.id} style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: 16, boxShadow: CARD_SHADOW }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    {getCertIcon(cert.type)}
                    <span style={{ fontSize: 14, fontWeight: 600, color: BODY_TEXT }}>{cert.name}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: MUTED }}>
                    <div>Authority: <span style={{ color: BODY_TEXT, fontWeight: 500 }}>{cert.authority}</span></div>
                    {cert.number && <div>Cert #: <span style={{ color: BODY_TEXT, fontWeight: 500 }}>{cert.number}</span></div>}
                    <div>Issued: <span style={{ color: BODY_TEXT, fontWeight: 500 }}>{formatDate(cert.issued)}</span></div>
                    <div>Expires: <span style={{ color: BODY_TEXT, fontWeight: 500 }}>{cert.expires ? formatDate(cert.expires) : 'No expiry'}</span></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span style={{ padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.text }}>
                      {badge.label}
                    </span>
                    <button onClick={handleUpload}
                      style={{ fontSize: 12, color: NAVY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Update
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 2: Internal Training Completions ──────────────── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <GraduationCap size={18} color={NAVY} /> Internal Training ({employee.internalTraining.length})
        </h2>

        {employee.internalTraining.length === 0 ? (
          <div style={{ background: PANEL_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: 32, textAlign: 'center' }}>
            <GraduationCap size={28} color="#d1d5db" />
            <p style={{ color: MUTED, fontSize: 13, marginTop: 8 }}>No training records yet. Assign training to get started.</p>
          </div>
        ) : (
          <div style={{ background: CARD_BG, borderRadius: 10, border: `1px solid ${CARD_BORDER}`, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: PANEL_BG, borderBottom: `2px solid ${CARD_BORDER}` }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Course</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Progress</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Score</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Assigned By</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Completed</th>
                </tr>
              </thead>
              <tbody>
                {employee.internalTraining.map(t => {
                  const badge = trainingStatusBadge(t.status);
                  return (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: BODY_TEXT }}>{t.courseTitle}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.text }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                          <div style={{ width: 60, height: 5, background: PANEL_BG, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${t.progressPercent}%`, height: '100%', background: t.status === 'completed' ? '#15803d' : NAVY, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: TEXT_TERTIARY }}>{t.progressPercent}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: BODY_TEXT }}>{t.score ? `${t.score}%` : '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: MUTED }}>{t.assignedBy}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: MUTED }}>{t.completedAt ? formatDate(t.completedAt) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 3: Jurisdiction-Required Training ─────────────── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color={NAVY} /> Jurisdiction Requirements
        </h2>

        {requiredReqs.length === 0 ? (
          <div style={{ background: PANEL_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: 24, textAlign: 'center' }}>
            <p style={{ color: MUTED, fontSize: 13 }}>No jurisdiction-specific requirements for this role.</p>
          </div>
        ) : (
          <div style={{ background: CARD_BG, borderRadius: 10, border: `1px solid ${CARD_BORDER}`, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
            {requiredReqs.map((req, i) => {
              const isHeld = heldCertTypes.has(req.certType);
              return (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: i < requiredReqs.length - 1 ? `1px solid ${CARD_BORDER}` : 'none' }}>
                  {isHeld ? <CheckCircle2 size={18} color="#15803d" /> : <XCircle size={18} color="#dc2626" />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT }}>{req.certName}</div>
                    <div style={{ fontSize: 11, color: TEXT_TERTIARY }}>
                      {req.authority}{req.authoritySection ? ` ${req.authoritySection}` : ''}
                      {req.deadlineDays ? ` — Required within ${req.deadlineDays} days of hire` : ''}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: isHeld ? '#dcfce7' : '#fee2e2',
                    color: isHeld ? '#15803d' : '#dc2626',
                  }}>
                    {isHeld ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 4: Certification Timeline ────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color={NAVY} /> Certification Timeline
        </h2>

        {employee.certifications.length === 0 ? (
          <div style={{ background: PANEL_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: 24, textAlign: 'center' }}>
            <p style={{ color: MUTED, fontSize: 13 }}>No certifications to display on timeline.</p>
          </div>
        ) : (
          <div style={{ background: CARD_BG, borderRadius: 10, border: `1px solid ${CARD_BORDER}`, padding: 20, boxShadow: CARD_SHADOW }}>
            {employee.certifications.map((cert, i) => {
              const days = daysUntilExpiry(cert.expires);
              let barColor = '#15803d'; // green
              if (days !== null) {
                if (days < 0) barColor = '#dc2626';      // red — needs renewal
                else if (days <= 30) barColor = '#dc2626'; // red — urgent
                else if (days <= 60) barColor = '#d97706'; // yellow
              }

              // Calculate bar width as % of total lifespan elapsed
              let elapsed = 100;
              if (cert.expires) {
                const total = new Date(cert.expires).getTime() - new Date(cert.issued).getTime();
                const done = Date.now() - new Date(cert.issued).getTime();
                elapsed = Math.min(100, Math.max(5, Math.round((done / total) * 100)));
              }

              return (
                <div key={cert.id} style={{ marginBottom: i < employee.certifications.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {getCertIcon(cert.type)}
                      <span style={{ fontSize: 13, fontWeight: 600, color: BODY_TEXT }}>{cert.name}</span>
                    </div>
                    {days !== null && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: barColor }}>
                        {days < 0 ? `${Math.abs(days)}d past due` : `${days}d remaining`}
                      </span>
                    )}
                    {days === null && <span style={{ fontSize: 11, color: TEXT_TERTIARY }}>No expiry</span>}
                  </div>
                  <div style={{ position: 'relative', height: 8, background: PANEL_BG, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${elapsed}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TEXT_TERTIARY, marginTop: 4 }}>
                    <span>Issued: {formatDate(cert.issued)}</span>
                    <span>Expires: {cert.expires ? formatDate(cert.expires) : 'None'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 5: Training History ───────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} color={NAVY} /> Training History
        </h2>

        {employee.trainingHistory.length === 0 ? (
          <div style={{ background: PANEL_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: 24, textAlign: 'center' }}>
            <p style={{ color: MUTED, fontSize: 13 }}>No training history for this employee yet.</p>
          </div>
        ) : (
          <div style={{ background: CARD_BG, borderRadius: 10, border: `1px solid ${CARD_BORDER}`, overflow: 'hidden', boxShadow: CARD_SHADOW }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: PANEL_BG, borderBottom: `2px solid ${CARD_BORDER}` }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Action</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Details</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {employee.trainingHistory.map(h => (
                  <tr key={h.id} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: MUTED, whiteSpace: 'nowrap' }}>{formatDate(h.date)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: BODY_TEXT }}>{h.action}</td>
                    <td style={{ padding: '10px 14px', color: MUTED }}>{h.details}</td>
                    <td style={{ padding: '10px 14px', color: TEXT_TERTIARY, fontSize: 12 }}>{h.recordedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div style={{ height: 40 }} />

      {/* Modals */}
      {showAssignModal && (
        <AssignTrainingModal
          open={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          employeeId={employee.id}
          employeeName={employee.name}
          employees={TRAINING_EMPLOYEES}
          onAssign={(data) => {
            toast.success(`Training assigned to ${data.employeeName} (demo)`);
            setShowAssignModal(false);
          }}
        />
      )}

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          feature={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
