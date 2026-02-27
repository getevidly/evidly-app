import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle, Circle, ChevronDown, ChevronRight,
  Upload, X, Star,
} from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';
import { useAuth } from '../contexts/AuthContext';
import {
  BASE_DOCUMENTS, PILLAR_META, DEMO_CHECKLIST_STATUS, getDocumentsForState,
  type OnboardingDocument,
} from '../data/onboardingDocuments';
import { SmartUploadModal, type ClassifiedFile } from '../components/SmartUploadModal';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChecklistEntry {
  status: 'pending' | 'uploaded' | 'not_applicable';
  uploadedAt?: string;
  expiresAt?: string;
  reason?: string;
}

interface UploadTarget {
  docId: string;
  docName: string;
}

interface NaModalState {
  docId: string;
  docName: string;
  reason: string;
  customReason: string;
}

// IDs that can be marked "Not Applicable"
const CONDITIONAL_IDS = new Set([
  'haccp_plan', 'backflow_test', 'certificate_occupancy',
  'building_fire_inspection', 'exhaust_fan_service',
  'allergen_training', 'vendor_licenses', 'service_agreements',
]);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentChecklist() {
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  // -- checklist state (seed from demo or blank) --
  const [checklist, setChecklist] = useState<Record<string, ChecklistEntry>>(() => {
    if (isDemoMode) {
      const seed: Record<string, ChecklistEntry> = {};
      for (const [id, entry] of Object.entries(DEMO_CHECKLIST_STATUS)) {
        seed[id] = { ...entry };
      }
      return seed;
    }
    return {};
  });

  const documents = useMemo(() => getDocumentsForState(), []);

  // -- UI state --
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const key of Object.keys(PILLAR_META)) init[key] = true;
    return init;
  });
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);
  const [naModal, setNaModal] = useState<NaModalState | null>(null);

  // -- helpers --
  const getEntry = (id: string): ChecklistEntry =>
    checklist[id] || { status: 'pending' };

  const isComplete = (id: string) => {
    const s = getEntry(id).status;
    return s === 'uploaded' || s === 'not_applicable';
  };

  // -- progress (required items only) --
  const requiredDocs = useMemo(() => documents.filter((d) => d.required), [documents]);
  const requiredComplete = useMemo(
    () => requiredDocs.filter((d) => isComplete(d.id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requiredDocs, checklist],
  );
  const progressPct = requiredDocs.length > 0
    ? Math.round((requiredComplete / requiredDocs.length) * 100)
    : 0;
  const allRequiredDone = progressPct === 100;

  // -- group docs by pillar, required first --
  const pillarGroups = useMemo(() => {
    const grouped: Record<string, OnboardingDocument[]> = {};
    for (const doc of documents) {
      if (!grouped[doc.pillar]) grouped[doc.pillar] = [];
      grouped[doc.pillar].push(doc);
    }
    // Sort each group: required first, then alphabetical
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => {
        if (a.required !== b.required) return a.required ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
    return grouped;
  }, [documents]);

  const PILLAR_DISPLAY_ORDER = ['facility_safety', 'food_safety', 'vendor', 'facility'];
  const pillarOrder = useMemo(
    () => PILLAR_DISPLAY_ORDER.filter((k) => k in PILLAR_META),
    [],
  );

  // -- pillar counts --
  const pillarCounts = (pillar: string) => {
    const docs = pillarGroups[pillar] || [];
    const done = docs.filter((d) => isComplete(d.id)).length;
    return { done, total: docs.length };
  };

  // -- toggle pillar --
  const togglePillar = (pillar: string) =>
    setExpandedPillars((prev) => ({ ...prev, [pillar]: !prev[pillar] }));

  // -----------------------------------------------------------------------
  // Upload handlers (via SmartUploadModal)
  // -----------------------------------------------------------------------
  const openUpload = (doc: OnboardingDocument) => {
    setUploadTarget({ docId: doc.id, docName: doc.name });
  };

  const handleSmartUploadSave = (classifiedFiles: ClassifiedFile[]) => {
    if (!uploadTarget || classifiedFiles.length === 0) return;
    const first = classifiedFiles[0];
    const now = new Date().toISOString().slice(0, 10);
    setChecklist((prev) => ({
      ...prev,
      [uploadTarget.docId]: {
        status: 'uploaded',
        uploadedAt: now,
        expiresAt: first.overrides.expiryDate || undefined,
      },
    }));
    const newComplete = requiredDocs.filter((d) =>
      d.id === uploadTarget.docId ? true : isComplete(d.id),
    ).length;
    toast.success(
      `AI-classified and saved! ${newComplete} of ${requiredDocs.length} required documents complete.`,
    );
    setUploadTarget(null);
  };

  // -----------------------------------------------------------------------
  // Not-applicable modal handlers
  // -----------------------------------------------------------------------
  const openNaModal = (doc: OnboardingDocument) => {
    setNaModal({
      docId: doc.id,
      docName: doc.name,
      reason: "We don't need this",
      customReason: '',
    });
  };

  const handleNaSave = () => {
    if (!naModal) return;
    const reason = naModal.reason === 'Other' ? naModal.customReason : naModal.reason;
    setChecklist((prev) => ({
      ...prev,
      [naModal.docId]: { status: 'not_applicable', reason },
    }));
    toast.success('Marked as not applicable.');
    setNaModal(null);
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------
  const renderDocItem = (doc: OnboardingDocument) => {
    const entry = getEntry(doc.id);
    const done = entry.status === 'uploaded' || entry.status === 'not_applicable';

    if (done) {
      return (
        <div
          key={doc.id}
          className="flex items-start gap-3 py-3 px-4 rounded-lg"
          style={{ backgroundColor: '#f0fdf4' }}
        >
          <CheckCircle size={20} className="mt-0.5 flex-shrink-0" style={{ color: '#16a34a' }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">{doc.name}</span>
              {entry.status === 'not_applicable' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                  N/A
                </span>
              )}
            </div>
            {entry.uploadedAt && (
              <p className="text-sm text-gray-500 mt-0.5">
                Uploaded {entry.uploadedAt}
                {entry.expiresAt && <span> &middot; Expires {entry.expiresAt}</span>}
              </p>
            )}
            {entry.status === 'not_applicable' && entry.reason && (
              <p className="text-sm text-gray-500 mt-0.5">{entry.reason}</p>
            )}
          </div>
          {entry.status === 'uploaded' && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                className="text-sm font-medium hover:underline"
                style={{ color: '#1e4d6b' }}
                onClick={() => toast.info('View Document (Demo)')}
              >
                View
              </button>
              <button
                className="text-sm font-medium hover:underline"
                style={{ color: '#1e4d6b' }}
                onClick={() => openUpload(doc)}
              >
                Replace
              </button>
            </div>
          )}
        </div>
      );
    }

    // Pending state
    return (
      <div key={doc.id} className="flex items-start gap-3 py-3 px-4 rounded-lg bg-white border border-gray-200">
        <Circle size={20} className="mt-0.5 flex-shrink-0 text-gray-300" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{doc.name}</span>
            {doc.required && <Star size={12} className="text-red-500 fill-red-500" />}
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={
                doc.required
                  ? { backgroundColor: '#fef2f2', color: '#dc2626' }
                  : { backgroundColor: '#eef4f8', color: '#1e4d6b' }
              }
            >
              {doc.required ? 'Required' : 'Recommended'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{doc.helpText}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Provided by: {doc.whoProvides} &middot; Renewal: {doc.renewalFrequency}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: '#1e4d6b' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
              onClick={() => guardAction('upload', 'Document Checklist', () => openUpload(doc))}
            >
              <Upload size={14} />
              Upload Document
            </button>
            {CONDITIONAL_IDS.has(doc.id) && (
              <button
                className="text-sm text-gray-500 hover:text-gray-700 underline"
                onClick={() => guardAction('edit', 'Document Checklist', () => openNaModal(doc))}
              >
                Not Applicable
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1e4d6b' }}>
          Get Your Kitchen Compliance-Ready
        </h1>
        <p className="text-gray-600 mt-1">
          Upload your compliance documents to build a complete digital file. Required items are
          marked with a red star.
        </p>
      </div>

      {/* Celebration banner */}
      {allRequiredDone && (
        <div
          className="rounded-lg p-4 flex items-start gap-3"
          style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac' }}
        >
          <span className="text-2xl" role="img" aria-label="party">
            🎉
          </span>
          <div>
            <p className="font-semibold text-green-800">All required documents uploaded!</p>
            <p className="text-sm text-green-700 mt-0.5">
              Your compliance documentation is complete. Keep your documents up-to-date as they
              expire.
            </p>
            {/* Touchpoint 3: Referral nudge after document completion */}
            <p style={{ fontSize: '12px', color: '#15803d', marginTop: '8px' }}>
              Filed! Your vendor's other clients might need this too.{' '}
              <button
                onClick={() => guardAction('share', 'Document Checklist', () => {
                  navigator.clipboard.writeText('https://getevidly.com/ref/PACIFIC-COAST-DK');
                  toast.success('Referral link copied!');
                })}
                style={{ color: '#A08C5A', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
              >
                Share →
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: '#1e4d6b' }}>
            {requiredComplete} of {requiredDocs.length} required documents uploaded
          </span>
          <span className="text-sm font-bold" style={{ color: allRequiredDone ? '#16a34a' : '#1e4d6b' }}>
            {progressPct}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-white overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: allRequiredDone
                ? '#16a34a'
                : `linear-gradient(90deg, #d4af37, #16a34a)`,
            }}
          />
        </div>
        {allRequiredDone && (
          <p className="text-sm mt-2 font-medium" style={{ color: '#16a34a' }}>
            All required documents uploaded!
          </p>
        )}
      </div>

      {/* Pillar sections */}
      {pillarOrder.map((pillar) => {
        const meta = PILLAR_META[pillar];
        if (!meta) return null;
        const docs = pillarGroups[pillar] || [];
        if (docs.length === 0) return null;
        const { done, total } = pillarCounts(pillar);
        const expanded = expandedPillars[pillar] ?? true;

        return (
          <div
            key={pillar}
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid #b8d4e8' }}
          >
            {/* Section header */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
              style={{ backgroundColor: '#eef4f8' }}
              onClick={() => togglePillar(pillar)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta.icon}</span>
                <span className="font-semibold" style={{ color: '#1e4d6b' }}>
                  {meta.label}
                </span>
                <span className="text-sm text-gray-500">
                  {done} of {total}
                </span>
              </div>
              {expanded ? (
                <ChevronDown size={18} style={{ color: '#1e4d6b' }} />
              ) : (
                <ChevronRight size={18} style={{ color: '#1e4d6b' }} />
              )}
            </button>

            {/* Items */}
            {expanded && (
              <div className="divide-y divide-gray-100 bg-white">
                {docs.map((doc) => (
                  <div key={doc.id} className="px-2 py-1">
                    {renderDocItem(doc)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* AI-powered Upload Modal */}
      <SmartUploadModal
        isOpen={!!uploadTarget}
        onClose={() => setUploadTarget(null)}
        onSave={handleSmartUploadSave}
        presetDocType={uploadTarget?.docId}
        presetDocLabel={uploadTarget?.docName}
        batchMode={false}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Not Applicable Modal */}
      {/* ----------------------------------------------------------------- */}
      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      {naModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: '#1e4d6b' }}>
                Not Applicable: {naModal.docName}
              </h2>
              <button
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => setNaModal(null)}
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600">Why is this document not applicable?</p>

            <div className="space-y-2">
              {["We don't need this", "Health department doesn't require", 'Other'].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="na-reason"
                    checked={naModal.reason === opt}
                    onChange={() => setNaModal({ ...naModal, reason: opt })}
                    className="accent-[#1e4d6b]"
                  />
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              ))}
            </div>

            {naModal.reason === 'Other' && (
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                placeholder="Please explain..."
                value={naModal.customReason}
                onChange={(e) => setNaModal({ ...naModal, customReason: e.target.value })}
              />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setNaModal(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#1e4d6b' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
                onClick={handleNaSave}
              >
                Confirm Not Applicable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
