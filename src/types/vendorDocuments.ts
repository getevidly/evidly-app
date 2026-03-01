// ── Vendor Document Notification Types ───────────────────────────
// Shared types for the vendor document update notification system.
// Named VendorDocRecord to avoid shadowing VendorDetail's local VendorDocument.

export type VendorDocStatus = 'pending_review' | 'accepted' | 'flagged' | 'expired' | 'superseded';
export type VendorDocUploadMethod = 'manual' | 'secure_link' | 'vendor_portal' | 'auto_request';
export type NotificationChannel = 'email' | 'sms' | 'in_app';
export type VendorDocNotificationType =
  | 'new_upload' | 'updated'
  | 'expiring_90' | 'expiring_60' | 'expiring_30' | 'expiring_14'
  | 'expired' | 'review_required' | 'review_completed' | 'flagged';
export type ReviewStatus = 'accepted' | 'flagged';
export type FlagCategory = 'wrong_document' | 'illegible' | 'expired_cert' | 'incomplete' | 'other';
export type ResolutionStatus = 'open' | 'resolved' | 'escalated';

export interface VendorDocRecord {
  id: string;
  organization_id: string;
  vendor_id: string;
  location_id: string | null;
  document_type: string;
  title: string;
  file_url: string | null;
  file_size: number | null;
  file_type: string | null;
  status: VendorDocStatus;
  version: number;
  parent_id: string | null;
  expiration_date: string | null;
  upload_method: VendorDocUploadMethod;
  uploaded_by_vendor: boolean;
  vendor_notes: string | null;
  ai_classified: boolean;
  ai_confidence: number | null;
  ai_document_label: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorDocNotification {
  id: string;
  organization_id: string;
  vendor_document_id: string | null;
  vendor_id: string;
  recipient_user_id: string | null;
  recipient_role: string | null;
  channel: NotificationChannel;
  notification_type: VendorDocNotificationType;
  title: string;
  body: string | null;
  action_url: string | null;
  read_at: string | null;
  clicked_at: string | null;
  sent_at: string | null;
  delivery_status: string;
  created_at: string;
}

export interface VendorDocReview {
  id: string;
  vendor_document_id: string;
  organization_id: string;
  reviewer_id: string | null;
  reviewer_name: string | null;
  status: ReviewStatus;
  flag_reason: string | null;
  flag_category: FlagCategory | null;
  resolution_status: ResolutionStatus;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}
