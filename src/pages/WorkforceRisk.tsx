import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, AlertTriangle, Users, CheckCircle2, XCircle, Clock, Plus } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import {
  DEMO_WORKFORCE_SIGNALS,
  DEMO_EMPLOYEE_CERTS,
  SIGNAL_TYPE_LABELS,
  type WorkforceSignal,
  type EmployeeCert,
} from '../data/workforceRiskDemoData';

// ── Brand ─────────────────────────────────────────────────────────
const NAVY = '#1e4d6b';
const GOLD = '#d4af37';
const PURPLE = '#6B21A8';
const TEXT_SEC = '#6B7F96';
const BORDER = '#D1D9E6';

const F: React.CSSProperties = { fontFamily: "'Inter', 'DM Sans', sans-serif" };

// ── Severity colors ───────────────────────────────────────────────
const SEVERITY_COLORS: Record<WorkforceSignal['severity'], { color: string; bg: string }> = {
  critical: { color: '#DC2626', bg: '#FEF2F2' },
  high:     { color: '#D97706', bg: '#FFFBEB' },
  medium:   { color: '#2563EB', bg: '#EFF6FF' },
  low:      { color: '#6B7280', bg: '#F3F4F6' },
};

const SEVERITY_ORDER: Record<WorkforceSignal['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ── Cert status badges ────────────────────────────────────────────
const CERT_STATUS_STYLE: Record<EmployeeCert['status'], { color: string; bg: string; label: string }> = {
  current:       { color: '#166534', bg: '#DCFCE7', label: 'Current' },
  expiring_soon: { color: '#92400E', bg: '#FEF3C7', label: 'Expiring Soon' },
  expired:       { color: '#991B1B', bg: '#FEE2E2', label: 'Expired' },
};

// ── Card styling ──────────────────────────────────────────────────
const CARD_STYLE: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: '20px 24px',
  textAlign: 'center',
};

// ── Location options ──────────────────────────────────────────────
const LOCATION_OPTIONS = [
  { value: 'all', label: 'All Locations' },
  { value: 'downtown', label: 'Location 1' },
  { value: 'airport', label: 'Location 2' },
  { value: 'university', label: 'Location 3' },
];

// ── Helpers ───────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function filterByLocation<T extends { locationId: string }>(items: T[], loc: string): T[] {
  if (loc === 'all') return items;
  return items.filter(i => i.locationId === loc);
}

function getUnresolved(signals: WorkforceSignal[]): WorkforceSignal[] {
  return signals.filter(s => s.resolvedAt === null);
}

function sortBySeverity(signals: WorkforceSignal[]): WorkforceSignal[] {
  return [...signals].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

// ── Signal Card ───────────────────────────────────────────────────
function SignalCard({ signal }: { signal: WorkforceSignal }) {
  const sev = SEVERITY_COLORS[signal.severity];
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: '16px 20px',
      borderLeft: `4px solid ${sev.color}`,
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: sev.bg, color: sev.color }}>
          {signal.severity.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
        {signal.label}
      </div>
      <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.5, marginBottom: 6 }}>
        {signal.details}
      </div>
      <div style={{ fontSize: 10, color: '#9CA3AF' }}>
        {signal.locationName} · {formatDate(signal.createdAt)} · {signal.affectedCount} affected
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────

