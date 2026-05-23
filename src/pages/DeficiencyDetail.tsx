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
  Bot,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { AcknowledgeModal } from '../components/deficiencies/AcknowledgeModal';
import { ResolutionModal } from '../components/deficiencies/ResolutionModal';
import { DeferModal } from '../components/deficiencies/DeferModal';
import { AIResolutionPlan } from '../components/deficiencies/AIResolutionPlan';
import { DeficiencyInspectorWriteup } from '../components/deficiencies/DeficiencyInspectorWriteup';
import { DeficiencyPhotos } from '../components/deficiencies/DeficiencyPhotos';
import { DeficiencyInspectionDetails } from '../components/deficiencies/DeficiencyInspectionDetails';
import { DeficiencyActivityTimeline } from '../components/deficiencies/DeficiencyActivityTimeline';
import { DeficiencyRelatedHistory } from '../components/deficiencies/DeficiencyRelatedHistory';
import { useDeficiencyResolutionPlan } from '../hooks/deficiencies/useDeficiencyResolutionPlan';
import {
  DEMO_DEFICIENCIES,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  daysOpen,
  type DeficiencyItem,
  type DefStatus,
} from '../data/deficienciesDemoData';

const NAVY = '#1E2D4D';

const SEVERITY_ICONS = {
  critical: AlertOctagon,
  major: AlertTriangle,
  minor: AlertCircle,
  advisory: Info,
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

  // ── Resolution Plan ─────────────────────────────────────────
  const { plan, generating, generatePlan, acceptPlan, completeStep, regeneratePlan } = useDeficiencyResolutionPlan(item);

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

  const TIMELINE_DAYS: Record<string, number> = { immediate: 0, '30_days': 30, '90_days': 90 };
  const computedDeadline = TIMELINE_DAYS[item.timelineRequirement] !== undefined
    ? (() => {
        const d = new Date(item.foundDate + 'T00:00:00');
        d.setDate(d.getDate() + TIMELINE_DAYS[item.timelineRequirement]);
        return d;
      })()
    : null;
  const isPastDeadline = computedDeadline ? computedDeadline.getTime() < Date.now() : false;

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
              <button onClick={() => navigate('/deficiencies')} className="p-1 rounded hover:bg-[#1E2D4D]/5 transition-colors">
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
              {computedDeadline && (
                <span
                  className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                  style={{
                    color: isPastDeadline ? '#b3261e' : '#c2731a',
                    backgroundColor: isPastDeadline ? 'rgba(179,38,30,0.1)' : 'rgba(194,115,26,0.1)',
                  }}
                >
                  <Clock className="w-3 h-3" />
                  {isPastDeadline ? 'Past deadline' : `Due ${computedDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </span>
              )}
              {item.aiDetected && (
                <span className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>
                  <Bot className="w-3 h-3" /> AI {item.aiConfidence}%
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#0B1628' }}>
              <span className="font-mono">{item.code}</span> — {item.title}
            </h1>
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
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-[#FAF7F0]"
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
          {/* AI Resolution Plan */}
          <AIResolutionPlan
            plan={plan}
            generating={generating}
            onGenerate={generatePlan}
            onAccept={acceptPlan}
            onCompleteStep={completeStep}
            onRegenerate={regeneratePlan}
          />

          {/* Inspector Write-up */}
          <DeficiencyInspectorWriteup
            description={item.description}
            foundBy={item.foundBy}
            foundDate={item.foundDate}
          />

          {/* Photos */}
          <DeficiencyPhotos
            photoIds={item.photoIds}
            resolutionPhotoIds={item.resolutionPhotoIds}
          />

          {/* Resolution Card (if resolved) */}
          {item.status === 'resolved' && item.resolutionNotes && (
            <div className="bg-white rounded-xl border border-[#E2DDD4] p-5" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#166534' }}>
                <Wrench className="w-4 h-4" /> Resolution
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: '#166534' }}>Resolved by</span>
                  <span className="font-medium" style={{ color: NAVY }}>{item.resolvedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#166534' }}>Date</span>
                  <span className="font-medium" style={{ color: NAVY }}>{item.resolvedAt ? formatDate(item.resolvedAt) : '\u2014'}</span>
                </div>
                <div>
                  <p style={{ color: '#166534' }} className="mb-1">Notes</p>
                  <p style={{ color: NAVY }}>{item.resolutionNotes}</p>
                </div>
                {item.followUpServiceRecordId && (
                  <button
                    onClick={() => navigate(`/services/${item.followUpServiceRecordId}`)}
                    className="flex items-center gap-1 text-sm font-medium hover:underline mt-2"
                    style={{ color: NAVY }}
                  >
                    View follow-up service <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Deferral Card (if deferred) */}
          {item.status === 'deferred' && (
            <div className="bg-white rounded-xl border border-[#E2DDD4] p-5" style={{ backgroundColor: '#f3f4f6', borderColor: '#d1d5db' }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#374151' }}>
                <Clock className="w-4 h-4" /> Deferral
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p style={{ color: '#6b7280' }}>Reason</p>
                  <p style={{ color: NAVY }}>{item.deferredReason}</p>
                </div>
                {item.deferredUntil && (
                  <div className="flex justify-between">
                    <span style={{ color: '#6b7280' }}>Deferred until</span>
                    <span className="font-medium" style={{ color: NAVY }}>{formatDate(item.deferredUntil)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="w-full lg:w-80 xl:w-96 space-y-5">
          <DeficiencyInspectionDetails item={item} />
          <DeficiencyActivityTimeline timeline={item.timeline} plan={plan} />
          <DeficiencyRelatedHistory
            currentId={item.id}
            code={item.code}
            allDeficiencies={DEMO_DEFICIENCIES}
          />
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
