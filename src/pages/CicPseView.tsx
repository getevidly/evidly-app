import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Info, CheckCircle2, AlertTriangle, Users, ArrowRight } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { usePSESchedules } from '../hooks/usePSESchedules';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { RoleGuard } from '../components/auth/RoleGuard';
import type { PSESafeguard } from '../data/workforceRiskDemoData';

const NAVY = '#1e4d6b';
const GOLD = '#d4af37';
const MUTED_GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const BORDER = '#D1D9E6';

type Tab = 'pse' | 'pillars' | 'insurance';

const STATUS_COLORS: Record<PSESafeguard['status'], { label: string; color: string }> = {
  current:    { label: 'CURRENT',   color: '#059669' },
  expiring:   { label: 'DUE SOON',  color: '#D97706' },
  overdue:    { label: 'OVERDUE',   color: '#DC2626' },
  unverified: { label: 'NO RECORD', color: '#9CA3AF' },
};

const PILLAR_INFO = [
  { id: 'revenue', label: 'Revenue Risk', color: '#C2410C', bg: '#FFF7ED', icon: '\u{1F4B0}',
    description: 'Risk of revenue loss from closures, downgrades, or operational disruptions caused by compliance failures.' },
  { id: 'liability', label: 'Liability Risk', color: '#991B1B', bg: '#FEF2F2', icon: '⚖️',
    description: 'Legal exposure from violations, injuries, contamination events, or negligence claims. Includes PSE coverage gaps.' },
  { id: 'cost', label: 'Cost Risk', color: '#1E2D4D', bg: '#EFF6FF', icon: '\u{1F4B8}',
    description: 'Direct remediation costs — equipment replacement, emergency repairs, regulatory penalties, and compliance upgrades.' },
  { id: 'operational', label: 'Operational Risk', color: '#166534', bg: '#F0FDF4', icon: '⚙️',
    description: 'Disruption to daily kitchen operations from staffing gaps, supply chain issues, or equipment failures.' },
  { id: 'workforce', label: 'Workforce Risk', color: '#6B21A8', bg: '#F5F3FF', icon: '\u{1F477}',
    description: 'Employee certification gaps, training deficiencies, turnover impact, and staffing-related compliance exposure.' },
];

const HOW_IT_WORKS = [
  { title: 'Document Compliance', description: 'Maintain timestamped records of all inspections, service visits, and certifications through EvidLY.' },
  { title: 'Monitor Risk Signals', description: "EvidLY's five-pillar risk analysis identifies compliance gaps that could affect your insurance coverage." },
  { title: 'Share with Carrier', description: 'Provide your carrier or broker access to verified compliance data to support renewal conversations.' },
  { title: 'Protect Your Coverage', description: 'Continuous PSE documentation helps ensure declared protective systems are verifiably maintained.' },
];

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 20,
  textAlign: 'center',
};

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 16px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  background: active ? NAVY : '#fff',
  color: active ? '#fff' : TEXT_SEC,
  border: `1px solid ${active ? NAVY : BORDER}`,
});

