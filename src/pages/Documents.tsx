import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, FileText, Download, Trash2, Share2, Search, AlertTriangle, CheckCircle, Clock, Upload, Pencil, Loader2, ShieldCheck, ShieldAlert, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { format, differenceInDays } from 'date-fns';
import { DemoModeBanner } from '../components/DemoModeBanner';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/shared/PageStates';
import { SmartUploadModal, type ClassifiedFile } from '../components/SmartUploadModal';
import { DOCUMENT_TYPE_OPTIONS, PILLAR_OPTIONS } from '../lib/documentClassifier';
import { Breadcrumb } from '../components/Breadcrumb';
import { ShareModal } from '../components/ShareModal';
import { useRole } from '../contexts/RoleContext';
import { PhotoEvidence, type PhotoRecord } from '../components/PhotoEvidence';
import { PhotoGallery } from '../components/PhotoGallery';
import { Camera } from 'lucide-react';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';
import { useTranslation } from '../contexts/LanguageContext';
import { AiAnalysisPanel, NeedsAttentionBadge } from '../components/documents/AiAnalysisPanel';
import {
  type DocumentAiAnalysis,
  DEMO_AI_ANALYSIS,
  documentNeedsAttention,
} from '../data/documentAiDemoData';
import { usePageTitle } from '../hooks/usePageTitle';
import { colors, shadows, radius, typography } from '../lib/designSystem';

type ScanStatus = 'scanning' | 'available' | 'quarantined';

interface Document {
  id: string;
  title: string;
  category: string;
  expiration_date: string | null;
  created_at: string;
  status: string;
  location: string;
  provided_by?: string;
  categorization_source?: 'ai' | 'manual';
  manual_category_override?: boolean;
  scan_status?: ScanStatus;
  ai_analysis?: DocumentAiAnalysis | null;
  needs_attention?: boolean;
  import_source?: 'direct' | 'google_drive' | 'onedrive' | 'dropbox';
  original_filename?: string;
  imported_at?: string;
}

interface SharedItem {
  id: string;
  document: string;
  recipient: string;
  recipientType: string;
  date: string;
  status: 'sent' | 'viewed' | 'downloaded';
}

// Helper to create dates relative to "now" (Feb 7, 2026)
const d = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();

