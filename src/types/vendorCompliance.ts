/**
 * vendorCompliance.ts — VENDOR-COMPLIANCE-01
 *
 * TypeScript interfaces for vendor document submissions,
 * expiry tracking, and AI validation results.
 */

// ── AI Validation Result ─────────────────────────────────────

export interface AIValidationResult {
  document_type_match: boolean;
  detected_type: string;
  expiry_detected: boolean;
  expiry_date: string | null;
  is_complete: boolean;
  is_legible: boolean;
  confidence: number;
  issues: string[];
  summary: string;
  error?: string;
  details?: string;
}

// ── Vendor Document Submission ───────────────────────────────

export type AIValidationStatus = 'pending' | 'passed' | 'failed' | 'error';
export type ReviewStatus = 'pending' | 'approved' | 'declined';

export interface VendorDocumentSubmission {
  id: string;
  organization_id: string;
  vendor_document_id: string;
  vendor_id: string;

  // AI Validation
  ai_validated: boolean;
  ai_validation_status: AIValidationStatus;
  ai_validation_result: AIValidationResult | null;
  ai_validated_at: string | null;

  // Client Review
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  decline_reason: string | null;

  // Workflow
  notification_sent_at: string | null;
  auto_approved: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined fields (from queries)
  vendor_documents?: {
    id: string;
    document_type: string;
    title: string;
    file_url: string | null;
    file_type: string | null;
    file_size: number | null;
    status: string;
    expiration_date: string | null;
    version: number;
    uploaded_by_vendor: boolean;
    vendor_notes: string | null;
  };
  vendors?: {
    id: string;
    name: string;
    contact_name: string | null;
    contact_email: string | null;
  };
}

// ── Vendor Document Expiry Tracking ──────────────────────────

export interface VendorDocumentExpiryTracking {
  id: string;
  organization_id: string;
  vendor_id: string;
  vendor_document_id: string;
  document_type: string;
  expiration_date: string;

  // 7-stage reminders
  reminder_60d_sent_at: string | null;
  reminder_30d_sent_at: string | null;
  reminder_14d_sent_at: string | null;
  reminder_7d_sent_at: string | null;
  reminder_0d_sent_at: string | null;
  reminder_neg1d_sent_at: string | null;
  reminder_neg7d_sent_at: string | null;

  // Resolution
  resolved: boolean;
  resolved_at: string | null;
  replacement_document_id: string | null;

  created_at: string;
}
