// ══════════════════════════════════════════════════════════════════════
// VENDOR DOCUMENT CONFIGURATION AUDIT — 2026-03-04
// ══════════════════════════════════════════════════════════════════════
//
// 1. DOCUMENT TYPES VENDORS CAN UPLOAD
//    - VendorSecureUpload (token-based): PDF, JPG, PNG, HEIC, DOC, DOCX (25MB max)
//    - SmartUploadModal (in-app AI classify): PDF, DOCX, XLSX, JPG, PNG, CSV (10MB max)
//    - AI classifier recognizes 20+ types across 4 pillars:
//      * Fire Safety: hood_cleaning_cert, fire_suppression_report, fire_extinguisher_tag,
//        ansul_cert, exhaust_fan_service, building_fire_inspection
//      * Food Safety: health_permit, food_handler_cert, food_manager_cert, haccp_plan,
//        allergen_training, pest_control_report
//      * Vendor: vendor_coi, vendor_licenses, service_agreements
//      * Facility: business_license, certificate_occupancy, grease_trap_records, backflow_test
//
// 2. CROSS-VENDOR VISIBILITY
//    FINDING: vendor_documents RLS was org-scoped ONLY (organization_id check).
//    Any user in the org could query ALL vendor documents. Vendors using a future
//    vendor-portal auth flow could see other vendors' documents.
//    FIX: Migration 20260304040000 adds linked_vendor_id to user_profiles and
//    replaces the SELECT policy with a vendor-scoping check: if user has
//    linked_vendor_id, they see only their own vendor docs.
//    Internal org users retain full org-scoped access (unchanged behavior).
//
// 3. SUPABASE RLS ENFORCEMENT
//    - `documents` table: org-scoped via user_location_access — CORRECT for internal docs.
//    - `vendor_documents` table: was org-only; NOW vendor-scoped for vendor users.
//    - `vendor_document_notifications`: was org-only; NOW vendor-scoped for vendor users.
//    - `vendor_document_reviews`: org-scoped — CORRECT (only internal reviewers access).
//    - Service role policy exists for edge function access.
//
// 4. WORKFLOW TRIGGERS
//    FINDING: vendor-secure-upload sent "new_upload" notification to hardcoded
//    team@getevidly.com only. Compliance Officer role was NOT notified.
//    FIX: Updated vendor-secure-upload to query user_profiles for compliance_manager
//    and owner_operator users in the org and notify each one individually.
//    Active triggers:
//      - vendor-document-notify: 10 notification types (new_upload, updated,
//        expiring_90/60/30/14, expired, review_required, review_completed, flagged)
//      - send-document-alerts: daily cron for expiration warnings (30/14/7/1/0 days)
//      - auto-request-documents: daily cron for auto-requesting expiring vendor docs
//
// 5. LOCATION SCOPING
//    vendor_documents.location_id (nullable) correctly scopes documents to
//    specific facilities. Org-wide documents (COI, Business License) use
//    location_id = NULL. Demo data confirms proper scoping. No RLS enforcement
//    at location level — correct, since org members should see all locations.
//
// ══════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, CheckCircle, XCircle, AlertTriangle, Download, Upload, Send } from 'lucide-react';
import { vendors } from '../data/demoData';
import { Breadcrumb } from '../components/Breadcrumb';
import { VendorContactActions } from '../components/VendorContactActions';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { DocumentReviewCard } from '../components/vendor/DocumentReviewCard';
import { getPendingReviewDocs, getVendorDocumentsForVendor } from '../data/vendorDocumentsDemoData';

interface VendorDocument {
  name: string;
  type: string;
  status: 'on-file' | 'missing' | 'expiring' | 'expired';
  expirationDate?: string;
  uploadDate?: string;
}

const DOCUMENT_REQUIREMENTS: Record<string, string[]> = {
  'Hood Cleaning': ['COI', 'Hood Cert', 'Before/After Photos', 'IKECA Cert', 'Business License', 'W-9', 'Service Agreement'],
  'Fire Suppression': ['COI', 'Inspection Report', 'Ansul Tags', 'Business License', 'W-9', 'Service Agreement'],
  'Pest Control': ['COI', 'Service Report', 'Pesticide Records', 'Business License', 'W-9', 'Service Agreement'],
  'Grease Trap': ['COI', 'Manifest', 'Business License', 'W-9', 'Service Agreement'],
  'HVAC Service': ['COI', 'Service Report', 'Business License', 'W-9', 'Service Agreement'],
};