export function CicPseView() {
  const navigate = useNavigate();
  const { role } = useRole();
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const { guardAction, showUpgrade, upgradeAction, upgradeFeature, setShowUpgrade } = useDemoGuard();
  const { safeguards, isLoading: pseLoading } = usePSESchedules(profile?.organization_id);

  const [activeTab, setActiveTab] = useState<Tab>('pse');

  const currentCount = safeguards.filter(s => s.status === 'current').length;
  const expiringCount = safeguards.filter(s => s.status === 'expiring').length;
  const overdueCount = safeguards.filter(s => s.status === 'overdue').length;
  const unverifiedCount = safeguards.filter(s => s.status === 'unverified').length;

  return (
    <RoleGuard
      allowedRoles={['platform_admin', 'owner_operator', 'executive', 'compliance_manager']}
      fallback={<div style={{ maxWidth: 560, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}><Shield style={{ width: 48, height: 48, color: '#9CA3AF', margin: '0 auto 16px' }} /><h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E2D4D', marginBottom: 8 }}>Access Restricted</h2><p style={{ fontSize: 14, color: '#6B7F96' }}>CIC & PSE analysis is available to owners, executives, and compliance managers.</p></div>}
    >
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Shield style={{ width: 22, height: 22, color: NAVY }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>
            Compliance Intelligence Center
          </h1>
        </div>
        <p style={{ fontSize: 13, color: TEXT_SEC, margin: 0, paddingLeft: 32 }}>
          Protective safeguards, risk pillars, and insurance program information
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {([
          { key: 'pse' as Tab, label: 'PSE Records' },
          { key: 'pillars' as Tab, label: 'CIC Risk Pillars' },
          { key: 'insurance' as Tab, label: 'Insurance Program' },
        ]).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={pillStyle(activeTab === t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: PSE Records ── */}
      {activeTab === 'pse' && pseLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 0' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 60, background: '#E5E7EB', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}
      {activeTab === 'pse' && !pseLoading && (
        <div>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Total Safeguards', value: safeguards.length, color: NAVY },
              { label: 'Current', value: currentCount, color: '#059669' },
              { label: 'Due Within 30d', value: expiringCount, color: '#D97706' },
              { label: 'Overdue', value: overdueCount, color: '#DC2626' },
              { label: 'No Record', value: unverifiedCount, color: '#9CA3AF' },
            ].map(kpi => (
              <div key={kpi.label} style={{ ...cardStyle, padding: 16 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 500, marginTop: 2 }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Alert Banner */}
          {overdueCount > 0 && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
              padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertTriangle style={{ width: 18, height: 18, color: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>
                Coverage Risk &mdash; {overdueCount} Protective Safeguard{overdueCount > 1 ? 's' : ''} Overdue
              </span>
            </div>
          )}
          {overdueCount === 0 && expiringCount > 0 && (
            <div style={{
              background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
              padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertTriangle style={{ width: 18, height: 18, color: '#D97706', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>
                Action Required &mdash; {expiringCount} Safeguard{expiringCount > 1 ? 's' : ''} Due Within 30 Days
              </span>
            </div>
          )}

          {/* Safeguard Cards */}
          {safeguards.length === 0 && (
            <div style={{
              background: '#F9FAFB', border: `1px solid ${BORDER}`, borderRadius: 10,
              padding: '24px 18px', textAlign: 'center', marginBottom: 20,
            }}>
              <Shield style={{ width: 32, height: 32, color: '#9CA3AF', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: TEXT_SEC, lineHeight: 1.6, margin: 0 }}>
                No service records on file. Records appear automatically when HoodOps completes work, or log a service manually.
              </p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 20 }}>
            {safeguards.map((sg, idx) => {
              const sc = STATUS_COLORS[sg.status];
              return (
                <div key={idx} style={cardStyle}>
                  {/* Badges */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                      padding: '3px 10px', borderRadius: 12,
                      background: `${sc.color}18`, color: sc.color,
                    }}>
                      {sc.label}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
                      background: '#FDF8EC', color: MUTED_GOLD,
                    }}>
                      PSE-Relevant
                    </span>
                  </div>

                  {/* Name & Standard */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>{sg.label}</div>
                  <div style={{ fontSize: 11, color: TEXT_SEC, marginBottom: 10 }}>{sg.standard}</div>

                  {/* Details */}
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                    <div><strong>Vendor:</strong> {sg.vendor || 'Not on file'}</div>
                    <div><strong>Cert:</strong> {sg.cert || 'Not on file'}</div>
                    <div><strong>Last Service:</strong> {sg.lastService || '—'}</div>
                    <div><strong>Next Due:</strong> {sg.nextDue || '—'}</div>
                    <div><strong>Interval:</strong> {sg.interval}</div>
                  </div>

                  {/* Add Vendor button for unverified */}
                  {!sg.vendor && (
                    <button
                      onClick={() => alert('Demo mode — vendor & record management coming soon.')}
                      style={{
                        marginTop: 12, padding: '8px 18px', borderRadius: 8,
                        background: NAVY, color: '#fff', fontSize: 12, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      Add Vendor & Record
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* PSE Disclaimer */}
          <div style={{
            background: '#F9FAFB', border: `1px solid ${BORDER}`, borderRadius: 10,
            padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <Info style={{ width: 16, height: 16, color: TEXT_SEC, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: TEXT_SEC, lineHeight: 1.6, margin: 0 }}>
              EvidLY's service records are provided for informational purposes only. EvidLY does not review or advise on your insurance policy terms. Consult your carrier or broker to confirm your Protective Safeguards Endorsement requirements.
            </p>
          </div>
        </div>
      )}

      {/* ── TAB 2: CIC Risk Pillars ── */}
      {activeTab === 'pillars' && (
        <div>
          <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
            {PILLAR_INFO.map(p => (
              <div key={p.id} style={{
                ...cardStyle,
                borderLeft: `4px solid ${p.color}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{p.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: p.color }}>{p.label}</span>
                </div>
                <p style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, margin: 0, maxWidth: 560 }}>
                  {p.description}
                </p>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 12px', borderRadius: 12,
                  background: p.bg, color: p.color,
                }}>
                  0 signals
                </span>
              </div>
            ))}
          </div>

          {/* Info note */}
          <div style={{
            background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10,
            padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <Info style={{ width: 16, height: 16, color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: '#1E2D4D', lineHeight: 1.6, margin: 0 }}>
              EvidLY does not generate compliance scores. All inspection results are displayed exactly as issued by the Environmental Health Department (food safety) or fire Authority Having Jurisdiction (fire safety).
            </p>
          </div>
        </div>
      )}

      {/* ── TAB 3: Insurance Program ── */}
      {activeTab === 'insurance' && (
        <div>
          {/* How It Works */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={idx} style={cardStyle}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: NAVY, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, margin: '0 auto 10px',
                }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{step.title}</div>
                <p style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6, margin: 0 }}>{step.description}</p>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{
            background: '#F9FAFB', border: `1px solid ${BORDER}`, borderRadius: 10,
            padding: '16px 20px', marginBottom: 20,
          }}>
            <p style={{ fontSize: 11, color: TEXT_SEC, lineHeight: 1.7, margin: 0, textAlign: 'left' }}>
              EvidLY LLC is a compliance technology and data platform. EvidLY is not an insurance company, insurance broker, managing general agent (MGA), or insurance producer. EvidLY does not underwrite, rate, bind, or sell insurance coverage of any kind. Risk signals and compliance data are informational only and do not constitute an insurance quote, commitment, or guarantee of coverage or premium pricing. All underwriting, rating, and coverage decisions are made solely by licensed insurance carriers. Participation in the EvidLY Insurance Program (EIP) is voluntary and separate from your EvidLY subscription. &copy; 2026 EvidLY LLC.
            </p>
          </div>

          {/* EIP CTA */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => alert('Demo mode — EIP enrollment flow coming soon.')}
              style={{
                padding: '12px 32px', borderRadius: 10,
                background: GOLD, color: '#fff', fontSize: 14, fontWeight: 700,
                border: 'none', cursor: 'pointer',
              }}
            >
              Enroll in EIP &mdash; I Have Read the Disclosures
            </button>
          </div>
        </div>
      )}

      {/* Demo Upgrade Prompt */}
      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
    </RoleGuard>
  );
}
