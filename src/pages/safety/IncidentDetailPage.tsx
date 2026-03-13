/**
 * IncidentDetailPage -- Full detail view for a single safety incident report.
 * Route: /safety/incidents/:id
 */
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  MapPin,
  Calendar,
  Clock,
  User,
  Users,
  FileText,
  Stethoscope,
  Search,
  CheckCircle,
} from 'lucide-react';
import {
  useIncidentReport,
  type IncidentSeverity,
  type IncidentReportStatus,
  type SafetyIncidentType,
} from '../../hooks/api/useIncidents';

// ── Design tokens ────────────────────────────────────────────
const NAVY = '#163a5f';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#D1D9E6';
const CARD_SHADOW = '0 1px 3px rgba(11,22,40,.06), 0 1px 2px rgba(11,22,40,.04)';
const TEXT_TERTIARY = '#6B7F96';

// ── Badge configs ────────────────────────────────────────────
const SEVERITY_BADGE: Record<IncidentSeverity, { bg: string; text: string }> = {
  minor: { bg: '#F1F5F9', text: '#64748B' },
  moderate: { bg: '#FEF3C7', text: '#D97706' },
  serious: { bg: '#FFF7ED', text: '#EA580C' },
  critical: { bg: '#FEF2F2', text: '#DC2626' },
};

const STATUS_BADGE: Record<IncidentReportStatus, { bg: string; text: string; label: string }> = {
  reported: { bg: '#F1F5F9', text: '#64748B', label: 'Reported' },
  investigating: { bg: '#EFF6FF', text: '#2563EB', label: 'Investigating' },
  resolved: { bg: '#F0FDF4', text: '#16a34a', label: 'Resolved' },
  closed: { bg: '#F8FAFC', text: '#475569', label: 'Closed' },
};

const TYPE_LABELS: Record<SafetyIncidentType, string> = {
  injury: 'Injury',
  near_miss: 'Near Miss',
  property_damage: 'Property Damage',
  vehicle_accident: 'Vehicle Accident',
  chemical_exposure: 'Chemical Exposure',
};

// ── Status timeline steps ────────────────────────────────────
const TIMELINE_STEPS: { status: IncidentReportStatus; label: string }[] = [
  { status: 'reported', label: 'Reported' },
  { status: 'investigating', label: 'Investigating' },
  { status: 'resolved', label: 'Resolved' },
  { status: 'closed', label: 'Closed' },
];

// ── Helpers ──────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(time: string | null): string {
  if (!time) return '--';
  return time;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}

function getStepIndex(status: IncidentReportStatus): number {
  const idx = TIMELINE_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}