const DEMO_DOCUMENTS: Record<string, VendorDocument[]> = {
  '1': [
    { name: 'Certificate of Insurance', type: 'COI', status: 'expiring', expirationDate: '2025-03-01', uploadDate: '2024-03-01' },
    { name: 'Hood Cleaning Certificate', type: 'Hood Cert', status: 'expired', expirationDate: '2025-01-28', uploadDate: '2024-07-28' },
    { name: 'Before/After Photos', type: 'Photos', status: 'on-file', uploadDate: '2024-12-15' },
    { name: 'IKECA Certification', type: 'IKECA Cert', status: 'on-file', expirationDate: '2026-01-01', uploadDate: '2024-01-15' },
    { name: 'Business License', type: 'License', status: 'on-file', expirationDate: '2025-12-31', uploadDate: '2024-01-10' },
    { name: 'W-9 Form', type: 'W-9', status: 'on-file', uploadDate: '2024-01-05' },
    { name: 'Service Agreement', type: 'Agreement', status: 'missing' },
  ],
  '2': [
    { name: 'Certificate of Insurance', type: 'COI', status: 'on-file', expirationDate: '2025-06-30', uploadDate: '2024-07-01' },
    { name: 'Service Report', type: 'Report', status: 'on-file', uploadDate: '2024-12-22' },
    { name: 'Pesticide Records', type: 'Records', status: 'on-file', uploadDate: '2024-12-22' },
    { name: 'Business License', type: 'License', status: 'on-file', expirationDate: '2025-12-31', uploadDate: '2024-01-08' },
    { name: 'W-9 Form', type: 'W-9', status: 'on-file', uploadDate: '2024-01-03' },
    { name: 'Service Agreement', type: 'Agreement', status: 'on-file', uploadDate: '2024-01-01' },
  ],
  '3': [
    { name: 'Certificate of Insurance', type: 'COI', status: 'expired', expirationDate: '2024-12-31', uploadDate: '2023-12-15' },
    { name: 'Inspection Report', type: 'Report', status: 'missing' },
    { name: 'Ansul Tags', type: 'Tags', status: 'missing' },
    { name: 'Business License', type: 'License', status: 'on-file', expirationDate: '2025-12-31', uploadDate: '2024-01-12' },
    { name: 'W-9 Form', type: 'W-9', status: 'on-file', uploadDate: '2024-01-06' },
    { name: 'Service Agreement', type: 'Agreement', status: 'on-file', uploadDate: '2024-01-01' },
  ],
  '4': [
    { name: 'Certificate of Insurance', type: 'COI', status: 'on-file', expirationDate: '2025-12-31', uploadDate: '2025-01-01' },
    { name: 'Service Report', type: 'Report', status: 'on-file', uploadDate: '2025-01-05' },
    { name: 'Business License', type: 'License', status: 'on-file', expirationDate: '2025-12-31', uploadDate: '2024-01-09' },
    { name: 'W-9 Form', type: 'W-9', status: 'on-file', uploadDate: '2024-01-04' },
    { name: 'Service Agreement', type: 'Agreement', status: 'on-file', uploadDate: '2024-01-01' },
  ],
  '5': [
    { name: 'Certificate of Insurance', type: 'COI', status: 'on-file', expirationDate: '2025-09-30', uploadDate: '2024-10-01' },
    { name: 'Manifest', type: 'Manifest', status: 'on-file', uploadDate: '2024-12-20' },
    { name: 'Business License', type: 'License', status: 'expiring', expirationDate: '2025-02-28', uploadDate: '2024-03-01' },
    { name: 'W-9 Form', type: 'W-9', status: 'missing' },
    { name: 'Service Agreement', type: 'Agreement', status: 'on-file', uploadDate: '2024-01-01' },
  ],
};

