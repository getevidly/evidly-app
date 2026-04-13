/**
 * PSESafeguardsSection — Protective Safeguards Endorsement cards
 *
 * Renders four PSE-relevant safeguard categories with service record status.
 * Demo mode uses static data; production queries vendor_service_records.
 *
 * PSE language is advisory only — EvidLY does not know the operator's policy terms.
 */
import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { useVendorServiceRecords } from '../../hooks/useVendorServiceRecords';
import { SAMPLE_PSE_SAFEGUARDS } from '../../data/workforceRiskDemoData';

// ── Brand ─────────────────────────────────────────────────────
const NAVY = '#1e4d6b';
const GOLD = '#d4af37';
const BORDER = '#b8d4e8';

// ── Static safeguard config (never from DB) ───────────────────
const PSE_SAFEGUARDS = [
  {
    key: 'hood_cleaning',
    label: 'Hood & Exhaust Cleaning',
    standard: 'NFPA 96-2024 · Table 12.4',
    authority: 'AHJ (Fire)',
    defaultInterval: 'Semi-annual (verify cooking type)',
  },
  {
    key: 'fire_suppression',
    label: 'Fire Suppression System',
    standard: 'NFPA 96 · Semi-annual + Annual',
    authority: 'AHJ (Fire)',
    defaultInterval: 'Semi-annual',
  },
  {
    key: 'fire_alarm',
    label: 'Fire Alarm & Detection',
    standard: 'NFPA 72 · Annual',
    authority: 'AHJ (Fire)',
    defaultInterval: 'Annual',
  },
  {
    key: 'sprinklers',
    label: 'Sprinkler System',
    standard: 'NFPA 25 · Annual',
    authority: 'AHJ (Fire)',
    defaultInterval: 'Annual',
  },
] as const;

// ── Status types + display ────────────────────────────────────
type PSEStatus = 'current' | 'due_soon' | 'overdue' | 'no_record';