// ── Section card wrapper ─────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: typeof ShieldAlert; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-6" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5" style={{ color: NAVY }} />
        <h2 className="text-base font-semibold" style={{ color: NAVY }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Detail row ───────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
      <span className="text-sm font-medium sm:w-44 shrink-0" style={{ color: TEXT_TERTIARY }}>{label}</span>
      <span className="text-sm" style={{ color: NAVY }}>{value || '--'}</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: incident, isLoading } = useIncidentReport(id || '');

  // ── Loading state ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl p-6 animate-pulse" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
            <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Empty / not found ──────────────────────────────────────
  if (!incident) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/safety/incidents')}
            className="p-2 rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: CARD_BORDER }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: NAVY }} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Incident Not Found</h1>
        </div>
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <ShieldAlert className="w-12 h-12 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
          <p className="text-base font-semibold" style={{ color: NAVY }}>
            No incident found with ID #{shortId(id || '')}
          </p>
          <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>
            This incident may have been removed or the ID is invalid.
          </p>
          <button
            onClick={() => navigate('/safety/incidents')}
            className="mt-4 px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ background: '#1e4d6b' }}
          >
            Back to Incidents
          </button>
        </div>
      </div>
    );
  }

  const sevBadge = SEVERITY_BADGE[incident.severity];
  const statusBadge = STATUS_BADGE[incident.status];
  const currentStepIdx = getStepIndex(incident.status);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/safety/incidents')}
            className="p-2 rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: CARD_BORDER }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: NAVY }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>
              Incident #{shortId(incident.id)}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: TEXT_TERTIARY }}>
              Reported {formatDate(incident.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: sevBadge.bg, color: sevBadge.text }}
          >
            {capitalize(incident.severity)}
          </span>
          <span
            className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: statusBadge.bg, color: statusBadge.text }}
          >
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* ── Incident Info ─────────────────────────────────────── */}
      <Section title="Incident Information" icon={ShieldAlert}>
        <div className="space-y-0">
          <DetailRow label="Type" value={TYPE_LABELS[incident.incidentType]} />
          <DetailRow
            label="Severity"
            value={
              <span
                className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: sevBadge.bg, color: sevBadge.text }}
              >
                {capitalize(incident.severity)}
              </span>
            }
          />
          <DetailRow
            label="Date"
            value={
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
                {formatDate(incident.incidentDate)}
              </span>
            }
          />
          <DetailRow
            label="Time"
            value={
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
                {formatTime(incident.incidentTime)}
              </span>
            }
          />
          <DetailRow
            label="Location"
            value={
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
                {incident.location}
              </span>
            }
          />
        </div>
      </Section>

      {/* ── People Involved ───────────────────────────────────── */}
      <Section title="People Involved" icon={Users}>
        <div className="space-y-0">
          <DetailRow
            label="Reported By"
            value={
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" style={{ color: TEXT_TERTIARY }} />
                {incident.reportedByName || incident.reportedBy}
              </span>
            }
          />
          <DetailRow
            label="Injured Employee"
            value={incident.injuredEmployeeName || incident.injuredEmployeeId || 'N/A'}
          />
          <DetailRow
            label="Third Party Involved"
            value={incident.thirdPartyInvolved ? (incident.thirdPartyName || 'Yes') : 'No'}
          />
        </div>
      </Section>

      {/* ── Description ───────────────────────────────────────── */}
      <Section title="Description" icon={FileText}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: NAVY }}>
          {incident.description || 'No description provided.'}
        </p>
      </Section>

      {/* ── Immediate Actions ─────────────────────────────────── */}
      <Section title="Immediate Actions" icon={CheckCircle}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: NAVY }}>
          {incident.immediateActions || 'No immediate actions recorded.'}
        </p>
        {incident.witnesses && (
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
            <p className="text-sm font-medium mb-1" style={{ color: TEXT_TERTIARY }}>Witnesses</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: NAVY }}>{incident.witnesses}</p>
          </div>
        )}
      </Section>

      {/* ── Medical Info ──────────────────────────────────────── */}
      {(incident.medicalAttentionRequired || incident.medicalFacility) && (
        <Section title="Medical Information" icon={Stethoscope}>
          <div className="space-y-0">
            <DetailRow label="Medical Attention Required" value={incident.medicalAttentionRequired ? 'Yes' : 'No'} />
            <DetailRow label="Medical Facility" value={incident.medicalFacility || 'N/A'} />
            <DetailRow label="Workers Comp Filed" value={incident.workersCompFiled ? 'Yes' : 'No'} />
            {incident.workersCompClaimNumber && (
              <DetailRow label="Claim Number" value={incident.workersCompClaimNumber} />
            )}
          </div>
        </Section>
      )}

      {/* ── Photos ────────────────────────────────────────────── */}
      <Section title="Photos" icon={FileText}>
        {incident.photos.length === 0 ? (
          <p className="text-sm" style={{ color: TEXT_TERTIARY }}>No photos attached.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {incident.photos.map((url, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-lg overflow-hidden"
                style={{ background: '#EEF1F7', border: `1px solid ${CARD_BORDER}` }}
              >
                <img src={url} alt={`Incident photo ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Investigation ─────────────────────────────────────── */}
      <Section title="Investigation" icon={Search}>
        <div className="space-y-0">
          <DetailRow label="Investigated By" value={incident.investigatedBy || 'Not yet assigned'} />
          <DetailRow label="Investigation Date" value={incident.investigatedAt ? formatDate(incident.investigatedAt) : 'Pending'} />
          <DetailRow label="Root Cause" value={incident.rootCause || 'Not yet determined'} />
          <DetailRow label="Preventive Measures" value={incident.preventiveMeasures || 'Not yet defined'} />
          <DetailRow
            label="Caused by Negligence"
            value={
              incident.causedByNegligence ? (
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  Yes
                </span>
              ) : (
                'No'
              )
            }
          />
        </div>
      </Section>

      {/* ── Status Timeline ───────────────────────────────────── */}
      <div className="rounded-xl p-6" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
        <h2 className="text-base font-semibold mb-5" style={{ color: NAVY }}>Status Timeline</h2>
        <div className="flex items-center justify-between">
          {TIMELINE_STEPS.map((step, idx) => {
            const isComplete = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <div key={step.status} className="flex flex-col items-center flex-1">
                <div className="relative flex items-center w-full">
                  {idx > 0 && (
                    <div
                      className="absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2"
                      style={{ background: idx <= currentStepIdx ? '#1e4d6b' : CARD_BORDER }}
                    />
                  )}
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div
                      className="absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2"
                      style={{ background: idx < currentStepIdx ? '#1e4d6b' : CARD_BORDER }}
                    />
                  )}
                  <div
                    className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center mx-auto"
                    style={{
                      background: isComplete ? '#1e4d6b' : CARD_BG,
                      border: `2px solid ${isComplete ? '#1e4d6b' : CARD_BORDER}`,
                    }}
                  >
                    {isComplete && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
                <span
                  className="text-xs mt-2 font-medium"
                  style={{ color: isCurrent ? NAVY : TEXT_TERTIARY }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Action Buttons ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 pb-8">
        {incident.status === 'reported' && (
          <button
            onClick={() => alert('Begin investigation flow coming soon.')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ background: '#1e4d6b' }}
          >
            <Search className="w-4 h-4" />
            Begin Investigation
          </button>
        )}
        <button
          onClick={() => alert('Update status flow coming soon.')}
          className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50"
          style={{ borderColor: CARD_BORDER, color: NAVY }}
        >
          Update Status
        </button>
      </div>
    </div>
  );
}