export function WorkforceRisk() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { userRole } = useRole();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const locationParam = searchParams.get('location') || 'all';

  const signals = useMemo(
    () => filterByLocation(DEMO_WORKFORCE_SIGNALS, locationParam),
    [locationParam],
  );
  const certs = useMemo(
    () => filterByLocation(DEMO_EMPLOYEE_CERTS, locationParam),
    [locationParam],
  );
  const unresolvedSignals = useMemo(() => getUnresolved(signals), [signals]);
  const sortedSignals = useMemo(() => sortBySeverity(unresolvedSignals), [unresolvedSignals]);

  const handleLocationChange = (value: string) => {
    if (value === 'all') {
      searchParams.delete('location');
    } else {
      searchParams.set('location', value);
    }
    setSearchParams(searchParams);
  };

  // ── Kitchen roles: simple message ─────────────────────────────
  if (userRole === 'kitchen_staff' || userRole === 'kitchen_manager' || userRole === 'chef') {
    return (
      <div style={{ ...F, maxWidth: 900, margin: '0 auto' }}>
        <div style={{ ...CARD_STYLE, marginTop: 40 }}>
          <Users size={32} color={TEXT_SEC} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: NAVY, marginBottom: 6 }}>
            Workforce Risk is managed by your Compliance Officer.
          </div>
        </div>
        {showUpgrade && (
          <DemoUpgradePrompt
            action={upgradeAction}
            featureName={upgradeFeature}
            onClose={() => setShowUpgrade(false)}
          />
        )}
      </div>
    );
  }

  // ── Header ────────────────────────────────────────────────────
  const isFireView = userRole === 'facilities_manager';
  const headerTitle = isFireView ? 'Workforce Risk — Fire Safety Training' : 'Workforce Risk';
  const headerSubtitle = isFireView
    ? 'Fire safety and extinguisher training compliance signals'
    : 'Employee certification and training compliance signals';

  // ── Facilities Manager: fire-only signals ─────────────────────
  const fireSignalTypes = ['fire_safety_training_missing', 'fire_extinguisher_training_missing'];
  const facilitiesSignals = useMemo(
    () => sortBySeverity(unresolvedSignals.filter(s => fireSignalTypes.includes(s.signalType))),
    [unresolvedSignals],
  );

  // ── Executive: summary stats ──────────────────────────────────
  const statTotalSignals = unresolvedSignals.length;
  const statCritical = unresolvedSignals.filter(s => s.severity === 'critical').length;
  const statCertsExpiring = certs.filter(c => c.status === 'expiring_soon').length;
  const statCertsExpired = certs.filter(c => c.status === 'expired').length;
  const hasAnyData = statTotalSignals > 0 || certs.length > 0;

  return (
    <div style={{ ...F, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#F5F3FF',
          }}>
            <Shield size={22} color={PURPLE} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>{headerTitle}</h1>
            <p style={{ fontSize: 13, color: TEXT_SEC, margin: 0 }}>{headerSubtitle}</p>
          </div>
        </div>

        {/* Location selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={locationParam}
            onChange={e => handleLocationChange(e.target.value)}
            style={{
              fontSize: 13,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: '6px 12px',
              outline: 'none',
              color: '#374151',
              background: '#fff',
            }}
          >
            {LOCATION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Owner/Operator View ─────────────────────────────────── */}
      {userRole === 'owner_operator' && (() => {
        const ownerSignals = sortedSignals.slice(0, 5);
        return (
          <>
            {ownerSignals.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ownerSignals.map(sig => (
                  <SignalCard key={sig.id} signal={sig} />
                ))}
              </div>
            )}
          </>
        );
      })()}

      {/* ── Compliance Manager View ─────────────────────────────── */}
      {userRole === 'compliance_manager' && (
        <>
          {/* Signal list */}
          {sortedSignals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {sortedSignals.map(sig => (
                <SignalCard key={sig.id} signal={sig} />
              ))}
            </div>
          ) : (
            <div style={{ ...CARD_STYLE, marginBottom: 32 }}>
              <CheckCircle2 size={28} color="#6B7280" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>No active signals</div>
            </div>
          )}

          {/* Certification Table */}
          <div style={{ ...CARD_STYLE, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Employee Certifications</div>
              <button
                onClick={() => alert('Demo mode — Add cert record would open a form in production.')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 600, color: '#fff', background: NAVY,
                  border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                Add Cert Record
              </button>
            </div>

            {certs.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB' }}>
                      {['Employee', 'Location', 'Cert Type', 'Cert #', 'Issued', 'Expires', 'Status', 'Issuing Body'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: TEXT_SEC, fontSize: 11, borderBottom: `1px solid ${BORDER}` }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {certs.map(cert => {
                      const st = CERT_STATUS_STYLE[cert.status];
                      return (
                        <tr key={cert.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{cert.employeeName}</td>
                          <td style={{ padding: '10px 14px', color: TEXT_SEC }}>{cert.locationName}</td>
                          <td style={{ padding: '10px 14px', color: '#111827' }}>{cert.certTypeLabel}</td>
                          <td style={{ padding: '10px 14px', color: TEXT_SEC }}>{cert.certNumber || '—'}</td>
                          <td style={{ padding: '10px 14px', color: TEXT_SEC }}>{formatDate(cert.issuedDate)}</td>
                          <td style={{ padding: '10px 14px', color: TEXT_SEC }}>{cert.expirationDate ? formatDate(cert.expirationDate) : '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: TEXT_SEC, fontSize: 12 }}>{cert.issuingBody}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <XCircle size={28} color="#9CA3AF" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 13, color: TEXT_SEC, lineHeight: 1.6 }}>
                  No certification records on file. Use '+ Add Cert Record' to begin tracking.
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Executive View ──────────────────────────────────────── */}
      {userRole === 'executive' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total Signals', value: statTotalSignals, icon: AlertTriangle, iconColor: PURPLE },
              { label: 'Critical', value: statCritical, icon: XCircle, iconColor: '#DC2626' },
              { label: 'Certs Expiring', value: statCertsExpiring, icon: Clock, iconColor: '#D97706' },
              { label: 'Certs Expired', value: statCertsExpired, icon: XCircle, iconColor: '#991B1B' },
            ].map(box => {
              const Icon = box.icon;
              const empty = !hasAnyData;
              return (
                <div key={box.label} style={{ ...CARD_STYLE }}>
                  <Icon size={22} color={empty ? '#D1D5DB' : box.iconColor} style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 24, fontWeight: 700, color: empty ? '#D1D5DB' : NAVY, marginBottom: 4 }}>
                    {empty ? '—' : box.value}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: empty ? '#D1D5DB' : TEXT_SEC }}>
                    {box.label}
                  </div>
                </div>
              );
            })}
          </div>

          {!hasAnyData && (
            <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: TEXT_SEC }}>
              No certification data on file. Compliance Officer must add records to populate this view.
            </div>
          )}
        </>
      )}

      {/* ── Platform Admin View (same as owner) ─────────────────── */}
      {userRole === 'platform_admin' && (() => {
        const adminSignals = sortedSignals.slice(0, 5);
        return (
          <>
            {adminSignals.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {adminSignals.map(sig => (
                  <SignalCard key={sig.id} signal={sig} />
                ))}
              </div>
            )}
          </>
        );
      })()}

      {/* ── Facilities Manager View ─────────────────────────────── */}
      {userRole === 'facilities_manager' && (
        <>
          {facilitiesSignals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {facilitiesSignals.map(sig => (
                <SignalCard key={sig.id} signal={sig} />
              ))}
            </div>
          ) : (
            <div style={{ ...CARD_STYLE, marginBottom: 24 }}>
              <CheckCircle2 size={28} color="#6B7280" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>No active fire safety training signals</div>
            </div>
          )}

          {/* Reference cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ ...CARD_STYLE }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Fire Safety Training</div>
              <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6 }}>
                Annual fire safety orientation covering evacuation procedures, fire extinguisher use, and suppression system awareness. Required for all kitchen staff.
              </div>
            </div>
            <div style={{ ...CARD_STYLE }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Fire Extinguisher Training</div>
              <div style={{ fontSize: 12, color: TEXT_SEC, lineHeight: 1.6 }}>
                Annual hands-on training per OSHA 1910.157. Must be documented with date, instructor, and attendee list.
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
            Food handler and CFPM records are managed by Compliance Officer — not shown here.
          </div>
        </>
      )}

      {/* Bottom padding */}
      <div style={{ height: 96 }} />

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
