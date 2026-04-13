import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, AlertTriangle, Clock, MapPin, Calendar,
  User, DollarSign, FileText, Award, Camera, ImageOff, ShieldCheck,
  Flag,
} from 'lucide-react';
import { format } from 'date-fns';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { getServiceRecordById, type DemoServiceRecord } from '../data/demoServiceRecords';
import { PhotoGallery } from '../components/PhotoGallery';
import { PhotoEvidence } from '../components/PhotoEvidence';
import type { PhotoRecord } from '../components/PhotoEvidence';
import { FlagServiceModal } from '../components/services/FlagServiceModal';
import { EmptyState } from '../components/shared/EmptyState';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG,
  BODY_TEXT, MUTED, TEXT_TERTIARY, PAGE_BG, FONT,
} from '../components/dashboard/shared/constants';

// ── Types ──────────────────────────────────────────────────────

type TabId = 'overview' | 'photos' | 'qa';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'photos', label: 'Photos' },
  { id: 'qa', label: 'QA Review' },
];

const CATEGORY_LABELS: Record<string, string> = {
  kitchen_exhaust: 'Kitchen Exhaust',
  pest_control: 'Pest Control',
  fire_suppression: 'Fire Suppression',
  hvac: 'HVAC',
  grease_trap: 'Grease Trap',
};

const FLAG_CATEGORY_LABELS: Record<string, string> = {
  incomplete_work: 'Incomplete Work',
  wrong_service: 'Wrong Service Performed',
  safety_concern: 'Safety Concern',
  documentation_issue: 'Documentation Issue',
  other: 'Other',
};

// ── Helpers ────────────────────────────────────────────────────

function resultBadge(result: string) {
  if (result === 'pass') return { label: 'Pass', bg: '#dcfce7', color: '#15803d' };
  if (result === 'fail') return { label: 'Fail', bg: '#fee2e2', color: '#dc2626' };
  return { label: 'N/A', bg: '#f3f4f6', color: '#6b7280' };
}

function qaBadge(status: string | null) {
  switch (status) {
    case 'approved':
      return { label: 'Approved', bg: '#dcfce7', color: '#15803d', Icon: CheckCircle };
    case 'flagged':
      return { label: 'Flagged', bg: '#fee2e2', color: '#dc2626', Icon: AlertTriangle };
    case 'pending_review':
      return { label: 'Pending Review', bg: '#eff6ff', color: '#2563eb', Icon: Clock };
    default:
      return { label: 'Not Reviewed', bg: '#f3f4f6', color: '#6b7280', Icon: Clock };
  }
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
}

function fmtDateTime(d: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'MMM d, yyyy h:mm a'); } catch { return d; }
}

function fmtCost(cost: number | null) {
  if (cost === null || cost === undefined) return '—';
  return `$${cost.toLocaleString()}`;
}

// ── Component ──────────────────────────────────────────────────

