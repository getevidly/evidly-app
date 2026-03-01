// ── Vendor Document Notification Demo Data ───────────────────────
// Pre-populated vendor documents at various lifecycle states for demo mode.
// Vendor IDs match demoData.ts vendors array: '1'=Cleaning Pros Plus, '2'=Pacific Pest, '3'=Valley Fire.

import type {
  VendorDocRecord,
  VendorDocNotification,
  VendorDocReview,
} from '../types/vendorDocuments';

// ── Date helpers ────────────────────────────────────────────────
const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const daysFromNow = (d: number) => {
  const dt = new Date(now.getTime() + d * 86400000);
  return dt.toISOString().slice(0, 10); // date only for expiration_date
};
const daysAgoDate = (d: number) => {
  const dt = new Date(now.getTime() - d * 86400000);
  return dt.toISOString().slice(0, 10);
};

// ── Vendor Documents ────────────────────────────────────────────

const vendorDoc1_coi: VendorDocRecord = {
  id: 'vd-1',
  organization_id: 'demo-org',
  vendor_id: '1',
  location_id: '1',
  document_type: 'COI',
  title: 'Certificate of Insurance — Cleaning Pros Plus',
  file_url: null,
  file_size: 245000,
  file_type: 'application/pdf',
  status: 'pending_review',
  version: 1,
  parent_id: null,
  expiration_date: daysFromNow(365),
  upload_method: 'secure_link',
  uploaded_by_vendor: true,
  vendor_notes: 'Updated general liability policy for 2026-2027 coverage period.',
  ai_classified: true,
  ai_confidence: 0.94,
  ai_document_label: 'Certificate of Insurance',
  reviewed_by: null,
  reviewed_at: null,
  review_notes: null,
  created_at: hoursAgo(2),
  updated_at: hoursAgo(2),
};

const vendorDoc2_hoodCert_v1: VendorDocRecord = {
  id: 'vd-2-v1',
  organization_id: 'demo-org',
  vendor_id: '1',
  location_id: '1',
  document_type: 'Hood Cleaning Report',
  title: 'Hood Cleaning Certificate — Cleaning Pros Plus (v1)',
  file_url: null,
  file_size: 189000,
  file_type: 'application/pdf',
  status: 'superseded',
  version: 1,
  parent_id: null,
  expiration_date: daysAgoDate(30),
  upload_method: 'vendor_portal',
  uploaded_by_vendor: true,
  vendor_notes: null,
  ai_classified: false,
  ai_confidence: null,
  ai_document_label: null,
  reviewed_by: 'reviewer-sofia',
  reviewed_at: daysAgo(210),
  review_notes: 'Verified coverage and cleaning scope.',
  created_at: daysAgo(210),
  updated_at: daysAgo(5),
};

const vendorDoc2_hoodCert_v2: VendorDocRecord = {
  id: 'vd-2-v2',
  organization_id: 'demo-org',
  vendor_id: '1',
  location_id: '1',
  document_type: 'Hood Cleaning Report',
  title: 'Hood Cleaning Certificate — Cleaning Pros Plus (v2)',
  file_url: null,
  file_size: 215000,
  file_type: 'application/pdf',
  status: 'accepted',
  version: 2,
  parent_id: 'vd-2-v1',
  expiration_date: daysFromNow(150),
  upload_method: 'secure_link',
  uploaded_by_vendor: true,
  vendor_notes: 'Updated report with new exhaust fan cleaning details.',
  ai_classified: true,
  ai_confidence: 0.88,
  ai_document_label: 'Hood Cleaning Certificate',
  reviewed_by: 'reviewer-sofia',
  reviewed_at: daysAgo(5),
  review_notes: 'All areas covered. Before/after photos included.',
  created_at: daysAgo(7),
  updated_at: daysAgo(5),
};

const vendorDoc3_license: VendorDocRecord = {
  id: 'vd-3',
  organization_id: 'demo-org',
  vendor_id: '2',
  location_id: null,
  document_type: 'Business License',
  title: 'Business License — Pacific Pest Solutions',
  file_url: null,
  file_size: 120000,
  file_type: 'application/pdf',
  status: 'accepted',
  version: 1,
  parent_id: null,
  expiration_date: daysFromNow(14),
  upload_method: 'vendor_portal',
  uploaded_by_vendor: true,
  vendor_notes: null,
  ai_classified: false,
  ai_confidence: null,
  ai_document_label: null,
  reviewed_by: 'reviewer-sofia',
  reviewed_at: daysAgo(340),
  review_notes: 'Verified active status.',
  created_at: daysAgo(350),
  updated_at: daysAgo(340),
};

const vendorDoc4_expiredCOI: VendorDocRecord = {
  id: 'vd-4',
  organization_id: 'demo-org',
  vendor_id: '3',
  location_id: '2',
  document_type: 'COI',
  title: 'Certificate of Insurance — Valley Fire Systems',
  file_url: null,
  file_size: 198000,
  file_type: 'application/pdf',
  status: 'expired',
  version: 1,
  parent_id: null,
  expiration_date: daysAgoDate(3),
  upload_method: 'manual',
  uploaded_by_vendor: false,
  vendor_notes: null,
  ai_classified: false,
  ai_confidence: null,
  ai_document_label: null,
  reviewed_by: 'reviewer-sofia',
  reviewed_at: daysAgo(365),
  review_notes: 'Accepted for 2025 coverage.',
  created_at: daysAgo(368),
  updated_at: daysAgo(3),
};

export const DEMO_VENDOR_DOCUMENTS: VendorDocRecord[] = [
  vendorDoc1_coi,
  vendorDoc2_hoodCert_v1,
  vendorDoc2_hoodCert_v2,
  vendorDoc3_license,
  vendorDoc4_expiredCOI,
];