const STATUS_DISPLAY: Record<PSEStatus, { label: string; color: string; bg: string; border: string }> = {
  current:   { label: 'Current',   color: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
  due_soon:  { label: 'Due Soon',  color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  overdue:   { label: 'Overdue',   color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
  no_record: { label: 'No Record', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
};

interface ServiceRecord {
  safeguard_type: string;
  vendor_name: string | null;
  cert_number: string | null;
  service_date: string | null;
  next_due_date: string | null;
  interval_label: string | null;
  certificate_url: string | null;
}

function getPSEStatus(record: ServiceRecord | null): PSEStatus {
  if (!record || !record.next_due_date) return 'no_record';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDue = new Date(record.next_due_date);
  const daysUntilDue = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 30) return 'due_soon';
  return 'current';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Props ─────────────────────────────────────────────────────
interface Props {
  organizationId: string;
  locationId: string;
  isGuidedTour: boolean;
}

// ── Map demo data to ServiceRecord shape ──────────────────────
const DEMO_STATUS_MAP: Record<string, PSEStatus> = {
  current: 'current',
  expiring: 'due_soon',
  overdue: 'overdue',
  unverified: 'no_record',
};

function getDemoRecords(): Map<string, { record: ServiceRecord; status: PSEStatus }> {
  const map = new Map<string, { record: ServiceRecord; status: PSEStatus }>();
  const keyMap: Record<string, string> = {
    'Hood & Exhaust Cleaning': 'hood_cleaning',
    'Fire Suppression System': 'fire_suppression',
    'Fire Alarm & Detection': 'fire_alarm',
    'Sprinkler System': 'sprinklers',
  };
  for (const sg of SAMPLE_PSE_SAFEGUARDS) {
    const key = keyMap[sg.label];
    if (!key) continue;
    map.set(key, {
      record: {
        safeguard_type: key,
        vendor_name: sg.vendor,
        cert_number: sg.cert,
        service_date: sg.lastService,
        next_due_date: sg.nextDue,
        interval_label: sg.interval,
      },
      status: DEMO_STATUS_MAP[sg.status] || 'no_record',
    });
  }
  return map;
}

export function PSESafeguardsSection({ organizationId, locationId, isGuidedTour }: Props) {
  const { data: records, isLoading: loading } = useVendorServiceRecords(organizationId, locationId, isGuidedTour);
  const [pseOpen, setPseOpen] = useState(false);

  // Build safeguard statuses
  const demoData = isGuidedTour ? getDemoRecords() : null;

  const safeguards = PSE_SAFEGUARDS.map(sg => {
    if (isGuidedTour && demoData) {
      const demo = demoData.get(sg.key);
      return {
        ...sg,
        record: demo?.record || null,
        status: demo?.status || 'no_record' as PSEStatus,
      };
    }
    const record = records.get(sg.key) || null;
    return { ...sg, record, status: getPSEStatus(record) };
  });

  // KPI counts
  const counts: Record<PSEStatus, number> = { current: 0, due_soon: 0, overdue: 0, no_record: 0 };
  for (const sg of safeguards) counts[sg.status]++;

  // Alert banner logic
  const hasOverdue = counts.overdue > 0;
  const hasDueSoon = counts.due_soon > 0 && !hasOverdue;

  return (
    <div style={{ marginTop: 32 }}>
      {/* ── Section Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Shield size={18} style={{ color: NAVY }} />
        <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Protective Safeguards</span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          background: '#fdf8e8', color: GOLD, border: `1px solid ${GOLD}`,
        }}>PSE-Relevant</span>
      </div>
      <p style={{ fontSize: 12, color: '#6B7F96', marginBottom: 8, lineHeight: 1.6 }}>
        PSE-relevant service records for this location
      </p>

      {/* ── "What is PSE?" disclosure ── */}
      <button
        onClick={() => setPseOpen(!pseOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
          color: NAVY, background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, marginBottom: pseOpen ? 0 : 16,
        }}
      >
        {pseOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        What is PSE?
      </button>
      {pseOpen && (
        <div style={{
          fontSize: 11, color: '#3D5068', lineHeight: 1.7, padding: '10px 14px',
          background: '#F8F9FC', border: `1px solid #E5E7EB`, borderRadius: 8,
          marginBottom: 16,
        }}>
          A Protective Safeguards Endorsement is a commercial property policy condition
          requiring maintenance of specific protective systems. Non-compliance at time of
          loss may allow your carrier to deny a claim. Consult your carrier or broker to
          confirm your specific PSE requirements.
        </div>
      )}

      {/* ── Alert Banner ── */}
      {hasOverdue && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
          marginBottom: 16,
        }}>
          <AlertTriangle size={16} style={{ color: '#991B1B', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.5 }}>
            <strong>Coverage Risk</strong> — {counts.overdue} Protective Safeguard{counts.overdue !== 1 ? 's' : ''} Overdue.
            Consult your carrier or broker to confirm your Protective Safeguards Endorsement requirements.
          </span>
        </div>
      )}
      {hasDueSoon && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
          marginBottom: 16,
        }}>
          <AlertTriangle size={16} style={{ color: '#92400E', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
            <strong>Action Required</strong> — {counts.due_soon} Safeguard{counts.due_soon !== 1 ? 's' : ''} Due Within 30 Days.
          </span>
        </div>
      )}

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {([
          { key: 'current' as PSEStatus, label: 'Current' },
          { key: 'due_soon' as PSEStatus, label: 'Due Soon' },
          { key: 'overdue' as PSEStatus, label: 'Overdue' },
          { key: 'no_record' as PSEStatus, label: 'No Record' },
        ]).map(kpi => {
          const sd = STATUS_DISPLAY[kpi.key];
          return (
            <div key={kpi.key} style={{
              background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10,
              padding: '12px 14px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7F96', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: sd.color }}>{counts[kpi.key]}</div>
            </div>
          );
        })}
      </div>

      {/* ── Safeguard Cards ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 160, background: '#E5E7EB', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {safeguards.map(sg => {
            const sd = STATUS_DISPLAY[sg.status];
            const leftBorder = sg.status === 'overdue' ? '4px solid #991B1B'
              : sg.status === 'due_soon' ? '4px solid #92400E'
              : `4px solid ${BORDER}`;

            return (
              <div key={sg.key} style={{
                background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12,
                padding: '16px 20px', borderLeft: leftBorder,
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Badges */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: sd.bg, color: sd.color, border: `1px solid ${sd.border}`,
                  }}>{sd.label.toUpperCase()}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    background: '#fdf8e8', color: GOLD, border: '1px solid #e8dfc0',
                  }}>PSE-Relevant</span>
                </div>

                {/* Label + Standard */}
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4, textAlign: 'center' }}>
                  {sg.label}
                </div>
                <div style={{ fontSize: 11, color: '#6B7F96', marginBottom: 10, textAlign: 'center' }}>
                  {sg.standard}
                </div>

                {/* Details */}
                <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', flex: 1 }}>
                  <div>
                    Vendor: {sg.record?.vendor_name || 'Not on file'}
                    {sg.record?.cert_number ? ` · ${sg.record.cert_number}` : ''}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    Last Service: {formatDate(sg.record?.service_date || null)}
                    {' · '}
                    Next Due: {formatDate(sg.record?.next_due_date || null)}
                  </div>
                  {sg.record?.interval_label && (
                    <div style={{ marginTop: 4, fontStyle: 'italic' }}>
                      {sg.record.interval_label}
                    </div>
                  )}
                  {sg.record?.certificate_url && (
                    <div style={{ marginTop: 6 }}>
                      <a
                        href={sg.record.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: NAVY, fontWeight: 600, textDecoration: 'underline' }}
                      >
                        View certificate ↗
                      </a>
                    </div>
                  )}
                </div>

                {/* CTA */}
                {(sg.status === 'no_record' || sg.status === 'overdue') && (
                  <button
                    onClick={() => alert('Demo mode — Add / Update Record would open a form in production.')}
                    style={{
                      marginTop: 12, padding: '6px 16px', borderRadius: 6, fontSize: 11,
                      fontWeight: 600, cursor: 'pointer', background: NAVY, color: '#fff', border: 'none',
                      alignSelf: 'center',
                    }}
                  >
                    Add / Update Record
                  </button>
                )}
                {sg.status === 'due_soon' && (
                  <button
                    onClick={() => alert('Demo mode — Schedule Service would open a scheduling form in production.')}
                    style={{
                      marginTop: 12, padding: '6px 16px', borderRadius: 6, fontSize: 11,
                      fontWeight: 600, cursor: 'pointer', background: '#92400E', color: '#fff', border: 'none',
                      alignSelf: 'center',
                    }}
                  >
                    Schedule Service
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PSE Disclaimer Footer ── */}
      <div style={{
        marginTop: 20, padding: '12px 16px', background: '#F9FAFB',
        border: '1px solid #E5E7EB', borderRadius: 8,
        fontSize: 10, color: '#9CA3AF', lineHeight: 1.6, textAlign: 'center',
      }}>
        EvidLY LLC is a compliance technology and data platform. EvidLY is not an insurance
        company, insurance broker, or insurance producer. Risk signals and compliance data are
        informational only. Consult your carrier or broker to confirm your Protective Safeguards
        Endorsement requirements. &copy; 2026 EvidLY LLC.
      </div>
    </div>
  );
}