const SAMPLE_DOCUMENTS: Document[] = [
  // === Licenses ===
  { id: '1', title: 'Food Service License', category: 'License', expiration_date: d(120), created_at: d(-300), status: 'active', location: 'Location 1' }, // demo
  { id: '2', title: 'Food Service License', category: 'License', expiration_date: d(85), created_at: d(-280), status: 'active', location: 'Location 2' }, // demo
  { id: '3', title: 'Business License', category: 'License', expiration_date: d(200), created_at: d(-160), status: 'active', location: 'Location 1' }, // demo
  { id: '4', title: 'Business License', category: 'License', expiration_date: d(22), created_at: d(-150), status: 'active', location: 'Location 2' }, // demo
  { id: '5', title: 'Business License', category: 'License', expiration_date: d(180), created_at: d(-140), status: 'active', location: 'Location 3' }, // demo

  // === Permits ===
  { id: '6', title: 'Health Department Permit', category: 'Permit', expiration_date: d(45), created_at: d(-280), status: 'active', location: 'Location 1' }, // demo
  { id: '7', title: 'Health Department Permit', category: 'Permit', expiration_date: d(15), created_at: d(-260), status: 'active', location: 'Location 2' }, // demo
  { id: '8', title: 'Health Department Inspection Report', category: 'Permit', expiration_date: d(330), created_at: d(-35), status: 'active', location: 'Location 1' }, // demo
  { id: '9', title: 'Health Department Inspection Report', category: 'Permit', expiration_date: d(310), created_at: d(-55), status: 'active', location: 'Location 3' }, // demo
  { id: '10', title: 'Fire Safety Inspection Report', category: 'Permit', expiration_date: d(280), created_at: d(-30), status: 'active', location: 'Location 1' }, // demo

  // === Certificates ===
  { id: '11', title: 'ServSafe Manager Certificate - Mike Johnson', category: 'Certificate', expiration_date: d(540), created_at: d(-200), status: 'active', location: 'Location 1' }, // demo
  { id: '12', title: 'ServSafe Manager Certificate - Sarah Chen', category: 'Certificate', expiration_date: d(380), created_at: d(-180), status: 'active', location: 'Location 2' }, // demo
  { id: '13', title: 'Ansul System Certification', category: 'Certificate', expiration_date: d(-15), created_at: d(-380), status: 'active', location: 'Location 2' }, // demo

  // === Insurance ===
  { id: '14', title: 'General Liability Insurance', category: 'Insurance', expiration_date: d(250), created_at: d(-100), status: 'active', location: 'All Locations' },
  { id: '15', title: 'Vendor COI - Fire Suppression', category: 'Insurance', expiration_date: d(190), created_at: d(-60), status: 'active', location: 'All Locations' },
  { id: '16', title: 'Vendor COI - GreenShield Pest Control', category: 'Insurance', expiration_date: d(8), created_at: d(-50), status: 'active', location: 'All Locations', provided_by: 'GreenShield Pest Control' },
  { id: '17', title: "Worker's Compensation Insurance", category: 'Insurance', expiration_date: d(300), created_at: d(-90), status: 'active', location: 'All Locations' },

  // === Training ===
  { id: '18', title: 'Food Handler Certificate - Emma Davis', category: 'Training', expiration_date: d(410), created_at: d(-150), status: 'active', location: 'Location 1' }, // demo
  { id: '19', title: 'Food Handler Certificate - Maria Rodriguez', category: 'Training', expiration_date: d(25), created_at: d(-340), status: 'active', location: 'Location 2' }, // demo
  { id: '20', title: 'Food Handler Certificate - Maria Garcia', category: 'Training', expiration_date: d(-10), created_at: d(-380), status: 'active', location: 'Location 3' }, // demo
  { id: '21', title: 'Food Handler Certificate - Tom Nguyen', category: 'Training', expiration_date: d(260), created_at: d(-100), status: 'active', location: 'Location 1' }, // demo
  { id: '22', title: 'Allergen Awareness Training - All Staff', category: 'Training', expiration_date: d(180), created_at: d(-60), status: 'active', location: 'All Locations' },

  // === Other (service reports) ===
  { id: '23', title: 'Hood Cleaning Report - Q4 2025', category: 'Other', expiration_date: null, created_at: d(-45), status: 'active', location: 'Location 1', provided_by: 'SparkClean Hoods' }, // demo
  { id: '24', title: 'Hood Cleaning Report - Q4 2025', category: 'Other', expiration_date: null, created_at: d(-40), status: 'active', location: 'Location 2', provided_by: 'SparkClean Hoods' }, // demo
  { id: '25', title: 'Fire Extinguisher Inspection Tags', category: 'Other', expiration_date: d(330), created_at: d(-35), status: 'active', location: 'Location 1', provided_by: 'Fire Suppression Vendor' }, // demo
  { id: '26', title: 'Grease Trap Service Record', category: 'Other', expiration_date: null, created_at: d(-20), status: 'active', location: 'Location 1', provided_by: 'Pacific Grease Services' }, // demo
  { id: '27', title: 'Pest Control Report - Jan 2026', category: 'Other', expiration_date: null, created_at: d(-7), status: 'active', location: 'Location 1', provided_by: 'GreenShield Pest Control' }, // demo
  { id: '28', title: 'Pest Control Report - Jan 2026', category: 'Other', expiration_date: null, created_at: d(-5), status: 'active', location: 'Location 2', provided_by: 'GreenShield Pest Control' }, // demo
  { id: '29', title: 'HVAC Maintenance Record', category: 'Other', expiration_date: null, created_at: d(-25), status: 'active', location: 'Location 2' }, // demo
  { id: '30', title: 'Fire Suppression System Inspection', category: 'Other', expiration_date: d(-45), created_at: d(-410), status: 'active', location: 'Location 2', provided_by: 'Fire Suppression Vendor' }, // demo
];

const SHARED_ITEMS: SharedItem[] = [
  { id: '1', document: 'Health Department Permit', recipient: 'inspector@healthdept.gov', recipientType: 'Health Inspector', date: '2026-02-05', status: 'viewed' },
  { id: '2', document: 'General Liability Insurance', recipient: 'claims@insurance.com', recipientType: 'Insurance Company', date: '2026-02-03', status: 'downloaded' },
  { id: '3', document: 'Fire Safety Inspection Report', recipient: 'firemarshal@city.gov', recipientType: 'Fire Marshal', date: '2026-02-01', status: 'sent' },
];