// ── Notifications ───────────────────────────────────────────────

export const DEMO_VENDOR_DOC_NOTIFICATIONS: VendorDocNotification[] = [
  {
    id: 'n-vd-1',
    organization_id: 'demo-org',
    vendor_document_id: 'vd-1',
    vendor_id: '1',
    recipient_user_id: null,
    recipient_role: 'owner_operator',
    channel: 'in_app',
    notification_type: 'new_upload',
    title: 'Cleaning Pros Plus uploaded Certificate of Insurance',
    body: 'A new COI has been uploaded via secure link. Review required.',
    action_url: '/vendors/1',
    read_at: null,
    clicked_at: null,
    sent_at: hoursAgo(2),
    delivery_status: 'delivered',
    created_at: hoursAgo(2),
  },
  {
    id: 'n-vd-2',
    organization_id: 'demo-org',
    vendor_document_id: 'vd-2-v2',
    vendor_id: '1',
    recipient_user_id: null,
    recipient_role: 'compliance_manager',
    channel: 'in_app',
    notification_type: 'review_completed',
    title: 'Hood Cleaning Certificate v2 accepted',
    body: 'Reviewed and filed by Sofia Chen.',
    action_url: '/vendors/1',
    read_at: daysAgo(5),
    clicked_at: daysAgo(5),
    sent_at: daysAgo(5),
    delivery_status: 'delivered',
    created_at: daysAgo(5),
  },
  {
    id: 'n-vd-3',
    organization_id: 'demo-org',
    vendor_document_id: 'vd-3',
    vendor_id: '2',
    recipient_user_id: null,
    recipient_role: 'owner_operator',
    channel: 'in_app',
    notification_type: 'expiring_14',
    title: 'Business License expiring in 14 days — Pacific Pest Solutions',
    body: 'Business license expires soon. Request updated document from vendor.',
    action_url: '/vendors/2',
    read_at: null,
    clicked_at: null,
    sent_at: hoursAgo(6),
    delivery_status: 'delivered',
    created_at: hoursAgo(6),
  },
  {
    id: 'n-vd-4',
    organization_id: 'demo-org',
    vendor_document_id: 'vd-4',
    vendor_id: '3',
    recipient_user_id: null,
    recipient_role: 'owner_operator',
    channel: 'in_app',
    notification_type: 'expired',
    title: 'EXPIRED: COI — Valley Fire Systems',
    body: 'Certificate of Insurance expired 3 days ago. Compliance gap — insurance coverage at risk.',
    action_url: '/vendors/3',
    read_at: null,
    clicked_at: null,
    sent_at: daysAgo(3),
    delivery_status: 'delivered',
    created_at: daysAgo(3),
  },
  {
    id: 'n-vd-5',
    organization_id: 'demo-org',
    vendor_document_id: 'vd-1',
    vendor_id: '1',
    recipient_user_id: null,
    recipient_role: 'compliance_manager',
    channel: 'in_app',
    notification_type: 'review_required',
    title: 'Review Required: COI from Cleaning Pros Plus',
    body: 'A new Certificate of Insurance needs your review. Verify coverage amounts and dates.',
    action_url: '/vendors/1',
    read_at: null,
    clicked_at: null,
    sent_at: hoursAgo(2),
    delivery_status: 'delivered',
    created_at: hoursAgo(2),
  },
];

// ── Reviews ─────────────────────────────────────────────────────

export const DEMO_VENDOR_DOC_REVIEWS: VendorDocReview[] = [
  {
    id: 'vdr-1',
    vendor_document_id: 'vd-2-v2',
    organization_id: 'demo-org',
    reviewer_id: 'reviewer-sofia',
    reviewer_name: 'Sofia Chen',
    status: 'accepted',
    flag_reason: null,
    flag_category: null,
    resolution_status: 'resolved',
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: daysAgo(5),
  },
  {
    id: 'vdr-2',
    vendor_document_id: 'vd-4',
    organization_id: 'demo-org',
    reviewer_id: 'reviewer-sofia',
    reviewer_name: 'Sofia Chen',
    status: 'flagged',
    flag_reason: 'Policy expired. Coverage amount was $500K — below our $1M minimum requirement.',
    flag_category: 'expired_cert',
    resolution_status: 'open',
    resolution_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: daysAgo(2),
  },
];

// ── Query helpers ───────────────────────────────────────────────

export function getVendorDocumentsForVendor(vendorId: string): VendorDocRecord[] {
  return DEMO_VENDOR_DOCUMENTS.filter(d => d.vendor_id === vendorId);
}

export function getVersionHistory(documentId: string): VendorDocRecord[] {
  // Find the document and walk the version chain
  const doc = DEMO_VENDOR_DOCUMENTS.find(d => d.id === documentId);
  if (!doc) return [];

  // Collect all versions of the same document type from the same vendor
  const allVersions = DEMO_VENDOR_DOCUMENTS.filter(
    d => d.vendor_id === doc.vendor_id && d.document_type === doc.document_type,
  );
  return allVersions.sort((a, b) => b.version - a.version);
}

export function getPendingReviewDocs(vendorId?: string): VendorDocRecord[] {
  const docs = vendorId
    ? DEMO_VENDOR_DOCUMENTS.filter(d => d.vendor_id === vendorId)
    : DEMO_VENDOR_DOCUMENTS;
  return docs.filter(d => d.status === 'pending_review');
}

export function getReviewsForDocument(documentId: string): VendorDocReview[] {
  return DEMO_VENDOR_DOC_REVIEWS.filter(r => r.vendor_document_id === documentId);
}
