import { useState, useCallback } from 'react';
import Modal from '../../../ui/Modal';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

interface RequestDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
  vendorEmail: string;
  vendorName: string;
  requirementCode: string;
  requirementLabel: string;
  organizationId: string;
  organizationName: string;
  onComplete: () => void;
}

export function RequestDocumentModal({
  isOpen,
  onClose,
  vendorId,
  vendorEmail,
  vendorName,
  requirementCode,
  requirementLabel,
  organizationId,
  organizationName,
  onComplete,
}: RequestDocumentModalProps) {
  const [email, setEmail] = useState(vendorEmail);
  const [coverMessage, setCoverMessage] = useState(
    `Hi ${vendorName},\n\nWe're using EvidLY to track our compliance documents at ${organizationName}. Could you upload your current ${requirementLabel} using the secure link below? It takes about a minute.\n\nThanks!`
  );
  const [sending, setSending] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    setSending(true);

    try {
      const secureToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

      // Step 1: Create placeholder compliance_document with status='requested'
      const { data: doc, error: docErr } = await supabase
        .from('compliance_documents')
        .insert({
          organization_id: organizationId,
          category: 'service',
          type: requirementCode,
          name: `${requirementLabel} — Requested from ${vendorName}`,
          status: 'requested',
          vendor_id: vendorId,
        })
        .select('id')
        .single();

      if (docErr || !doc) {
        toast.error('Failed to create document request');
        setSending(false);
        return;
      }

      // Step 2: Create compliance_document_request row
      const { error: reqErr } = await supabase
        .from('compliance_document_requests')
        .insert({
          organization_id: organizationId,
          document_id: doc.id,
          vendor_id: vendorId,
          secure_token: secureToken,
          secure_token_expires_at: expiresAt,
          recipient_email: email.trim(),
          recipient_name: vendorName,
          note_to_recipient: coverMessage,
        });

      if (reqErr) {
        toast.error('Failed to create request');
        setSending(false);
        return;
      }

      // Step 3: Send email via edge function
      const uploadUrl = `${window.location.origin}/vendor/upload/${secureToken}`;
      await supabase.functions.invoke('send-document-request', {
        body: {
          vendorEmail: email.trim(),
          vendorName,
          documentType: requirementLabel,
          uploadUrl,
          coverMessage,
          orgName: organizationName,
        },
      });

      toast.success(`Request sent to ${vendorName}`);
      onComplete();
      onClose();
    } catch {
      toast.error('Failed to send request');
    } finally {
      setSending(false);
    }
  }, [email, coverMessage, vendorId, vendorName, requirementCode, requirementLabel, organizationId, organizationName, onComplete, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-[#1E2D4D] mb-1">
          Request {requirementLabel} from {vendorName}
        </h2>
        <p className="text-xs text-[#8A93A6] mb-4">
          EvidLY sends a secure link to the vendor. They can upload directly without creating an account. Link expires in 5 days.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8A93A6] font-medium">Vendor email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-0.5 px-3 py-1.5 text-sm border border-[#E2DDD4] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30 text-[#1E2D4D]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8A93A6] font-medium">Message to vendor</label>
            <textarea
              value={coverMessage}
              onChange={(e) => setCoverMessage(e.target.value)}
              rows={5}
              className="w-full mt-0.5 px-3 py-1.5 text-sm border border-[#E2DDD4] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1E2D4D]/30 text-[#1E2D4D] resize-none"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending || !email.trim()}
            className="w-full mt-2 px-4 py-2.5 bg-[#1E2D4D] text-[#FAF7F0] text-sm font-medium rounded-lg hover:bg-[#1E2D4D]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send size={14} />
            {sending ? 'Sending...' : 'Send secure request'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