// Equipment/vendor documents — visible to Facilities + Management/Executive
const FACILITIES_DOC_CATEGORIES = new Set(['Other']); // Hood cleaning, HVAC, fire suppression, pest control, grease trap, etc.
const FACILITIES_DOC_TITLES = new Set([
  'Ansul System Certification',
  'Fire Safety Inspection Report',
]);

// Operational documents — visible to Kitchen Staff + Management/Executive
// License, Permit (health dept), Certificate (ServSafe), Training, general Insurance
// Anything NOT flagged as facilities-type

function mapPillarToCategory(pillar: string): string {
  switch (pillar) {
    case 'facility_safety': return 'Certificate';
    case 'food_safety': return 'Permit';
    case 'vendor': return 'Insurance';
    case 'facility': return 'License';
    default: return 'Other';
  }
}

function isFacilitiesDoc(doc: Document): boolean {
  if (FACILITIES_DOC_CATEGORIES.has(doc.category)) return true;
  if (FACILITIES_DOC_TITLES.has(doc.title)) return true;
  if (doc.category === 'Insurance' && doc.provided_by) return true; // Vendor COIs
  return false;
}

function isKitchenDoc(doc: Document): boolean {
  return !isFacilitiesDoc(doc);
}

function getDocStatus(doc: Document): 'current' | 'expiring' | 'expired' {
  if (!doc.expiration_date) return 'current';
  const daysUntil = differenceInDays(new Date(doc.expiration_date), new Date());
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 30) return 'expiring';
  return 'current';
}

function DocStatusBadge({ status, label }: { status: 'current' | 'expiring' | 'expired'; label?: string }) {
  const styles: Record<string, { bg: string; text: string; fallback: string }> = {
    current: { bg: '#dcfce7', text: '#166534', fallback: 'Current' },
    expiring: { bg: '#fef9c3', text: '#854d0e', fallback: 'Expiring' },
    expired: { bg: '#fee2e2', text: '#991b1b', fallback: 'Expired' },
  };
  const s = styles[status];
  return (
    <span style={{ backgroundColor: s.bg, color: s.text, padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>
      {label || s.fallback}
    </span>
  );
}

function ScanStatusBadge({ scanStatus }: { scanStatus?: ScanStatus }) {
  if (!scanStatus || scanStatus === 'available') {
    return (
      <span
        title="File verified"
        className="inline-flex items-center gap-1"
        style={{ color: '#16a34a', fontSize: '12px', fontWeight: 500 }}
      >
        <ShieldCheck size={14} />
        Verified
      </span>
    );
  }
  if (scanStatus === 'scanning') {
    return (
      <span
        title="File being scanned"
        className="inline-flex items-center gap-1"
        style={{ color: '#d97706', fontSize: '12px', fontWeight: 500 }}
      >
        <Loader2 size={14} className="animate-spin" />
        Scanning
      </span>
    );
  }
  // quarantined
  return (
    <span
      title="File quarantined — content type mismatch detected"
      className="inline-flex items-center gap-1"
      style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600 }}
    >
      <ShieldAlert size={14} />
      Quarantined
    </span>
  );
}

