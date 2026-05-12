import { useState, useCallback } from 'react';
import Modal from '../../../ui/Modal';
import { FileUpload } from '../../../FileUpload';
import { classifyDocument, getConfidenceLevel, getConfidenceColor } from '../../../../lib/documentClassifier';
import { uploadFile, BUCKETS, getSignedUrl } from '../../../../lib/storage';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'sonner';
import { REQUIREMENT_TO_DOC_CATEGORY } from '../workConstants';
import { evaluateOnboardingComplete } from '../../../../lib/onboarding/completionDetection';
import type { PillarRequirement } from '../../../../hooks/onboarding/usePillarRequirements';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: PillarRequirement;
  organizationId: string;
  onComplete: () => void;
}

interface ExtractionResult {
  documentType: string;
  holderName: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  confidence: number;
}

type Stage = 'pick' | 'classifying' | 'review' | 'uploading';

export function UploadDocumentModal({ isOpen, onClose, requirement, organizationId, onComplete }: UploadDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('pick');
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [edits, setEdits] = useState<Partial<ExtractionResult>>({});

  const resetState = useCallback(() => {
    setFile(null);
    setStage('pick');
    setExtraction(null);
    setEdits({});
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];
    setFile(selectedFile);
    setStage('classifying');

    try {
      const result = await classifyDocument(selectedFile, (name: string, opts: { body: unknown }) =>
        supabase.functions.invoke(name, opts)
      );

      if (result) {
        setExtraction({
          documentType: result.documentLabel || requirement.label,
          holderName: (result.suggestedFields as Record<string, string>)?.holder_name || '',
          issuer: (result.suggestedFields as Record<string, string>)?.issuer || '',
          issueDate: result.serviceDate || '',
          expiryDate: result.expiryDate || '',
          confidence: result.confidence,
        });
        setStage('review');
      } else {
        setExtraction({
          documentType: requirement.label,
          holderName: '',
          issuer: '',
          issueDate: '',
          expiryDate: '',
          confidence: 0,
        });
        setStage('review');
      }
    } catch {
      toast.error('Could not analyze document. You can still fill in the details manually.');
      setExtraction({
        documentType: requirement.label,
        holderName: '',
        issuer: '',
        issueDate: '',
        expiryDate: '',
        confidence: 0,
      });
      setStage('review');
    }
  }, [requirement.label]);

  const merged = extraction ? { ...extraction, ...edits } : null;

  const handleSubmit = useCallback(async () => {
    if (!file || !merged) return;
    setStage('uploading');

    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${organizationId}/${requirement.requirement_code}/${timestamp}_${safeName}`;

      const uploadResult = await uploadFile(BUCKETS.DOCUMENTS, path, file, {
        contentType: file.type,
      });

      if (!uploadResult) {
        toast.error('File upload failed');
        setStage('review');
        return;
      }

      const category = REQUIREMENT_TO_DOC_CATEGORY[requirement.requirement_code] || 'kitchen';

      const { error: docError } = await supabase.from('compliance_documents').insert({
        organization_id: organizationId,
        category,
        type: requirement.requirement_code,
        name: file.name,
        status: 'current',
        storage_path: path,
        file_size_bytes: file.size,
        mime_type: file.type,
        issued_date: merged.issueDate || null,
        expiry_date: merged.expiryDate || null,
        import_source: 'manual_upload',
      });

      if (docError) {
        toast.error('Failed to save document record');
        setStage('review');
        return;
      }

      toast.success(`${requirement.label} uploaded`);
      evaluateOnboardingComplete(organizationId);
      resetState();
      onComplete();
      onClose();
    } catch {
      toast.error('Upload failed');
      setStage('review');
    }
  }, [file, merged, organizationId, requirement, onComplete, onClose, resetState]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-[#1E2D4D] mb-1">Upload {requirement.label}</h2>
        <p className="text-xs text-[#8A93A6] mb-4">
          {requirement.citation && <span className="font-mono">{requirement.citation}</span>}
          {requirement.citation && ' · '}
          PDF, JPG, or PNG. 10MB max.
        </p>

        {stage === 'pick' && (
          <FileUpload
            onFilesSelected={handleFilesSelected}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSizeMB={10}
            multiple={false}
          />
        )}

        {stage === 'classifying' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin mb-3" />
            <p className="text-sm text-[#8A93A6]">EvidLY is reading your document...</p>
          </div>
        )}

        {stage === 'review' && merged && (
          <div className="space-y-3">
            <div className="bg-[#F7F5EE] rounded-lg p-4 mb-4">
              <p className="text-xs font-medium text-[#1E2D4D] mb-2">
                {file?.name}
                {merged.confidence > 0 && (
                  <span className="ml-2 text-[10px]" style={{ color: getConfidenceColor(merged.confidence) }}>
                    {getConfidenceLevel(merged.confidence)} confidence
                  </span>
                )}
              </p>
            </div>

            <FieldRow label="Document type" value={merged.documentType} onChange={(v) => setEdits(e => ({ ...e, documentType: v }))} />
            <FieldRow label="Holder / subject" value={merged.holderName} onChange={(v) => setEdits(e => ({ ...e, holderName: v }))} />
            <FieldRow label="Issuer" value={merged.issuer} onChange={(v) => setEdits(e => ({ ...e, issuer: v }))} />
            <FieldRow label="Issue date" value={merged.issueDate} onChange={(v) => setEdits(e => ({ ...e, issueDate: v }))} type="date" />
            <FieldRow label="Expiration date" value={merged.expiryDate} onChange={(v) => setEdits(e => ({ ...e, expiryDate: v }))} type="date" />

            <button
              type="button"
              onClick={handleSubmit}
              className="w-full mt-4 px-4 py-2.5 bg-[#1E2D4D] text-[#FAF7F0] text-sm font-medium rounded-lg hover:bg-[#1E2D4D]/90 transition-colors"
            >
              Looks right
            </button>
          </div>
        )}

        {stage === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin mb-3" />
            <p className="text-sm text-[#8A93A6]">Uploading...</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FieldRow({ label, value, onChange, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-[#8A93A6] font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-0.5 px-3 py-1.5 text-sm border border-[#E2DDD4] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30 text-[#1E2D4D]"
      />
    </div>
  );
}
