import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Bot } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { AddDeficiencyModal } from '../components/deficiencies/AddDeficiencyModal';
import { InspectionUploadModeTabs } from '../components/deficiencies/InspectionUploadModeTabs';
import { InspectionUploadProcessing } from '../components/deficiencies/InspectionUploadProcessing';
import { ExtractedItemsReview } from '../components/deficiencies/ExtractedItemsReview';
import { ExtractionEmptyState } from '../components/deficiencies/ExtractionEmptyState';
import { useDeficiencyUpload } from '../hooks/deficiencies/useDeficiencyUpload';

export function DeficiencyUpload() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const [showAddModal, setShowAddModal] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const {
    state,
    upload,
    items,
    uploading,
    accepting,
    startUpload,
    toggleItem,
    toggleAll,
    selectHighConfidenceOnly,
    updateItem,
    discardItem,
    acceptItems,
    cancel,
    reset,
    acceptedCount,
    highCount,
    mediumCount,
    lowCount,
    storageUrl,
  } = useDeficiencyUpload();

  // Elapsed time ticker for processing state
  useEffect(() => {
    if (state !== 'processing') {
      setProcessingStartTime(0);
      return;
    }
    if (processingStartTime === 0) {
      setProcessingStartTime(Date.now());
    }
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - (processingStartTime || Date.now()));
    }, 500);
    return () => clearInterval(interval);
  }, [state, processingStartTime]);

  const handleFileSelected = useCallback((file: File, serviceRecordId?: string) => {
    if (!profile?.organization_id) return;
    guardAction('create', 'Deficiencies', () => {
      startUpload(file, profile.organization_id, undefined, serviceRecordId);
    });
  }, [profile, guardAction, startUpload]);

  const handleAccept = useCallback(async () => {
    guardAction('create', 'Deficiencies', async () => {
      await acceptItems();
      navigate('/deficiencies');
    });
  }, [guardAction, acceptItems, navigate]);

  const handleCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="space-y-5 pb-24 lg:pb-8" style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
      <Breadcrumb items={[
        { label: 'Compliance', path: '/compliance' },
        { label: 'Deficiencies', path: '/deficiencies' },
        { label: 'Upload report' },
      ]} />

      {/* Header */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/deficiencies')}
            className="p-1 rounded hover:bg-[#1E2D4D]/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#6B7F96' }} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" style={{ color: '#A08C5A' }} />
              <h1 className="text-xl font-bold" style={{ color: '#0B1628' }}>
                Extract deficiencies from report
              </h1>
            </div>
            <p className="text-sm mt-1" style={{ color: '#6B7F96' }}>
              Upload an inspection report and AI will identify code violations for your review.
            </p>
          </div>
        </div>
      </div>

      {/* State-based content */}
      <div className="max-w-3xl">
        {state === 'upload' && (
          <InspectionUploadModeTabs
            onFileSelected={handleFileSelected}
            disabled={uploading}
          />
        )}

        {state === 'processing' && upload && (
          <InspectionUploadProcessing
            fileName={upload.file_name}
            fileSize={upload.file_size}
            fileType={upload.file_type}
            elapsedMs={elapsedMs}
            onCancel={handleCancel}
          />
        )}

        {state === 'review' && upload && (
          <ExtractedItemsReview
            upload={upload}
            items={items}
            storageUrl={storageUrl}
            accepting={accepting}
            acceptedCount={acceptedCount}
            highCount={highCount}
            mediumCount={mediumCount}
            lowCount={lowCount}
            onToggleItem={toggleItem}
            onToggleAll={toggleAll}
            onSelectHighOnly={selectHighConfidenceOnly}
            onUpdateItem={updateItem}
            onDiscardItem={discardItem}
            onAccept={handleAccept}
            onCancel={handleCancel}
          />
        )}

        {state === 'empty' && upload && (
          <ExtractionEmptyState
            upload={upload}
            storageUrl={storageUrl}
            onAddManually={() => setShowAddModal(true)}
            onTryDifferent={handleReset}
          />
        )}

        {/* Upload in progress overlay */}
        {uploading && state === 'upload' && (
          <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: '#6B7F96' }}>
            <Upload className="w-4 h-4 animate-bounce" />
            Uploading file...
          </div>
        )}
      </div>

      {/* Add deficiency modal (for empty state fallback) */}
      {showAddModal && (
        <AddDeficiencyModal
          onClose={() => setShowAddModal(false)}
          onSubmit={() => {
            setShowAddModal(false);
            navigate('/deficiencies');
          }}
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