export function ServiceRecordDetail() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { guardAction } = useDemoGuard();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showFlagModal, setShowFlagModal] = useState(false);

  // Local QA state (demo mode — not persisted)
  const baseRecord = recordId ? getServiceRecordById(recordId) : undefined;
  const [qaOverride, setQaOverride] = useState<{
    qaStatus: DemoServiceRecord['qaStatus'];
    qaReviewedBy: string | null;
    qaReviewedAt: string | null;
    qaFlagReason: string | null;
    qaFlagCategory: DemoServiceRecord['qaFlagCategory'];
  } | null>(null);

  // Local photo state (demo mode — not persisted)
  const [beforePhotos, setBeforePhotos] = useState<PhotoRecord[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<PhotoRecord[]>([]);
  const [showAddPhoto, setShowAddPhoto] = useState<'before' | 'after' | null>(null);

  // Merge QA override with base record
  const record: DemoServiceRecord | undefined = baseRecord
    ? { ...baseRecord, ...(qaOverride ?? {}) }
    : undefined;

  // ── Not found / non-demo ─────────────────────────────────
  if (!isDemoMode) {
    return (
      <div className="p-6" style={{ ...FONT, background: PAGE_BG, minHeight: '100vh' }}>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: BODY_TEXT }}>Service Record</h1>
        <div className="rounded-xl border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <EmptyState type="service_records" customHeading="No Data Available" customSubtext="Service record details will appear here once connected to your account." />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6" style={{ ...FONT, background: PAGE_BG, minHeight: '100vh' }}>
        <button onClick={() => navigate('/services')} className="flex items-center gap-1 text-sm font-medium mb-4 hover:underline" style={{ color: '#1E2D4D' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Services
        </button>
        <div className="rounded-xl border p-12 text-center" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
          <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: TEXT_TERTIARY }} />
          <h2 className="text-lg font-semibold tracking-tight mb-2" style={{ color: BODY_TEXT }}>Record Not Found</h2>
          <p className="text-sm" style={{ color: MUTED }}>The service record you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const rb = resultBadge(record.result);
  const qa = qaBadge(record.qaStatus);

  // ── QA Actions ───────────────────────────────────────────
  function handleApprove() {
    guardAction('approve', 'QA Review', () => {
      setQaOverride({
        qaStatus: 'approved',
        qaReviewedBy: 'You',
        qaReviewedAt: new Date().toISOString(),
        qaFlagReason: null,
        qaFlagCategory: null,
      });
    });
  }

  function handleFlag(reason: string, category: string) {
    setQaOverride({
      qaStatus: 'flagged',
      qaReviewedBy: 'You',
      qaReviewedAt: new Date().toISOString(),
      qaFlagReason: reason,
      qaFlagCategory: category as DemoServiceRecord['qaFlagCategory'],
    });
    setShowFlagModal(false);
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto" style={{ ...FONT, minHeight: '100vh' }}>
      {/* Back */}
      <button
        onClick={() => navigate('/services')}
        className="flex items-center gap-1 text-sm font-medium mb-4 hover:underline"
        style={{ color: '#1E2D4D' }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Services
      </button>

      {/* Header Card */}
      <div
        className="rounded-xl border p-5 lg:p-6 mb-5"
        style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight mb-1" style={{ color: BODY_TEXT }}>
              {record.serviceName}
            </h1>
            <p className="text-sm mb-3" style={{ color: MUTED }}>{record.vendorName}</p>
            <div className="flex flex-wrap gap-2">
              {/* Result badge */}
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: rb.bg, color: rb.color }}
              >
                {record.result === 'pass' ? <CheckCircle className="w-3.5 h-3.5" /> : record.result === 'fail' ? <AlertTriangle className="w-3.5 h-3.5" /> : null}
                {rb.label}
              </span>
              {/* QA badge */}
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: qa.bg, color: qa.color }}
              >
                <qa.Icon className="w-3.5 h-3.5" />
                {qa.label}
              </span>
              {/* Category */}
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: PANEL_BG, color: MUTED }}
              >
                {CATEGORY_LABELS[record.categoryId] || record.categoryId}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm shrink-0" style={{ color: MUTED }}>
            <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />{record.locationName}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />{fmtDate(record.serviceDate)}</span>
            <span className="inline-flex items-center gap-1.5"><User className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />{record.technicianName}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-5" style={{ borderColor: CARD_BORDER }}>
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 text-sm font-medium transition-colors relative cursor-pointer"
              style={{ color: isActive ? BODY_TEXT : MUTED, fontWeight: isActive ? 700 : 500 }}
            >
              {tab.label}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{ backgroundColor: '#1E2D4D' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab record={record} />}
      {activeTab === 'photos' && (
        <PhotosTab
          beforePhotos={beforePhotos}
          afterPhotos={afterPhotos}
          showAddPhoto={showAddPhoto}
          setShowAddPhoto={setShowAddPhoto}
          onAddBefore={(photos) => { setBeforePhotos(photos); setShowAddPhoto(null); }}
          onAddAfter={(photos) => { setAfterPhotos(photos); setShowAddPhoto(null); }}
          guardAction={guardAction}
        />
      )}
      {activeTab === 'qa' && (
        <QATab
          record={record}
          onApprove={handleApprove}
          onFlagClick={() => guardAction('flag', 'QA Review', () => setShowFlagModal(true))}
        />
      )}

      {/* Flag Modal */}
      {showFlagModal && (
        <FlagServiceModal
          serviceName={record.serviceName}
          vendorName={record.vendorName}
          onClose={() => setShowFlagModal(false)}
          onSubmit={handleFlag}
        />
      )}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────

function OverviewTab({ record }: { record: DemoServiceRecord }) {
  return (
    <div className="space-y-5">
      {/* Details Grid */}
      <div
        className="rounded-xl border p-5"
        style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
      >
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: TEXT_TERTIARY }}>
          Service Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailRow icon={Calendar} label="Service Date" value={fmtDate(record.serviceDate)} />
          <DetailRow icon={Calendar} label="Next Due" value={fmtDate(record.nextDueDate)} />
          <DetailRow icon={User} label="Technician" value={record.technicianName} />
          <DetailRow icon={DollarSign} label="Cost" value={fmtCost(record.cost)} />
          <DetailRow icon={Award} label="Certificate" value={record.certificateNumber || '—'} />
          <DetailRow icon={MapPin} label="Location" value={record.locationName} />
        </div>
      </div>

      {/* Notes */}
      <div
        className="rounded-xl border p-5"
        style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
      >
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: TEXT_TERTIARY }}>
          Service Notes
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: BODY_TEXT }}>
          {record.notes || 'No notes recorded.'}
        </p>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: TEXT_TERTIARY }} />
      <div>
        <div className="text-xs font-medium" style={{ color: TEXT_TERTIARY }}>{label}</div>
        <div className="text-sm font-medium" style={{ color: BODY_TEXT }}>{value}</div>
      </div>
    </div>
  );
}

// ── Photos Tab ─────────────────────────────────────────────────

