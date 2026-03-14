import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  Info,
  MapPin,
  Calendar,
  User,
  Wrench,
  Clock,
  FileText,
  Bot,
  DollarSign,
  Camera,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '@shared/components/Breadcrumb';
import { useDemo } from '@shared/contexts/DemoContext';
import { useDemoGuard } from '@shared/hooks/useDemoGuard';
import { DemoUpgradePrompt } from '@shared/components/DemoUpgradePrompt';
import { AcknowledgeModal } from '../components/deficiencies/AcknowledgeModal';
import { ResolutionModal } from '../components/deficiencies/ResolutionModal';
import { DeferModal } from '../components/deficiencies/DeferModal';
import {
  DEMO_DEFICIENCIES,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  TIMELINE_REQUIREMENT_LABELS,
  daysOpen,
  type DeficiencyItem,
  type DefStatus,
} from '../data/deficienciesDemoData';

const NAVY = '#1e4d6b';

const SEVERITY_ICONS = {
  critical: AlertOctagon,
  major: AlertTriangle,
  minor: AlertCircle,
  advisory: Info,
};

const TIMELINE_STEPS: { key: DefStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_ORDER: Record<string, number> = {
  open: 0, acknowledged: 1, in_progress: 2, resolved: 3, deferred: -1,
};

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DeficiencyDetail() {
  const { deficiencyId } = useParams<{ deficiencyId: string }>();
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const [localItem, setLocalItem] = useState<DeficiencyItem | null>(() => {
    if (!deficiencyId) return null;
    const found = DEMO_DEFICIENCIES.find(d => d.id === deficiencyId);
    return found ? { ...found, timeline: [...found.timeline] } : null;
  });

  const [showAckModal, setShowAckModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDeferModal, setShowDeferModal] = useState(false);

  const item = localItem;

  // ── Status Actions ─────────────────────────────────────────
  const handleAcknowledge = useCallback((method: 'in_person' | 'email' | 'phone', notes: string) => {
    guardAction('update', 'Deficiencies', () => {
      setLocalItem(prev => {
        if (!prev) return prev;
        const now = new Date().toISOString().slice(0, 10);
        return {
          ...prev,
          status: 'acknowledged' as DefStatus,
          timeline: [...prev.timeline, { status: 'acknowledged' as DefStatus, date: now, by: 'You', notes: notes || undefined, notificationMethod: method }],
        };
      });
      setShowAckModal(false);
      toast.success('Deficiency acknowledged');
    });
  }, [guardAction]);

  const handleStartWork = useCallback(() => {
    guardAction('update', 'Deficiencies', () => {
      setLocalItem(prev => {
        if (!prev) return prev;
        const now = new Date().toISOString().slice(0, 10);
        return {
          ...prev,
          status: 'in_progress' as DefStatus,
          timeline: [...prev.timeline, { status: 'in_progress' as DefStatus, date: now, by: 'You', notes: 'Work started.' }],
        };
      });
      toast.success('Status updated to In Progress');
    });
  }, [guardAction]);

  const handleResolve = useCallback((notes: string) => {
    guardAction('update', 'Deficiencies', () => {
      setLocalItem(prev => {
        if (!prev) return prev;
        const now = new Date().toISOString().slice(0, 10);
        return {
          ...prev,
          status: 'resolved' as DefStatus,
          resolvedAt: now,
          resolvedBy: 'You',
          resolutionNotes: notes,
          timeline: [...prev.timeline, { status: 'resolved' as DefStatus, date: now, by: 'You', notes }],
        };
      });
      setShowResolveModal(false);
      toast.success('Deficiency resolved');
    });
  }, [guardAction]);

  const handleDefer = useCallback((reason: string, deferUntil: string | null) => {
    guardAction('update', 'Deficiencies', () => {
      setLocalItem(prev => {
        if (!prev) return prev;
        const now = new Date().toISOString().slice(0, 10);
        return {
          ...prev,
          status: 'deferred' as DefStatus,
          deferredReason: reason,
          deferredUntil: deferUntil,
          timeline: [...prev.timeline, { status: 'deferred' as DefStatus, date: now, by: 'You', notes: reason }],
        };
      });
      setShowDeferModal(false);
      toast.success('Deficiency deferred');
    });
  }, [guardAction]);

  if (!item) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium" style={{ color: '#0B1628' }}>Deficiency not found</p>
        <button onClick={() => navigate('/deficiencies')} className="mt-4 text-sm underline" style={{ color: NAVY }}>
          Back to Deficiencies
        </button>
      </div>
    );
  }

  const sev = SEVERITY_CONFIG[item.severity];
  const stat = STATUS_CONFIG[item.status];
  const SevIcon = SEVERITY_ICONS[item.severity];
  const currentOrder = STATUS_ORDER[item.status] ?? -1;

  return (
    <div className="space-y-5 pb-24 lg:pb-8" style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      <Breadcrumb items={[
        { label: 'Compliance', path: '/compliance' },
        { label: 'Deficiencies', path: '/deficiencies' },
        { label: item.code },
      ]} />

      {/* Header Card */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <button onClick={() => navigate('/deficiencies')} className="p-1 rounded hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-5 h-5" style={{ color: '#6B7F96' }} />
              </button>
              <span
                className="px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5"
                style={{ color: sev.color, backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}
              >
                <SevIcon className="w-3.5 h-3.5" /> {sev.label}
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ color: stat.color, backgroundColor: stat.bg }}
              >
                {stat.label}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium" style={{ color: '#3D5068', backgroundColor: '#EEF1F7' }}>
                {daysOpen(item)}d open
              </span>
              {item.aiDetected && (
                <span className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
                  <Bot className="w-3 h-3" /> AI {item.aiConfidence}%
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#0B1628' }}>{item.code} — {item.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm" style={{ color: '#3D5068' }}>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {item.locationName}</span>
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {item.foundBy}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(item.foundDate)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {item.status === 'open' && (
              <button
                onClick={() => setShowAckModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: '#d97706' }}
              >
                Acknowledge
              </button>
            )}
            {item.status === 'acknowledged' && (
              <button
                onClick={handleStartWork}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: '#2563eb' }}
              >
                Start Work
              </button>
            )}
            {item.status === 'in_progress' && (
              <button
                onClick={() => setShowResolveModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: '#16a34a' }}
              >
                Mark Resolved
              </button>
            )}
            {!['resolved', 'deferred'].includes(item.status) && (
              <button
                onClick={() => setShowDeferModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
                style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
              >
                Defer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left Column */}
        <div className="flex-1 space-y-5">
          {/* Location Card */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#0B1628' }}>
              <MapPin className="w-4 h-4" style={{ color: NAVY }} /> Location
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p style={{ color: '#6B7F96' }}>Customer</p>
                <p className="font-medium" style={{ color: '#0B1628' }}>{item.customerName}</p>
              </div>
              <div>
                <p style={{ color: '#6B7F96' }}>Location</p>
                <p className="font-medium" style={{ color: '#0B1628' }}>{item.locationName}</p>
              </div>
              {item.equipmentName && (
                <div>
                  <p style={{ color: '#6B7F96' }}>Equipment</p>
                  <p className="font-medium" style={{ color: '#0B1628' }}>{item.equipmentName}</p>
                </div>
              )}
              {item.locationDescription && (
                <div>
                  <p style={{ color: '#6B7F96' }}>Specific Area</p>
                  <p className="font-medium" style={{ color: '#0B1628' }}>{item.locationDescription}</p>
                </div>
              )}
            </div>
          </div>

          {/* Finding Details Card */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#0B1628' }}>
              <FileText className="w-4 h-4" style={{ color: NAVY }} /> Finding Details
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p style={{ color: '#6B7F96' }}>Code Reference</p>
                <p className="font-mono font-medium" style={{ color: sev.color }}>{item.code}</p>
              </div>
              <div>
                <p style={{ color: '#6B7F96' }}>Description</p>
                <p style={{ color: '#0B1628' }}>{item.description}</p>
              </div>
              {item.serviceRecordId && (
                <div>
                  <p style={{ color: '#6B7F96' }}>Found During</p>
                  <button
                    onClick={() => navigate(`/services/${item.serviceRecordId}`)}
                    className="flex items-center gap-1 text-sm font-medium hover:underline"
                    style={{ color: NAVY }}
                  >
                    Service Record {item.serviceRecordId} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p style={{ color: '#6B7F96' }}>Found By</p>
                  <p className="font-medium" style={{ color: '#0B1628' }}>{item.foundBy}</p>
                </div>
                <div>
                  <p style={{ color: '#6B7F96' }}>Date Found</p>
                  <p className="font-medium" style={{ color: '#0B1628' }}>{formatDate(item.foundDate)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Evidence Card */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#0B1628' }}>
              <Camera className="w-4 h-4" style={{ color: NAVY }} /> Photo Evidence
            </h2>
            {item.photoIds.length === 0 ? (
              <div className="text-center py-8 rounded-lg" style={{ backgroundColor: '#EEF1F7' }}>
                <Camera className="w-8 h-8 mx-auto mb-2" style={{ color: '#6B7F96' }} />
                <p className="text-sm" style={{ color: '#6B7F96' }}>No photos attached</p>
                <p className="text-xs mt-1" style={{ color: '#6B7F96' }}>Photo capture available in the full version</p>
              </div>
            ) : null}
          </div>

          {/* Resolution Card (if resolved) */}
          {item.status === 'resolved' && item.resolutionNotes && (
            <div className="rounded-xl border p-5" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#166534' }}>
                <Wrench className="w-4 h-4" /> Resolution
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <p style={{ color: '#166534' }}>Resolved By</p>
                  <p className="font-medium" style={{ color: '#0B1628' }}>{item.resolvedBy}</p>
                </div>
                <div>
                  <p style={{ color: '#166534' }}>Date</p>
                  <p className="font-medium" style={{ color: '#0B1628' }}>{item.resolvedAt ? formatDate(item.resolvedAt) : '—'}</p>
                </div>
                <div>
                  <p style={{ color: '#166534' }}>Notes</p>
                  <p style={{ color: '#0B1628' }}>{item.resolutionNotes}</p>
                </div>
                {item.followUpServiceRecordId && (
                  <div>
                    <p style={{ color: '#166534' }}>Follow-Up Service</p>
                    <button
                      onClick={() => navigate(`/services/${item.followUpServiceRecordId}`)}
                      className="flex items-center gap-1 font-medium hover:underline"
                      style={{ color: NAVY }}
                    >
                      Service Record {item.followUpServiceRecordId} <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deferral Card (if deferred) */}
          {item.status === 'deferred' && (
            <div className="rounded-xl border p-5" style={{ backgroundColor: '#f3f4f6', borderColor: '#d1d5db', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#374151' }}>
                <Clock className="w-4 h-4" /> Deferral
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <p style={{ color: '#6b7280' }}>Reason</p>
                  <p style={{ color: '#0B1628' }}>{item.deferredReason}</p>
                </div>
                {item.deferredUntil && (
                  <div>
                    <p style={{ color: '#6b7280' }}>Deferred Until</p>
                    <p className="font-medium" style={{ color: '#0B1628' }}>{formatDate(item.deferredUntil)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-80 xl:w-96 space-y-5">
          {/* Status Timeline */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#0B1628' }}>Status Timeline</h2>
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, idx) => {
                const stepOrder = STATUS_ORDER[step.key];
                const isActive = currentOrder >= stepOrder;
                const isCurrent = item.status === step.key;
                const entry = item.timeline.find(t => t.status === step.key);
                const isLast = idx === TIMELINE_STEPS.length - 1;
                return (
                  <div key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: isActive ? (isCurrent ? stat.color : '#16a34a') : '#E8EDF5',
                          border: isActive ? 'none' : '2px solid #D1D9E6',
                        }}
                      >
                        {isActive && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {!isLast && (
                        <div className="w-0.5 h-8" style={{ backgroundColor: isActive && currentOrder > stepOrder ? '#16a34a' : '#E8EDF5' }} />
                      )}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className="text-sm font-medium" style={{ color: isActive ? '#0B1628' : '#6B7F96' }}>{step.label}</p>
                      {entry && (
                        <div className="text-xs mt-0.5" style={{ color: '#6B7F96' }}>
                          <span>{formatDate(entry.date)}</span>
                          <span className="mx-1">by</span>
                          <span className="font-medium">{entry.by}</span>
                          {entry.notificationMethod && (
                            <span className="ml-1 capitalize">({entry.notificationMethod.replace('_', ' ')})</span>
                          )}
                        </div>
                      )}
                      {entry?.notes && (
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: '#3D5068' }}>{entry.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Deferred special entry */}
              {item.status === 'deferred' && (
                <div className="flex gap-3 mt-1">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6b7280' }}>
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#0B1628' }}>Deferred</p>
                    {item.timeline.filter(t => t.status === 'deferred').map((entry, i) => (
                      <div key={i} className="text-xs mt-0.5" style={{ color: '#6B7F96' }}>
                        <span>{formatDate(entry.date)}</span>
                        <span className="mx-1">by</span>
                        <span className="font-medium">{entry.by}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Remediation Card */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#0B1628' }}>
              <Wrench className="w-4 h-4" style={{ color: NAVY }} /> Remediation
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p style={{ color: '#6B7F96' }}>Required Action</p>
                <p style={{ color: '#0B1628' }}>{item.requiredAction || 'Not specified'}</p>
              </div>
              <div>
                <p style={{ color: '#6B7F96' }}>Timeline</p>
                <p className="font-medium" style={{ color: '#0B1628' }}>
                  {TIMELINE_REQUIREMENT_LABELS[item.timelineRequirement] || item.timelineRequirement}
                </p>
              </div>
              {item.estimatedCost !== null && (
                <div>
                  <p style={{ color: '#6B7F96' }}>Estimated Cost</p>
                  <p className="font-medium flex items-center gap-1" style={{ color: '#0B1628' }}>
                    <DollarSign className="w-3.5 h-3.5" /> {item.estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Follow-Up Card */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#0B1628' }}>
              <Calendar className="w-4 h-4" style={{ color: NAVY }} /> Follow-Up
            </h2>
            <button
              onClick={() => alert('Schedule Follow-Up — available in the full version.')}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
              style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
            >
              Schedule Follow-Up
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAckModal && (
        <AcknowledgeModal
          deficiencyCode={item.code}
          deficiencyTitle={item.title}
          onClose={() => setShowAckModal(false)}
          onSubmit={handleAcknowledge}
        />
      )}
      {showResolveModal && (
        <ResolutionModal
          deficiencyCode={item.code}
          deficiencyTitle={item.title}
          onClose={() => setShowResolveModal(false)}
          onSubmit={handleResolve}
        />
      )}
      {showDeferModal && (
        <DeferModal
          deficiencyCode={item.code}
          deficiencyTitle={item.title}
          onClose={() => setShowDeferModal(false)}
          onSubmit={handleDefer}
        />
      )}
      {showUpgrade && (
        <DemoUpgradePrompt
          feature={upgradeFeature}
          action={upgradeAction}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