export function Documents() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  usePageTitle('Documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [showSmartUpload, setShowSmartUpload] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'documents' | 'shared'>('documents');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All Locations');
  const [searchQuery, setSearchQuery] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState<'all' | 'expired' | 'expiring'>('all');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [docPhotos, setDocPhotos] = useState<PhotoRecord[]>([]);
  const { userRole, getAccessibleLocations, showAllLocationsOption } = useRole();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const docAccessibleLocs = getAccessibleLocations();
  const DOC_LOCATIONS = showAllLocationsOption()
    ? ['All Locations', ...docAccessibleLocs.map(l => l.locationName)]
    : docAccessibleLocs.map(l => l.locationName);

  // Role-based document visibility: kitchen sees operational docs, facilities sees equipment/vendor docs
  const roleFilteredDocuments = useMemo(() => {
    if (userRole === 'kitchen_staff') return documents.filter(isKitchenDoc);
    if (userRole === 'facilities_manager') return documents.filter(isFacilitiesDoc);
    return documents; // executive & management see all
  }, [documents, userRole]);

  const filteredDocuments = useMemo(() => {
    let filtered = roleFilteredDocuments;
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(d => d.category === selectedCategory);
    }
    if (selectedLocation !== 'All Locations') {
      filtered = filtered.filter(d => d.location === selectedLocation || d.location === 'All Locations');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        (d.provided_by && d.provided_by.toLowerCase().includes(q))
      );
    }
    if (docStatusFilter !== 'all') {
      filtered = filtered.filter(d => getDocStatus(d) === docStatusFilter);
    }
    return filtered;
  }, [roleFilteredDocuments, selectedCategory, selectedLocation, searchQuery, docStatusFilter]);

  // Documents filtered by location only (for category counts and summary)
  const locationFilteredDocs = useMemo(() => {
    if (selectedLocation === 'All Locations') return roleFilteredDocuments;
    return roleFilteredDocuments.filter(d => d.location === selectedLocation || d.location === 'All Locations');
  }, [roleFilteredDocuments, selectedLocation]);

  // Summary counts (reflect location filter)
  const statusCounts = useMemo(() => {
    let current = 0, expiring = 0, expired = 0;
    locationFilteredDocs.forEach(doc => {
      const s = getDocStatus(doc);
      if (s === 'current') current++;
      else if (s === 'expiring') expiring++;
      else expired++;
    });
    return { current, expiring, expired };
  }, [locationFilteredDocs]);

  const handleDownload = (doc: Document) => {
    guardAction('download', 'compliance documents', () => {
      const blob = new Blob(
        [`EvidLY Compliance Document\n\nDocument: ${doc.title}\nCategory: ${doc.category}\nLocation: ${doc.location}\nStatus: ${doc.status}\nExpiration: ${doc.expiration_date || 'N/A'}\n${doc.provided_by ? `Provided by: ${doc.provided_by}\n` : ''}\nThis is a demo placeholder. In production, the actual file from Supabase Storage would download.`],
        { type: 'text/plain' }
      );
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${doc.title.replace(/\s+/g, '_')}.txt`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  useEffect(() => {
    if (isDemoMode) {
      setTimeout(() => {
        // Attach pre-built AI analysis to demo documents
        const docsWithAi = SAMPLE_DOCUMENTS.map(doc => {
          const analysis = DEMO_AI_ANALYSIS[doc.id] || null;
          return {
            ...doc,
            ai_analysis: analysis,
            needs_attention: documentNeedsAttention(analysis),
          };
        });
        setDocuments(docsWithAi);
        setSharedItems(SHARED_ITEMS);
        setLoading(false);
      }, 500);
    } else if (profile?.organization_id) {
      fetchDocuments();
    } else {
      // Live mode but no org — show empty state
      setDocuments([]);
      setSharedItems([]);
      setLoading(false);
    }
  }, [profile, isDemoMode]);

  const fetchDocuments = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', profile?.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setDocuments(data);
    } catch (err: any) {
      setPageError(err?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleShareDocument = (docTitle: string) => {
    guardAction('export', 'compliance documents', () => {
      setSelectedDocForShare(docTitle);
      setShowShareModal(true);
    });
  };

  const handleShareMultiple = () => {
    guardAction('export', 'compliance documents', () => {
      setSelectedDocForShare(null);
      setShowShareModal(true);
    });
  };

  const handleToggleDoc = (docId: string) => {
    if (selectedDocs.includes(docId)) {
      setSelectedDocs(selectedDocs.filter(id => id !== docId));
    } else {
      setSelectedDocs([...selectedDocs, docId]);
    }
  };

  const handleCategoryChange = (docId: string, newCategory: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? { ...d, category: newCategory, categorization_source: 'manual' as const, manual_category_override: true }
          : d,
      ),
    );
    setEditingDocId(null);
    toast.success('Category updated');
  };

  const categories = ['License', 'Permit', 'Certificate', 'Insurance', 'Training', 'Other'];

  const categoryLabelMap: Record<string, string> = {
    License: t('pages.documents.license'),
    Permit: t('pages.documents.permit'),
    Certificate: t('pages.documents.certificate'),
    Insurance: t('pages.documents.insurance'),
    Training: t('pages.documents.training'),
    Other: t('pages.documents.other'),
  };

  const statusLabelMap: Record<string, string> = {
    current: t('status.current'),
    expiring: t('status.expiring'),
    expired: t('status.expired'),
  };

  const getSharedStatusBadge = (status: string) => {
    switch (status) {
      case 'downloaded':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700">{t('pages.documents.downloaded')}</span>;
      case 'viewed':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">{t('pages.documents.viewed')}</span>;
      case 'sent':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-[#1E2D4D]/5 text-[#1E2D4D]/70">{t('pages.documents.sent')}</span>;
      default:
        return null;
    }
  };

  if (pageError) {
    return (
      <>
        <Breadcrumb items={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('pages.documents.title') }]} />
        <ErrorState error={pageError} onRetry={() => { setPageError(null); fetchDocuments(); }} />
      </>
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('pages.documents.title') }]} />
      <div className="space-y-6">
        {isDemoMode && <DemoModeBanner />}

        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2D4D]">{t('pages.documents.documentation')}</h1>
            <p className="text-sm text-[#1E2D4D]/70 mt-1">{t('pages.documents.subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => navigate('/import?type=documents')}
              className="flex items-center space-x-2 px-4 py-2 min-h-[44px] border border-[#1E2D4D] text-[#1E2D4D] rounded-lg hover:bg-[#eef4f8] shadow-sm transition-colors duration-150"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
            {selectedDocs.length > 0 && activeTab === 'documents' && (
              <button
                onClick={handleShareMultiple}
                className="flex items-center space-x-2 px-4 py-2 min-h-[44px] bg-[#1E2D4D] text-white rounded-xl shadow-sm hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] duration-150"
              >
                <Share2 className="h-5 w-5" />
                <span>{t('pages.documents.shareSelected').replace('{{count}}', String(selectedDocs.length))}</span>
              </button>
            )}
            <button
              onClick={() => setShowSmartUpload(true)}
              className="flex items-center space-x-2 px-4 py-2 min-h-[44px] bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] shadow-sm transition-all duration-150 active:scale-[0.98] duration-150"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">{t('pages.documents.upload')}</span>
              <span className="sm:hidden">{t('pages.documents.uploadShort')}</span>
            </button>
            <button
              onClick={() => setShowPhotoCapture(!showPhotoCapture)}
              className="flex items-center space-x-2 px-4 py-2 min-h-[44px] bg-white text-[#1E2D4D] border-2 border-[#1E2D4D] rounded-xl hover:bg-[#FAF7F0] shadow-sm transition-colors duration-150"
            >
              <Camera className="h-5 w-5" />
              <span className="hidden sm:inline">{t('pages.documents.takePhoto')}</span>
              <span className="sm:hidden">{t('pages.documents.photoShort')}</span>
            </button>
          </div>
        </div>

        {/* Photo Capture Panel — documentMode auto-enhances for readability */}
        {showPhotoCapture && (
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#1E2D4D]/10">
            <PhotoEvidence
              photos={docPhotos}
              onChange={setDocPhotos}
              label={t('pages.documents.photographDocument')}
              maxPhotos={3}
              documentMode
            />
            <p className="text-xs text-[#1E2D4D]/30 mt-1">
              {t('pages.documents.photoHint')}
            </p>
            {docPhotos.length > 0 && (
              <div className="mt-3 space-y-3">
                <button
                  onClick={() => { toast.success('Document photo saved'); setShowPhotoCapture(false); setDocPhotos([]); }}
                  className="px-4 py-2 bg-[#1E2D4D] text-white rounded-lg hover:bg-[#162340] text-sm font-medium"
                >
                  {t('pages.documents.saveDocumentPhoto')}
                </button>
                <PhotoGallery photos={docPhotos} title={t('pages.documents.documentPhotos')} />
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: '4px solid #1E2D4D' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-[#1E2D4D]" />
              <span className="text-sm text-[#1E2D4D]/50 font-medium">{t('pages.documents.totalDocuments')}</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold tracking-tight text-[#1E2D4D] text-center">{locationFilteredDocs.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: '4px solid #16a34a' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-[#1E2D4D]/50 font-medium">{t('status.current')}</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold tracking-tight text-green-600 text-center">{statusCounts.current}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: '4px solid #A08C5A' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-[#A08C5A]" />
              <span className="text-sm text-[#1E2D4D]/50 font-medium">{t('status.expiringSoon')}</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold tracking-tight text-[#1E2D4D] text-center">{statusCounts.expiring}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: '4px solid #ef4444' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-[#1E2D4D]/50 font-medium">{t('status.expired')}</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold tracking-tight text-red-600 text-center">{statusCounts.expired}</div>
          </div>
        </div>

        {/* Expiring/Expired Alert Banner */}
        {(statusCounts.expiring > 0 || statusCounts.expired > 0) && (
          <div style={{ background: statusCounts.expired > 0 ? '#fef2f2' : '#fffbeb', border: `1px solid ${statusCounts.expired > 0 ? '#fecaca' : '#fde68a'}`, borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <AlertTriangle style={{ width: '20px', height: '20px', color: statusCounts.expired > 0 ? '#dc2626' : '#d97706', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              {statusCounts.expired > 0 && (
                <strong
                  onClick={() => setDocStatusFilter(docStatusFilter === 'expired' ? 'all' : 'expired')}
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}
                >
                  {statusCounts.expired} {t('pages.documents.documentsExpired')}{' '}
                </strong>
              )}
              {statusCounts.expiring > 0 && (
                <span
                  onClick={() => setDocStatusFilter(docStatusFilter === 'expiring' ? 'all' : 'expiring')}
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}
                >
                  {statusCounts.expiring} {t('pages.documents.documentsExpiring')}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Active status filter indicator */}
        {docStatusFilter !== 'all' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>{t('pages.documents.showing')}</span>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600,
                backgroundColor: docStatusFilter === 'expired' ? '#fee2e2' : '#fef9c3',
                color: docStatusFilter === 'expired' ? '#991b1b' : '#854d0e',
              }}
            >
              {docStatusFilter === 'expired' ? t('pages.documents.expiredDocuments') : t('pages.documents.expiringSoonDocuments')}
              <button onClick={() => setDocStatusFilter('all')} style={{ marginLeft: '2px', cursor: 'pointer', fontWeight: 'bold', background: 'none', border: 'none', color: 'inherit', fontSize: '14px', lineHeight: 1 }}>&times;</button>
            </span>
          </div>
        )}

        <div className="flex space-x-2 border-b border-[#1E2D4D]/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'documents'
                ? 'border-[#A08C5A] text-[#1E2D4D]'
                : 'border-transparent text-[#1E2D4D]/70 hover:text-[#1E2D4D] hover:border-[#1E2D4D]/15'
            }`}
          >
            {t('pages.documents.allDocuments')}
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'shared'
                ? 'border-[#A08C5A] text-[#1E2D4D]'
                : 'border-transparent text-[#1E2D4D]/70 hover:text-[#1E2D4D] hover:border-[#1E2D4D]/15'
            }`}
          >
            {t('pages.documents.shared')} ({sharedItems.length})
          </button>
        </div>

        {activeTab === 'documents' && (
          <>
            {/* Search bar + Location filter */}
            <div data-demo-allow style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '0' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder={t('pages.documents.searchDocuments')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1E2D4D'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer' }}
              >
                {DOC_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Category filter pills */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors duration-150 ${
                  selectedCategory === 'All' ? 'bg-[#1E2D4D] text-white' : 'bg-white text-[#1E2D4D]/80 border border-[#1E2D4D]/15 hover:bg-[#FAF7F0]'
                }`}
              >
                {t('pages.documents.all')} ({locationFilteredDocs.length})
              </button>
              {categories.map((cat) => {
                const count = locationFilteredDocs.filter(d => d.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors duration-150 ${
                      selectedCategory === cat ? 'bg-[#1E2D4D] text-white' : 'bg-white text-[#1E2D4D]/80 border border-[#1E2D4D]/15 hover:bg-[#FAF7F0]'
                    }`}
                  >
                    {categoryLabelMap[cat] || cat} {count > 0 ? `(${count})` : ''}
                  </button>
                );
              })}
            </div>

            <div className="bg-white border border-[#1E2D4D]/10 rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-12">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-[#1E2D4D]/8 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={!isDemoMode && documents.length === 0
                    ? 'No documents uploaded yet'
                    : searchQuery ? t('pages.documents.noMatchingDocuments') : selectedCategory === 'All' ? t('pages.documents.noDocumentsYet') : t('pages.documents.noCategoryDocuments').replace('{{category}}', categoryLabelMap[selectedCategory] || selectedCategory)}
                  description={!isDemoMode && documents.length === 0
                    ? 'Upload your first document to keep everything in one place.'
                    : searchQuery
                    ? t('pages.documents.noMatchingDescription')
                    : selectedCategory === 'All'
                    ? t('pages.documents.noDocumentsDescription')
                    : t('pages.documents.noCategoryDescription')}
                  action={{
                    label: t('pages.documents.upload'),
                    onClick: () => setShowSmartUpload(true),
                  }}
                />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="min-w-full divide-y divide-[#1E2D4D]/10">
                    <thead className="bg-[#FAF7F0]">
                      <tr>
                        <th className="px-4 py-3 text-left" style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedDocs.length === filteredDocuments.length && filteredDocuments.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocs(filteredDocuments.map(d => d.id));
                              } else {
                                setSelectedDocs([]);
                              }
                            }}
                            className="h-4 w-4 text-[#1E2D4D] focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 border-[#1E2D4D]/15 rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider">
                          {t('pages.documents.documentName')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider hidden sm:table-cell">
                          {t('pages.documents.category')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider hidden sm:table-cell">
                          {t('pages.documents.location')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider">
                          {t('pages.documents.status')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider hidden md:table-cell">
                          Scan
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider hidden lg:table-cell">
                          {t('pages.documents.uploaded')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider">
                          {t('pages.documents.expiration')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider">
                          {t('pages.documents.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#1E2D4D]/10">
                      {filteredDocuments.map((doc) => {
                        const docStatus = getDocStatus(doc);
                        const hasAi = !!doc.ai_analysis;
                        const isExpanded = expandedDocId === doc.id;
                        return (
                          <React.Fragment key={doc.id}>
                          <tr
                            className={`${selectedDocs.includes(doc.id) ? 'bg-blue-50' : 'hover:bg-[#FAF7F0]'} ${hasAi ? 'cursor-pointer' : ''}`}
                            onClick={(e) => {
                              // Don't toggle if clicking checkbox, button, or select
                              const target = e.target as HTMLElement;
                              if (target.closest('input, button, select, a')) return;
                              if (hasAi) setExpandedDocId(isExpanded ? null : doc.id);
                            }}
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedDocs.includes(doc.id)}
                                onChange={() => handleToggleDoc(doc.id)}
                                className="h-4 w-4 text-[#1E2D4D] focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 border-[#1E2D4D]/15 rounded"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center">
                                {hasAi ? (
                                  <ChevronRight
                                    size={16}
                                    className={`text-[#1E2D4D]/30 mr-2 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                  />
                                ) : (
                                  <FileText className="h-5 w-5 text-[#1E2D4D]/30 mr-2 flex-shrink-0" />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[#1E2D4D]">{doc.title}</span>
                                    {doc.needs_attention && <NeedsAttentionBadge />}
                                    {doc.import_source && doc.import_source !== 'direct' && (
                                      <span
                                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                                        style={{ backgroundColor: '#eef4f8', color: '#1E2D4D' }}
                                        title={`Imported from ${doc.import_source.replace('_', ' ')}`}
                                      >
                                        Cloud
                                      </span>
                                    )}
                                  </div>
                                  {doc.provided_by && (
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                      {t('pages.documents.providedBy')} <span style={{ color: '#1E2D4D', fontWeight: 500 }}>{doc.provided_by}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
                              {editingDocId === doc.id ? (
                                <select
                                  autoFocus
                                  className="border border-[#1E2D4D]/15 rounded-md px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 bg-white"
                                  defaultValue={doc.category}
                                  onChange={(e) => handleCategoryChange(doc.id, e.target.value)}
                                  onBlur={() => setEditingDocId(null)}
                                >
                                  {PILLAR_OPTIONS.map((pillar) => (
                                    <optgroup key={pillar.value} label={`${pillar.icon} ${pillar.label}`}>
                                      {DOCUMENT_TYPE_OPTIONS
                                        .filter((o) => o.pillar === pillar.value)
                                        .map((opt) => (
                                          <option key={opt.value} value={mapPillarToCategory(opt.pillar)}>
                                            {opt.label}
                                          </option>
                                        ))}
                                    </optgroup>
                                  ))}
                                  <optgroup label="Other">
                                    <option value="Other">Other / Unknown</option>
                                  </optgroup>
                                </select>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700">
                                    {categoryLabelMap[doc.category] || doc.category}
                                  </span>
                                  {doc.categorization_source === 'manual' && (
                                    <span
                                      title="Manually categorized"
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
                                      style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                                    >
                                      <Pencil size={9} />
                                      Manual
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/70 hidden sm:table-cell">
                              {doc.location}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <DocStatusBadge status={docStatus} label={statusLabelMap[docStatus]} />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                              <ScanStatusBadge scanStatus={doc.scan_status} />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/50 hidden lg:table-cell">
                              {format(new Date(doc.created_at), 'MMM d, yyyy')}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/50">
                              {doc.expiration_date ? format(new Date(doc.expiration_date), 'MMM d, yyyy') : '—'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/50">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingDocId(editingDocId === doc.id ? null : doc.id)}
                                  style={{ color: editingDocId === doc.id ? '#A08C5A' : '#6b7280' }}
                                  onMouseEnter={(e) => { if (editingDocId !== doc.id) e.currentTarget.style.color = '#1E2D4D'; }}
                                  onMouseLeave={(e) => { if (editingDocId !== doc.id) e.currentTarget.style.color = '#6b7280'; }}
                                  title="Edit category"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleShareDocument(doc.title)}
                                  style={{ color: '#1E2D4D' }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#141E33'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#1E2D4D'}
                                  title="Share document"
                                >
                                  <Share2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDownload(doc)}
                                  className="hover:opacity-70"
                                  style={{ color: '#1E2D4D' }}
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => toast.success(`"${doc.title}" deleted`)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {/* AI Analysis expansion row */}
                          {hasAi && isExpanded && doc.ai_analysis && (
                            <tr>
                              <td colSpan={9} className="p-0">
                                <div className="bg-[#FAF7F0] border-t border-b border-[#1E2D4D]/5">
                                  <AiAnalysisPanel
                                    analysis={doc.ai_analysis}
                                    isOpen={true}
                                    onToggle={() => setExpandedDocId(null)}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'shared' && (
          <div className="bg-white border border-[#1E2D4D]/10 rounded-xl overflow-hidden">
            {sharedItems.length === 0 ? (
              <EmptyState
                icon={Share2}
                title={t('pages.documents.noSharedDocuments')}
                description={t('pages.documents.noSharedDescription')}
                action={{
                  label: t('pages.documents.shareADocument'),
                  onClick: () => {
                    setActiveTab('documents');
                  },
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#1E2D4D]/10">
                  <thead className="bg-[#FAF7F0]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider">
                        {t('pages.documents.document')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider">
                        {t('pages.documents.recipient')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider hidden sm:table-cell">
                        {t('pages.documents.recipientType')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider hidden sm:table-cell">
                        {t('pages.documents.dateShared')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#1E2D4D]/50 uppercase tracking-wider">
                        {t('pages.documents.status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#1E2D4D]/10">
                    {sharedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#FAF7F0]">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-[#1E2D4D]/30 mr-2" />
                            <span className="text-sm font-medium text-[#1E2D4D]">{item.document}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E2D4D]">
                          {item.recipient}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/70 hidden sm:table-cell">
                          {item.recipientType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1E2D4D]/50 hidden sm:table-cell">
                          {format(new Date(item.date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getSharedStatusBadge(item.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <SmartUploadModal
          isOpen={showSmartUpload}
          onClose={() => setShowSmartUpload(false)}
          onSave={(classifiedFiles: ClassifiedFile[]) => {
            // Add classified files as new documents — initially in 'scanning' status
            const newDocs: Document[] = classifiedFiles.map((cf, i) => {
              const wasEdited = cf.overrides.documentType !== (cf.classification?.documentType ?? '');
              return {
                id: `ai-${Date.now()}-${i}`,
                title: cf.overrides.documentLabel || cf.file.name,
                category: mapPillarToCategory(cf.overrides.pillar),
                expiration_date: cf.overrides.expiryDate || null,
                created_at: new Date().toISOString(),
                status: 'active',
                location: selectedLocation === 'All Locations' ? (docAccessibleLocs[0]?.locationName || '') : selectedLocation,
                provided_by: cf.overrides.vendorName || undefined,
                categorization_source: wasEdited ? 'manual' as const : 'ai' as const,
                manual_category_override: wasEdited,
                scan_status: 'scanning' as ScanStatus,
              };
            });
            setDocuments((prev) => [...newDocs, ...prev]);
            setShowSmartUpload(false);

            // Simulate scan completion — in demo mode, transition to 'available' after delay.
            // In production, the document-scan edge function updates the DB record and a
            // realtime subscription (or polling) would update the UI.
            if (isDemoMode) {
              setTimeout(() => {
                setDocuments((prev) =>
                  prev.map((d) =>
                    newDocs.some((nd) => nd.id === d.id)
                      ? { ...d, scan_status: 'available' as ScanStatus }
                      : d,
                  ),
                );
              }, 2500);
            }
          }}
          batchMode
        />

        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedDocForShare(null);
          }}
          preselectedDocuments={selectedDocForShare ? [selectedDocForShare] : []}
          documentType="document"
        />
      </div>

      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}