export default function VendorDetail() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature, isDemoMode } = useDemoGuard();

  const pendingDocs = getPendingReviewDocs(vendorId);
  const vendorDocs = getVendorDocumentsForVendor(vendorId || '');

  const handleAcceptDocument = (docId: string) => {
    guardAction('review', 'Vendor Documents', () => {
      toast.success('Document accepted and filed');
    });
  };

  const handleFlagDocument = (docId: string, reason: string, _category: string) => {
    guardAction('flag', 'Vendor Documents', () => {
      toast.success('Document flagged — vendor will be notified');
    });
  };

  if (!isDemoMode) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-[#1E2D4D] mb-2">Vendor Details</h2>
        <p className="text-[#1E2D4D]/50">Select a vendor to view their details and documents.</p>
      </div>
    );
  }

  const vendor = vendors.find(v => v.id === vendorId);
  const documents = DEMO_DOCUMENTS[vendorId || ''] || [];

  if (!vendor) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#1E2D4D]/50">Vendor not found</p>
        <button onClick={() => navigate('/vendors')} className="mt-4 text-blue-600 hover:text-blue-800">
          Back to Vendors
        </button>
      </div>
    );
  }

  const requiredDocs = DOCUMENT_REQUIREMENTS[vendor.serviceType] || [];
  const onFileDocs = documents.filter(d => d.status === 'on-file').length;
  const progressPercent = (onFileDocs / requiredDocs.length) * 100;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on-file':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><CheckCircle className="h-3 w-3 mr-1" />On File</span>;
      case 'missing':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700"><XCircle className="h-3 w-3 mr-1" />Missing</span>;
      case 'expiring':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700"><AlertTriangle className="h-3 w-3 mr-1" />Expiring</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700"><XCircle className="h-3 w-3 mr-1" />Expired</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] pb-20 md:pb-8">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vendors', href: '/vendors' }, { label: vendor.companyName }]} />
          <button
            onClick={() => navigate('/vendors')}
            className="flex items-center text-[#1E2D4D]/70 hover:text-[#1E2D4D] mb-4 min-h-[44px]"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to All Vendors
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1E2D4D]">{vendor.companyName}</h1>
              <p className="mt-1 text-sm text-[#1E2D4D]/50">{vendor.serviceType}</p>
            </div>
            <div className="mt-4 md:mt-0">
              {vendor.status === 'overdue' && (
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-red-50 text-red-700">Overdue</span>
              )}
              {vendor.status === 'current' && (
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">Current</span>
              )}
              {vendor.status === 'upcoming' && (
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-amber-50 text-amber-700">Due Soon</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="border-b border-[#1E2D4D]/10 mb-6 overflow-x-auto">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'documents', 'history', 'contact'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm min-h-[44px] ${
                  activeTab === tab
                    ? 'border-[#1E2D4D] text-[#1E2D4D]'
                    : 'border-transparent text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80 hover:border-[#1E2D4D]/15'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight mb-4">Contact Information</h2>
              <div className="space-y-3">
                <div className="flex items-center text-[#1E2D4D]/80">
                  <Phone className="h-5 w-5 mr-3 text-[#1E2D4D]/30" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center text-[#1E2D4D]/80">
                  <Mail className="h-5 w-5 mr-3 text-[#1E2D4D]/30" />
                  <span>{vendor.email}</span>
                </div>
                <div className="flex items-center text-[#1E2D4D]/80">
                  <MapPin className="h-5 w-5 mr-3 text-[#1E2D4D]/30" />
                  <span>{vendor.contactName}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight mb-4">Service Schedule</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[#1E2D4D]/70">Last Service:</span>
                  <span className="font-medium">{vendor.lastService}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#1E2D4D]/70">Next Due:</span>
                  <span className="font-medium">{vendor.nextDue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#1E2D4D]/70">Documents:</span>
                  <span className="font-medium">{onFileDocs} of {requiredDocs.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Required Documents</h2>
                  <p className="text-sm text-[#1E2D4D]/70 mt-1">{onFileDocs} of {requiredDocs.length} required documents on file</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  <button
                    onClick={() => setShowRequestModal(true)}
                    className="flex items-center px-4 py-2 bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] min-h-[44px]"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Request Document
                  </button>
                  <button
                    onClick={() => guardAction('upload', 'Vendor Documents', () => toast.info('Upload'))}
                    className="flex items-center px-4 py-2 bg-[#1E2D4D]/10 text-[#1E2D4D]/80 rounded-lg hover:bg-[#1E2D4D]/15 min-h-[44px]"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </button>
                </div>
              </div>

              <div className="w-full bg-[#1E2D4D]/8 rounded-full h-2 mb-6">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Pending Review Section */}
              {pendingDocs.length > 0 && (
                <div className="mb-6">
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg"
                    style={{ backgroundColor: '#FEF3C7', borderBottom: '1px solid #FDE68A' }}
                  >
                    <AlertTriangle size={16} style={{ color: '#D97706' }} />
                    <span className="text-sm font-semibold" style={{ color: '#92400E' }}>
                      Documents Pending Review ({pendingDocs.length})
                    </span>
                  </div>
                  <div className="space-y-3 p-4 rounded-b-lg" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderTop: 'none' }}>
                    {pendingDocs.map(doc => (
                      <DocumentReviewCard
                        key={doc.id}
                        document={doc}
                        vendorName={vendor.companyName}
                        onAccept={handleAcceptDocument}
                        onFlag={handleFlagDocument}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Vendor Document Records */}
              {vendorDocs.filter(d => d.status !== 'pending_review').length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#1E2D4D]/70 mb-3">Recent Vendor Submissions</h3>
                  <div className="space-y-3">
                    {vendorDocs
                      .filter(d => d.status !== 'pending_review')
                      .map(doc => (
                        <DocumentReviewCard
                          key={doc.id}
                          document={doc}
                          vendorName={vendor.companyName}
                          onAccept={handleAcceptDocument}
                          onFlag={handleFlagDocument}
                        />
                      ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-[#1E2D4D]/10 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3 flex-1">
                      <FileText className="h-5 w-5 text-[#1E2D4D]/30 mt-1" />
                      <div>
                        <p className="font-medium text-[#1E2D4D]">{doc.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {getStatusBadge(doc.status)}
                          {doc.expirationDate && (
                            <span className="text-xs text-[#1E2D4D]/50">Exp: {doc.expirationDate}</span>
                          )}
                          {doc.uploadDate && (
                            <span className="text-xs text-[#1E2D4D]/50">Uploaded: {doc.uploadDate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {doc.status === 'on-file' && (
                      <button
                        onClick={() => guardAction('download', 'Vendor Documents', () => toast.info('Downloading ' + doc.name))}
                        className="flex items-center mt-2 md:mt-0 min-h-[44px] px-2 hover:opacity-70"
                        style={{ color: '#1E2D4D' }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Service History</h2>
            <div className="space-y-6">
              <div className="border-l-2 border-[#1E2D4D]/15 pl-4 pb-4">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-[#1E2D4D]/30 mr-2" />
                  <span className="font-medium">{vendor.lastService}</span>
                </div>
                <p className="text-[#1E2D4D]/70">Regular service completed by {vendor.contactName}</p>
                <p className="text-sm text-[#1E2D4D]/50 mt-1">All systems checked and operational</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Contact {vendor.contactName}</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80">Company Name</label>
                <p className="mt-1 text-[#1E2D4D]">{vendor.companyName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80">Contact Person</label>
                <p className="mt-1 text-[#1E2D4D]">{vendor.contactName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80">Email</label>
                <p className="mt-1 text-[#1E2D4D]">{vendor.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2D4D]/80">Phone</label>
                <p className="mt-1 text-[#1E2D4D]">{vendor.phone}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-[#1E2D4D]/10">
              <p className="text-sm font-medium text-[#1E2D4D]/80 mb-3">Quick Actions</p>
              <VendorContactActions
                vendorName={vendor.companyName}
                contactName={vendor.contactName}
                email={vendor.email}
                phone={vendor.phone}
              />
            </div>
          </div>
        )}
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] sm:w-full max-w-md modal-content-enter">
            <h3 className="text-lg font-semibold tracking-tight mb-4">Request Document</h3>
            <p className="text-[#1E2D4D]/70 mb-4">
              An email will be sent to {vendor.email} requesting the missing documents with a secure upload link.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 text-[#1E2D4D]/80 hover:bg-[#1E2D4D]/5 rounded-lg min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => guardAction('send', 'Vendor Documents', () => {
                  setShowRequestModal(false);
                  toast.success('Document request sent');
                })}
                className="px-4 py-2 bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] min-h-[44px]"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgrade && (
        <DemoUpgradePrompt
          action={upgradeAction}
          featureName={upgradeFeature}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