interface PhotosTabProps {
  beforePhotos: PhotoRecord[];
  afterPhotos: PhotoRecord[];
  showAddPhoto: 'before' | 'after' | null;
  setShowAddPhoto: (v: 'before' | 'after' | null) => void;
  onAddBefore: (photos: PhotoRecord[]) => void;
  onAddAfter: (photos: PhotoRecord[]) => void;
  guardAction: (action: string, feature: string, cb: () => void) => void;
}

function PhotosTab({ beforePhotos, afterPhotos, showAddPhoto, setShowAddPhoto, onAddBefore, onAddAfter, guardAction }: PhotosTabProps) {
  return (
    <div className="space-y-5">
      {/* Before Photos */}
      <div
        className="rounded-xl border p-5"
        style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: TEXT_TERTIARY }}>
            Before Photos
          </h3>
          <button
            onClick={() => guardAction('upload', 'Photo Evidence', () => setShowAddPhoto('before'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#1E2D4D' }}
          >
            <Camera className="w-3.5 h-3.5" /> Add Photo
          </button>
        </div>
        {showAddPhoto === 'before' ? (
          <PhotoEvidence photos={beforePhotos} onChange={onAddBefore} maxPhotos={6} label="Before Service" />
        ) : beforePhotos.length > 0 ? (
          <PhotoGallery photos={beforePhotos} title="Before Service" />
        ) : (
          <EmptyPhotoState label="No before photos attached" />
        )}
      </div>

      {/* After Photos */}
      <div
        className="rounded-xl border p-5"
        style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: TEXT_TERTIARY }}>
            After Photos
          </h3>
          <button
            onClick={() => guardAction('upload', 'Photo Evidence', () => setShowAddPhoto('after'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#1E2D4D' }}
          >
            <Camera className="w-3.5 h-3.5" /> Add Photo
          </button>
        </div>
        {showAddPhoto === 'after' ? (
          <PhotoEvidence photos={afterPhotos} onChange={onAddAfter} maxPhotos={6} label="After Service" />
        ) : afterPhotos.length > 0 ? (
          <PhotoGallery photos={afterPhotos} title="After Service" />
        ) : (
          <EmptyPhotoState label="No after photos attached" />
        )}
      </div>
    </div>
  );
}

function EmptyPhotoState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 rounded-lg" style={{ background: PANEL_BG }}>
      <ImageOff className="w-10 h-10 mb-2" style={{ color: TEXT_TERTIARY }} />
      <p className="text-sm" style={{ color: TEXT_TERTIARY }}>{label}</p>
    </div>
  );
}

// ── QA Review Tab ──────────────────────────────────────────────

interface QATabProps {
  record: DemoServiceRecord;
  onApprove: () => void;
  onFlagClick: () => void;
}

function QATab({ record, onApprove, onFlagClick }: QATabProps) {
  const qa = qaBadge(record.qaStatus);

  return (
    <div className="space-y-5">
      {/* Status Banner */}
      <div
        className="rounded-xl border p-5"
        style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
      >
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: TEXT_TERTIARY }}>
          Review Status
        </h3>

        <div className="rounded-xl p-4" style={{ background: qa.bg }}>
          <div className="flex items-center gap-2 mb-1">
            <qa.Icon className="w-5 h-5" style={{ color: qa.color }} />
            <span className="text-sm font-bold" style={{ color: qa.color }}>{qa.label}</span>
          </div>

          {record.qaStatus === 'approved' && (
            <p className="text-sm mt-1" style={{ color: qa.color }}>
              Reviewed by <span className="font-semibold">{record.qaReviewedBy}</span> on {fmtDateTime(record.qaReviewedAt)}
            </p>
          )}

          {record.qaStatus === 'flagged' && (
            <div className="mt-2 space-y-1">
              <p className="text-sm" style={{ color: qa.color }}>
                Flagged by <span className="font-semibold">{record.qaReviewedBy}</span> on {fmtDateTime(record.qaReviewedAt)}
              </p>
              {record.qaFlagCategory && (
                <p className="text-sm" style={{ color: qa.color }}>
                  <span className="font-semibold">Category:</span> {FLAG_CATEGORY_LABELS[record.qaFlagCategory] || record.qaFlagCategory}
                </p>
              )}
              {record.qaFlagReason && (
                <p className="text-sm mt-2" style={{ color: qa.color }}>
                  <span className="font-semibold">Reason:</span> {record.qaFlagReason}
                </p>
              )}
            </div>
          )}

          {record.qaStatus === 'pending_review' && (
            <p className="text-sm mt-1" style={{ color: qa.color }}>
              This service record is awaiting quality assurance review.
            </p>
          )}

          {!record.qaStatus && (
            <p className="text-sm mt-1" style={{ color: qa.color }}>
              This record predates the QA review process.
            </p>
          )}
        </div>

        {/* Action Buttons (only for pending_review) */}
        {record.qaStatus === 'pending_review' && (
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={onApprove}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors"
              style={{ backgroundColor: '#15803d' }}
            >
              <ShieldCheck className="w-4 h-4" /> Approve
            </button>
            <button
              onClick={onFlagClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors"
              style={{ backgroundColor: '#dc2626' }}
            >
              <Flag className="w-4 h-4" /> Flag Issue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
