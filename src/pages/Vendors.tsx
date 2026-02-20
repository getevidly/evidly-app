import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Building2, Mail, Phone, FileText, CheckCircle, AlertTriangle, Clock,
  ChevronRight, ArrowLeft, MapPin, Calendar, Send, Upload, Download,
  Bell, BellOff, ExternalLink, XCircle, Filter, CheckCircle2, TrendingUp,
  TrendingDown, Minus, Link2, Loader2, Wrench,
} from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { vendors as demoVendors, locations as demoLocations } from '../data/demoData';
import { format } from 'date-fns';
import { Breadcrumb } from '../components/Breadcrumb';
import { VendorContactActions } from '../components/VendorContactActions';
import { useRole } from '../contexts/RoleContext';
import { PhotoEvidence, type PhotoRecord } from '../components/PhotoEvidence';
import { PhotoGallery } from '../components/PhotoGallery';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { supabase } from '../lib/supabase';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

// ── Types ──────────────────────────────────────────────────────────

interface LocationService {
  locationId: string;
  locationName: string;
  lastService: string;
  nextDue: string;
  status: 'current' | 'overdue' | 'upcoming';
}

interface ConsolidatedVendor {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  serviceType: string;
  locations: LocationService[];
  overallStatus: 'current' | 'overdue' | 'upcoming';
  pendingDocuments: number;
  totalDocuments: number;
  autoRequestEnabled: boolean;
  coiExpiration: string;
  coiStatus: 'current' | 'expiring' | 'expired';
}

interface VendorDocument {
  name: string;
  type: string;
  status: 'on-file' | 'missing' | 'expiring' | 'expired';
  expirationDate?: string;
  uploadDate?: string;
  autoRequestEnabled?: boolean;
}

interface TimelineStep {
  day: number;
  label: string;
  description: string;
  date: string;
  status: 'completed' | 'sent' | 'pending' | 'failed';
  escalation?: string;
}

interface VendorPerformance {
  vendorId: string;
  reliabilityScore: number;
  onTimeRate: number;
  docComplianceRate: number;
  trend: 'improving' | 'declining' | 'stable';
}

// ── Consolidate demo vendors ───────────────────────────────────────

function buildConsolidatedVendors(): ConsolidatedVendor[] {
  const grouped: Record<string, typeof demoVendors[0][]> = {};
  demoVendors.forEach((v) => {
    if (!grouped[v.companyName]) grouped[v.companyName] = [];
    grouped[v.companyName].push(v);
  });

  const locationMap: Record<string, string> = {};
  demoLocations.forEach((l) => { locationMap[l.id] = l.name; });

  return Object.entries(grouped).map(([companyName, entries]) => {
    const first = entries[0];
    const locations: LocationService[] = entries.map((e) => ({
      locationId: e.locationId,
      locationName: locationMap[e.locationId] || `Location ${e.locationId}`,
      lastService: e.lastService,
      nextDue: e.nextDue,
      status: e.status,
    }));

    const hasOverdue = locations.some((l) => l.status === 'overdue');
    const hasUpcoming = locations.some((l) => l.status === 'upcoming');
    const overallStatus: 'current' | 'overdue' | 'upcoming' = hasOverdue ? 'overdue' : hasUpcoming ? 'upcoming' : 'current';

    // Document status per vendor
    const docInfo = VENDOR_DOC_STATUS[first.id] || { pending: 0, total: 5, coiExp: '2026-12-31', coiStatus: 'current' as const };

    return {
      id: first.id,
      companyName,
      contactName: first.contactName,
      email: first.email,
      phone: first.phone,
      serviceType: first.serviceType,
      locations,
      overallStatus,
      pendingDocuments: docInfo.pending,
      totalDocuments: docInfo.total,
      autoRequestEnabled: companyName === 'Valley Fire Systems',
      coiExpiration: docInfo.coiExp,
      coiStatus: docInfo.coiStatus,
    };
  });
}

// ── Document status per vendor (keyed by first vendor ID) ──────────

const VENDOR_DOC_STATUS: Record<string, { pending: number; total: number; coiExp: string; coiStatus: 'current' | 'expiring' | 'expired' }> = {
  '1': { pending: 1, total: 7, coiExp: '2026-03-01', coiStatus: 'expiring' },
  '2': { pending: 0, total: 6, coiExp: '2026-09-30', coiStatus: 'current' },
  '3': { pending: 2, total: 6, coiExp: '2025-12-31', coiStatus: 'expired' },
  '4': { pending: 0, total: 5, coiExp: '2026-12-31', coiStatus: 'current' },
  '5': { pending: 1, total: 5, coiExp: '2026-09-30', coiStatus: 'current' },
};

// ── Vendor documents (for detail view) ─────────────────────────────

const VENDOR_DOCUMENTS: Record<string, VendorDocument[]> = {
  '1': [
    { name: 'Certificate of Insurance', type: 'COI', status: 'expiring', expirationDate: '2026-03-01', uploadDate: '2025-03-01', autoRequestEnabled: true },
    { name: 'Hood Cleaning Certificate', type: 'Hood Cert', status: 'on-file', expirationDate: '2026-07-28', uploadDate: '2026-01-15' },
    { name: 'Before/After Photos', type: 'Photos', status: 'on-file', uploadDate: '2026-01-15' },
    { name: 'IKECA Certification', type: 'IKECA Cert', status: 'on-file', expirationDate: '2027-01-01', uploadDate: '2025-01-15' },
    { name: 'Business License', type: 'License', status: 'on-file', expirationDate: '2026-12-31', uploadDate: '2025-01-10' },
    { name: 'W-9 Form', type: 'W-9', status: 'on-file', uploadDate: '2025-01-05' },
    { name: 'Service Agreement', type: 'Agreement', status: 'missing' },
  ],
  '2': [
    { name: 'Certificate of Insurance', type: 'COI', status: 'on-file', expirationDate: '2026-09-30', uploadDate: '2025-10-01' },
    { name: 'Service Report', type: 'Report', status: 'on-file', uploadDate: '2026-01-28' },
    { name: 'Pesticide Records', type: 'Records', status: 'on-file', uploadDate: '2026-01-28' },
    { name: 'Business License', type: 'License', status: 'on-file', expirationDate: '2026-12-31', uploadDate: '2025-01-08' },
    { name: 'W-9 Form', type: 'W-9', status: 'on-file', uploadDate: '2025-01-03' },
    { name: 'Service Agreement', type: 'Agreement', status: 'on-file', uploadDate: '2025-01-01' },
  ],
  '3': [
    { name: 'Certificate of Insurance', type: 'COI', status: 'expired', expirationDate: '2025-12-31', uploadDate: '2024-12-15', autoRequestEnabled: true },
    { name: 'Inspection Report', type: 'Report', status: 'missing', autoRequestEnabled: true },
    { name: 'Ansul Tags', type: 'Tags', status: 'missing' },
    { name: 'Business License', type: 'License', status: 'on-file', expirationDate: '2026-12-31', uploadDate: '2025-01-12' },
    { name: 'W-9 Form', type: 'W-9', status: 'on-file', uploadDate: '2025-01-06' },
    { name: 'Service Agreement', type: 'Agreement', status: 'on-file', uploadDate: '2025-01-01' },
  ],
  '4': [
    { name: 'Certificate of Insurance', type: 'COI', status: 'on-file', expirationDate: '2026-12-31', uploadDate: '2026-01-01' },
    { name: 'Service Report', type: 'Report', status: 'on-file', uploadDate: '2026-01-05' },
    { name: 'Business License', type: 'License', status: 'on-file', expirationDate: '2026-12-31', uploadDate: '2025-01-09' },
    { name: 'W-9 Form', type: 'W-9', status: 'on-file', uploadDate: '2025-01-04' },
    { name: 'Service Agreement', type: 'Agreement', status: 'on-file', uploadDate: '2025-01-01' },
  ],
  '5': [
    { name: 'Certificate of Insurance', type: 'COI', status: 'on-file', expirationDate: '2026-09-30', uploadDate: '2025-10-01' },
    { name: 'Manifest', type: 'Manifest', status: 'on-file', uploadDate: '2026-01-05' },
    { name: 'Business License', type: 'License', status: 'on-file', expirationDate: '2026-12-31', uploadDate: '2025-03-01' },
    { name: 'W-9 Form', type: 'W-9', status: 'missing' },
    { name: 'Service Agreement', type: 'Agreement', status: 'on-file', uploadDate: '2025-01-01' },
  ],
};

// ── Valley Fire Systems post-service document automation timeline ───

const VALLEY_FIRE_TIMELINE: TimelineStep[] = [
  { day: 0, label: 'Service Performed', description: 'Fire suppression inspection completed at Airport Cafe', date: '2026-01-20', status: 'completed' },
  { day: 2, label: 'Auto-Send Upload Link', description: 'Secure upload link sent to mike@valleyfire.com requesting inspection report & Ansul tags', date: '2026-01-22', status: 'sent' },
  { day: 3, label: 'First Reminder', description: 'Reminder email sent — documents not yet uploaded', date: '2026-01-23', status: 'sent' },
  { day: 5, label: 'Second Reminder', description: 'Follow-up reminder sent — still awaiting documents', date: '2026-01-27', status: 'sent' },
  { day: 7, label: 'Third Reminder (Escalated)', description: 'Escalation email sent — CC\'d Kitchen Manager on reminder', date: '2026-01-29', status: 'sent', escalation: 'CC: Kitchen Manager' },
  { day: 10, label: 'Fourth Reminder (Urgent)', description: 'Urgent reminder — final notice before non-compliance flag', date: '2026-02-03', status: 'pending', escalation: 'Marked Urgent' },
  { day: 14, label: 'Final Notice (Non-Compliant)', description: 'Vendor flagged as non-compliant. Manual review required.', date: '2026-02-10', status: 'pending', escalation: 'Flag as Non-Compliant' },
];

// ── Performance scorecard data ─────────────────────────────────────

const VENDOR_PERFORMANCE: VendorPerformance[] = [
  { vendorId: '1', reliabilityScore: 98, onTimeRate: 100, docComplianceRate: 86, trend: 'stable' },
  { vendorId: '2', reliabilityScore: 92, onTimeRate: 95, docComplianceRate: 100, trend: 'stable' },
  { vendorId: '3', reliabilityScore: 72, onTimeRate: 80, docComplianceRate: 50, trend: 'declining' },
  { vendorId: '4', reliabilityScore: 95, onTimeRate: 97, docComplianceRate: 100, trend: 'improving' },
  { vendorId: '5', reliabilityScore: 88, onTimeRate: 85, docComplianceRate: 80, trend: 'stable' },
];

// ── Component ──────────────────────────────────────────────────────

export function Vendors() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedVendorId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState<'list' | 'scorecard'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [detailTab, setDetailTab] = useState('overview');
  const { getAccessibleLocations, showAllLocationsOption } = useRole();
  const vendorAccessibleLocs = getAccessibleLocations();
  const [autoRequestStates, setAutoRequestStates] = useState<Record<string, boolean>>({
    '3': true, // Valley Fire auto-request enabled by default
  });
  const [vendorPhotos, setVendorPhotos] = useState<PhotoRecord[]>([]);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ companyName: '', email: '', serviceType: 'Hood Cleaning' });

  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveVendors, setLiveVendors] = useState<ConsolidatedVendor[]>([]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const demoVendorList = useMemo(() => buildConsolidatedVendors(), []);

  // Fetch vendors from Supabase in live mode
  useEffect(() => {
    if (isDemoMode || !profile?.organization_id) return;

    async function fetchVendors() {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendors')
        .select('*, vendor_client_relationships!inner(organization_id, status)')
        .eq('vendor_client_relationships.organization_id', profile!.organization_id);

      if (error) {
        console.error('Error fetching vendors:', error);
        setLoading(false);
        return;
      }

      const mapped: ConsolidatedVendor[] = (data || []).map((v: any) => ({
        id: v.id,
        companyName: v.company_name,
        contactName: v.contact_name || '',
        email: v.email || '',
        phone: v.phone || '',
        serviceType: v.service_type || '',
        locations: [],
        overallStatus: v.status === 'overdue' ? 'overdue' : v.status === 'upcoming' ? 'upcoming' : 'current',
        pendingDocuments: 0,
        totalDocuments: 0,
        autoRequestEnabled: false,
        coiExpiration: '',
        coiStatus: 'current' as const,
      }));

      setLiveVendors(mapped);
      setLoading(false);
    }

    fetchVendors();
  }, [isDemoMode, profile?.organization_id]);

  const consolidatedVendors = isDemoMode ? demoVendorList : liveVendors.length > 0 ? liveVendors : demoVendorList;

  // Helper: get vendor's effective status for display (location-aware)
  const getDisplayStatus = (vendor: ConsolidatedVendor): 'current' | 'overdue' | 'upcoming' => {
    if (locationFilter !== 'all') {
      const loc = vendor.locations.find((l) => l.locationId === locationFilter);
      return loc?.status || vendor.overallStatus;
    }
    return vendor.overallStatus;
  };

  // Helper: get locations to display (filtered or all)
  const getDisplayLocations = (vendor: ConsolidatedVendor): LocationService[] => {
    if (locationFilter !== 'all') {
      return vendor.locations.filter((l) => l.locationId === locationFilter);
    }
    return vendor.locations;
  };

  // Apply filters
  const filteredVendors = useMemo(() => {
    return consolidatedVendors.filter((v) => {
      // Service type filter
      if (serviceFilter !== 'all' && v.serviceType !== serviceFilter) return false;
      // Location filter
      if (locationFilter !== 'all' && !v.locations.some((l) => l.locationId === locationFilter)) return false;
      // Status filter — when a specific location is selected, match that location's status
      if (statusFilter !== 'all') {
        if (locationFilter !== 'all') {
          const loc = v.locations.find((l) => l.locationId === locationFilter);
          if (!loc || loc.status !== statusFilter) return false;
        } else {
          if (v.overallStatus !== statusFilter) return false;
        }
      }
      return true;
    });
  }, [consolidatedVendors, statusFilter, serviceFilter, locationFilter]);

  const selectedVendor = selectedVendorId ? consolidatedVendors.find((v) => v.id === selectedVendorId) : null;
  const selectedDocs = selectedVendor ? (VENDOR_DOCUMENTS[selectedVendor.id] || []) : [];
  const selectedPerf = selectedVendor ? VENDOR_PERFORMANCE.find((p) => p.vendorId === selectedVendor.id) : null;

  const handleSelectVendor = (v: ConsolidatedVendor) => {
    setSearchParams({ id: v.id });
    setDetailTab('overview');
  };

  const handleBack = () => {
    setSearchParams({});
  };

  const toggleAutoRequest = (vendorId: string) => {
    setAutoRequestStates((prev) => ({ ...prev, [vendorId]: !prev[vendorId] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on-file':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />On File</span>;
      case 'missing':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Missing</span>;
      case 'expiring':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><AlertTriangle className="h-3 w-3 mr-1" />Expiring</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Expired</span>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 75) return 'bg-yellow-100';
    if (score >= 60) return 'bg-amber-100';
    return 'bg-red-100';
  };

  const getScoreBorder = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 75) return '#eab308';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  // ── Detail View ────────────────────────────────────────────────

  if (selectedVendor) {
    const onFileDocs = selectedDocs.filter((d) => d.status === 'on-file').length;
    const progressPercent = selectedDocs.length > 0 ? Math.round((onFileDocs / selectedDocs.length) * 100) : 0;
    const isValleyFire = selectedVendor.companyName === 'Valley Fire Systems';
    const isAutoEnabled = autoRequestStates[selectedVendor.id] || false;
    const expiringDocs = selectedDocs.filter((d) => d.status === 'expiring' || d.status === 'expired');

    return (
      <>
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vendors', href: '/vendors' }, { label: selectedVendor.companyName }]} />
        <div className="space-y-6">
          <button onClick={handleBack} className="flex items-center text-[#1e4d6b] hover:text-[#163a52] font-medium">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to All Vendors
          </button>

          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building2 className="h-8 w-8 text-[#1e4d6b]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedVendor.companyName}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedVendor.serviceType}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      selectedVendor.overallStatus === 'overdue' ? 'bg-red-100 text-red-800' :
                      selectedVendor.overallStatus === 'upcoming' ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedVendor.overallStatus === 'overdue' ? 'Overdue' : selectedVendor.overallStatus === 'upcoming' ? 'Due Soon' : 'Current'}
                    </span>
                    {selectedVendor.pendingDocuments > 0 ? (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Pending Documents: {selectedVendor.pendingDocuments}
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        All Documents Current
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex items-center space-x-2">
                <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">Auto-Request</span>
                  <button
                    onClick={() => toggleAutoRequest(selectedVendor.id)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isAutoEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isAutoEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                  {isAutoEnabled ? <Bell className="h-4 w-4 text-green-600" /> : <BellOff className="h-4 w-4 text-gray-400" />}
                </div>
              </div>
            </div>
          </div>

          {/* Expiring document alerts */}
          {expiringDocs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-800">Document Alerts</h3>
                  <div className="mt-1 space-y-1">
                    {expiringDocs.map((doc, i) => (
                      <p key={i} className="text-sm text-amber-700">
                        {doc.name} — {doc.status === 'expired' ? 'EXPIRED' : 'Expiring'} {doc.expirationDate && format(new Date(doc.expirationDate), 'MMM d, yyyy')}
                        {isAutoEnabled && <span className="ml-2 text-xs text-amber-600">(Auto-request {doc.status === 'expired' ? 'sent' : 'scheduled'})</span>}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
            {['overview', 'documents', 'automation', 'upload-link', 'contact'].map((tab) => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`px-5 py-3 font-medium whitespace-nowrap text-sm ${
                  detailTab === tab
                    ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'upload-link' ? 'Secure Upload Link' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {detailTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    <Phone className="h-5 w-5 mr-3 text-gray-400" />
                    <span>{selectedVendor.phone}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Mail className="h-5 w-5 mr-3 text-gray-400" />
                    <span>{selectedVendor.email}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Building2 className="h-5 w-5 mr-3 text-gray-400" />
                    <span>{selectedVendor.contactName}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <VendorContactActions
                    vendorName={selectedVendor.companyName}
                    contactName={selectedVendor.contactName}
                    email={selectedVendor.email}
                    phone={selectedVendor.phone}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold mb-4">Service Schedule by Location</h2>
                <div className="space-y-3">
                  {selectedVendor.locations.map((loc) => (
                    <div key={loc.locationId} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                      <div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 text-sm">{loc.locationName}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 ml-6">
                          Last: {format(new Date(loc.lastService), 'MMM d, yyyy')} · Next: {format(new Date(loc.nextDue), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        loc.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        loc.status === 'upcoming' ? 'bg-amber-100 text-amber-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {loc.status === 'overdue' ? 'Overdue' : loc.status === 'upcoming' ? 'Due Soon' : 'Current'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Equipment */}
              {(() => {
                const VENDOR_EQUIPMENT_MAP: Record<string, { name: string; type: string; location: string; serviceType: string }[]> = {
                  'abc-fire-protection': [
                    { name: 'Hood Ventilation System', type: 'Hood System', location: 'Downtown Kitchen', serviceType: 'Hood Cleaning' },
                    { name: 'Hood Ventilation System', type: 'Hood System', location: 'Airport Cafe', serviceType: 'Hood Cleaning' },
                    { name: 'Hood Ventilation System', type: 'Hood System', location: 'University Dining', serviceType: 'Hood Cleaning' },
                    { name: 'Upblast Exhaust Fan — Main Hood', type: 'Exhaust Fan', location: 'Downtown Kitchen', serviceType: 'Cleaning (with hood)' },
                    { name: 'Upblast Exhaust Fan', type: 'Exhaust Fan', location: 'Airport Cafe', serviceType: 'Cleaning (with hood)' },
                    { name: 'Upblast Exhaust Fan — Main Line', type: 'Exhaust Fan', location: 'University Dining', serviceType: 'Cleaning (with hood)' },
                  ],
                  'cleanair-hvac': [
                    { name: 'Walk-in Cooler #1', type: 'Walk-in Cooler', location: 'Downtown Kitchen', serviceType: 'Repair & Maintenance' },
                    { name: 'Walk-in Freezer', type: 'Walk-in Freezer', location: 'Downtown Kitchen', serviceType: 'Maintenance' },
                    { name: 'Commercial Dishwasher', type: 'Commercial Dishwasher', location: 'Downtown Kitchen', serviceType: 'Repair & Maintenance' },
                    { name: 'Ice Machine', type: 'Ice Machine', location: 'Downtown Kitchen', serviceType: 'Cleaning & Service' },
                    { name: 'Walk-in Cooler', type: 'Walk-in Cooler', location: 'Airport Cafe', serviceType: 'Maintenance' },
                    { name: 'Ice Machine', type: 'Ice Machine', location: 'Airport Cafe', serviceType: 'Cleaning & Service' },
                  ],
                  'valley-fire-systems': [
                    { name: 'Fire Suppression System', type: 'Fire Suppression System', location: 'Downtown Kitchen', serviceType: 'Semi-Annual Inspection' },
                    { name: 'Hood Ventilation System', type: 'Hood System', location: 'Downtown Kitchen', serviceType: 'Fire Suppression Inspection' },
                    { name: 'Hood Ventilation System', type: 'Hood System', location: 'Airport Cafe', serviceType: 'Fire Suppression Inspection' },
                  ],
                };
                const vendorSlug = selectedVendor.companyName.toLowerCase().replace(/\s+/g, '-');
                const linkedEquipment = VENDOR_EQUIPMENT_MAP[vendorSlug] || [];
                if (linkedEquipment.length === 0) return null;
                return (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Linked Equipment ({linkedEquipment.length})</h2>
                      <button onClick={() => navigate('/equipment')} className="text-xs text-[#1e4d6b] hover:underline flex items-center gap-1">
                        <Wrench className="h-3.5 w-3.5" /> View All Equipment
                      </button>
                    </div>
                    <div className="space-y-2">
                      {linkedEquipment.map((eq, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/equipment')}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#eef4f8' }}>
                              <Wrench className="h-4 w-4 text-[#1e4d6b]" />
                            </div>
                            <div>
                              <div className="font-medium text-sm text-gray-900">{eq.name}</div>
                              <div className="text-xs text-gray-500">{eq.location} · {eq.serviceType}</div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Performance */}
              {selectedPerf && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:col-span-2">
                  <h2 className="text-lg font-semibold mb-4">Performance</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: `4px solid ${getScoreBorder(selectedPerf.reliabilityScore)}` }}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <EvidlyIcon size={16} />
                        <span className="text-sm text-gray-500 font-medium">Reliability Score</span>
                      </div>
                      <p className={`text-xl sm:text-3xl font-bold text-center ${getScoreColor(selectedPerf.reliabilityScore)}`}>{selectedPerf.reliabilityScore}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: `4px solid ${getScoreBorder(selectedPerf.onTimeRate)}` }}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Clock className="h-4 w-4" style={{ color: getScoreBorder(selectedPerf.onTimeRate) }} />
                        <span className="text-sm text-gray-500 font-medium">On-Time Rate</span>
                      </div>
                      <p className={`text-xl sm:text-3xl font-bold text-center ${getScoreColor(selectedPerf.onTimeRate)}`}>{selectedPerf.onTimeRate}%</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5" style={{ borderLeft: `4px solid ${getScoreBorder(selectedPerf.docComplianceRate)}` }}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <FileText className="h-4 w-4" style={{ color: getScoreBorder(selectedPerf.docComplianceRate) }} />
                        <span className="text-sm text-gray-500 font-medium">Doc Compliance</span>
                      </div>
                      <p className={`text-xl sm:text-3xl font-bold text-center ${getScoreColor(selectedPerf.docComplianceRate)}`}>{selectedPerf.docComplianceRate}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {detailTab === 'documents' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Required Documents</h2>
                  <p className="text-sm text-gray-600 mt-1">{onFileDocs} of {selectedDocs.length} required documents on file</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  <button
                    onClick={async () => {
                      if (!isDemoMode && profile?.organization_id) {
                        await supabase.from('vendor_upload_requests').insert({
                          organization_id: profile.organization_id,
                          vendor_id: selectedVendor.id,
                          request_type: 'document',
                          description: 'Document request',
                          status: 'pending',
                          requested_by: profile.id,
                          vendor_email: selectedVendor.email,
                        });
                      }
                      showToast('Document request sent to ' + selectedVendor.email);
                    }}
                    className="flex items-center px-4 py-2 min-h-[44px] bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Request Document
                  </button>
                  <button
                    onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                    className="flex items-center px-4 py-2 min-h-[44px] bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload / Photo
                  </button>
                </div>
              </div>

              {showPhotoUpload && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <PhotoEvidence
                    photos={vendorPhotos}
                    onChange={setVendorPhotos}
                    label="Service Completion Photos"
                    maxPhotos={5}
                  />
                  {vendorPhotos.length > 0 && (
                    <div className="mt-3 space-y-3">
                      <button
                        onClick={() => guardAction('edit', 'vendor records', () => { showToast('Photos saved for vendor record.'); setShowPhotoUpload(false); })}
                        className="px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium"
                      >
                        Save Photos
                      </button>
                      <PhotoGallery photos={vendorPhotos} title="Service Photos" />
                    </div>
                  )}
                </div>
              )}

              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="space-y-3">
                {selectedDocs.map((doc, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3 flex-1">
                      <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{doc.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1 items-center">
                          {getStatusBadge(doc.status)}
                          {doc.expirationDate && <span className="text-xs text-gray-500">Exp: {format(new Date(doc.expirationDate), 'MMM d, yyyy')}</span>}
                          {doc.uploadDate && <span className="text-xs text-gray-500">Uploaded: {format(new Date(doc.uploadDate), 'MMM d, yyyy')}</span>}
                          {doc.autoRequestEnabled && isAutoEnabled && (
                            <span className="text-xs text-[#1e4d6b] flex items-center">
                              <Bell className="h-3 w-3 mr-0.5" />Auto-request on
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-2 md:mt-0">
                      {doc.status === 'on-file' && (
                        <button
                          onClick={() => guardAction('download', 'vendor documents', () => showToast('Downloading ' + doc.name + '...'))}
                          className="flex items-center text-sm px-2 hover:opacity-70"
                          style={{ color: '#1e4d6b' }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      )}
                      {(doc.status === 'missing' || doc.status === 'expired') && (
                        <button
                          onClick={async () => {
                            if (!isDemoMode && profile?.organization_id) {
                              await supabase.from('vendor_upload_requests').insert({
                                organization_id: profile.organization_id,
                                vendor_id: selectedVendor.id,
                                request_type: doc.type,
                                description: `Request for ${doc.name}`,
                                status: 'pending',
                                requested_by: profile.id,
                                vendor_email: selectedVendor.email,
                              });
                            }
                            showToast('Document request sent to ' + selectedVendor.email);
                          }}
                          className="flex items-center text-[#1e4d6b] hover:text-[#163a52] text-sm px-2"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Request
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Automation Tab */}
          {detailTab === 'automation' && (
            <div className="space-y-6">
              {/* Auto-Request Settings */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Document Automation Settings</h2>
                    <p className="text-sm text-gray-600 mt-1">Automatic document requests when items expire or after service completion</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{isAutoEnabled ? 'Enabled' : 'Disabled'}</span>
                    <button
                      onClick={() => toggleAutoRequest(selectedVendor.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAutoEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                {isAutoEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="h-5 w-5 text-[#1e4d6b]" />
                        <h3 className="font-medium text-gray-900">Expiring Document Alerts</h3>
                      </div>
                      <p className="text-sm text-gray-600">Auto-sends secure upload link when documents are within <strong>30 days</strong> of expiring</p>
                      <p className="text-xs text-green-600 mt-2 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" /> Active — monitoring {selectedDocs.filter((d) => d.expirationDate).length} documents
                      </p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="h-5 w-5 text-[#1e4d6b]" />
                        <h3 className="font-medium text-gray-900">Post-Service Document Request</h3>
                      </div>
                      <p className="text-sm text-gray-600">Auto-requests service documentation <strong>2 business days</strong> after service date with escalating reminders</p>
                      <p className="text-xs text-green-600 mt-2 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" /> Active — {selectedVendor.locations.length} locations monitored
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline (show for Valley Fire) */}
              {isValleyFire && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold">Post-Service Document Request — Airport Cafe</h2>
                      <p className="text-sm text-gray-600 mt-1">Fire suppression inspection on Jan 20, 2026 — awaiting documentation upload</p>
                    </div>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">In Progress</span>
                  </div>

                  <div className="relative">
                    {VALLEY_FIRE_TIMELINE.map((step, idx) => {
                      const isLast = idx === VALLEY_FIRE_TIMELINE.length - 1;
                      return (
                        <div key={idx} className="flex items-start mb-0">
                          <div className="flex flex-col items-center mr-4" style={{ minWidth: '32px' }}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              step.status === 'completed' ? 'bg-green-500' :
                              step.status === 'sent' ? 'bg-blue-500' :
                              'bg-gray-300'
                            }`}>
                              {step.status === 'completed' && <CheckCircle className="h-4 w-4 text-white" />}
                              {step.status === 'sent' && <Send className="h-4 w-4 text-white" />}
                              {step.status === 'pending' && <Clock className="h-4 w-4 text-gray-500" />}
                            </div>
                            {!isLast && (
                              <div className={`w-0.5 h-16 ${
                                step.status !== 'pending' ? 'bg-blue-300' : 'bg-gray-200'
                              }`} />
                            )}
                          </div>
                          <div className="pb-6 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-gray-900">Day {step.day}: {step.label}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                step.status === 'completed' ? 'bg-green-100 text-green-700' :
                                step.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {step.status === 'completed' ? 'Completed' : step.status === 'sent' ? 'Sent' : 'Pending'}
                              </span>
                              {step.escalation && (
                                <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-amber-100 text-amber-700">{step.escalation}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{format(new Date(step.date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isValleyFire && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 text-center text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="font-medium">No active automation workflows</p>
                  <p className="text-sm mt-1">Workflows will appear here when documents are requested or services are completed.</p>
                </div>
              )}
            </div>
          )}

          {/* Secure Upload Link Tab */}
          {detailTab === 'upload-link' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold mb-2">Secure Upload Link</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Each vendor gets a unique, secure link to upload documents without needing an EvidLY account.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Link2 className="h-5 w-5 text-[#1e4d6b] flex-shrink-0" />
                      <code className="text-sm text-gray-700 bg-white px-3 py-1 rounded border break-all">
                        https://evidly-app.vercel.app/vendor/upload/{selectedVendor.id}-{selectedVendor.companyName.toLowerCase().replace(/\s+/g, '-')}-abc123
                      </code>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(`https://evidly-app.vercel.app/vendor/upload/${selectedVendor.id}`); showToast('Link copied to clipboard!'); }}
                      className="flex items-center text-sm text-[#1e4d6b] hover:text-[#163a52] font-medium px-3 py-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Copy Link
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!isDemoMode && profile?.organization_id) {
                        await supabase.from('vendor_contact_log').insert({
                          organization_id: profile.organization_id,
                          vendor_id: selectedVendor.id,
                          contact_type: 'email',
                          initiated_by: profile.id,
                          subject: 'Secure Upload Link',
                          recipient_email: selectedVendor.email,
                          status: 'sent',
                        });
                      }
                      showToast('Upload link sent to ' + selectedVendor.email);
                    }}
                    className="flex items-center px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Link to Vendor
                  </button>
                  <button
                    onClick={() => showToast('Upload link regenerated.')}
                    className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Regenerate Link
                  </button>
                </div>
              </div>

              {/* Upload page preview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Upload Page Preview</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <div className="max-w-md mx-auto text-center">
                    <EvidlyIcon size={40} className="mx-auto mb-3" />
                    <h4 className="text-xl font-bold mb-1">
                      <span style={{ color: '#1e4d6b' }}>Evid</span>
                      <span style={{ color: '#d4af37' }}>LY</span>
                      <span className="text-gray-900"> Secure Upload</span>
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">Pacific Coast Dining has requested documents from {selectedVendor.companyName}</p>
                    <div className="bg-gray-50 rounded-lg p-4 text-left mb-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">Requested Documents:</p>
                      {selectedDocs.filter((d) => d.status === 'missing' || d.status === 'expired').map((doc, i) => (
                        <div key={i} className="flex items-center space-x-2 text-sm text-gray-700 mb-1">
                          <XCircle className="h-3 w-3 text-red-500" />
                          <span>{doc.name}</span>
                        </div>
                      ))}
                      {selectedDocs.filter((d) => d.status === 'missing' || d.status === 'expired').length === 0 && (
                        <p className="text-sm text-green-600">All documents are current!</p>
                      )}
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4">
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Drag & drop files or click to browse</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC — Max 25MB</p>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center justify-center">
                      <EvidlyIcon size={12} className="mr-1" />
                      Files are encrypted end-to-end
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {detailTab === 'contact' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-4">Contact {selectedVendor.contactName}</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <p className="mt-1 text-gray-900">{selectedVendor.companyName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                  <p className="mt-1 text-gray-900">{selectedVendor.contactName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-gray-900">{selectedVendor.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-gray-900">{selectedVendor.phone}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Quick Actions</p>
                <VendorContactActions
                  vendorName={selectedVendor.companyName}
                  contactName={selectedVendor.contactName}
                  email={selectedVendor.email}
                  phone={selectedVendor.phone}
                />
              </div>
            </div>
          )}
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium text-sm">{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  // ── List View ──────────────────────────────────────────────────

  const SERVICE_TYPES = ['Hood Cleaning', 'Fire Suppression', 'Pest Control', 'HVAC Service', 'Grease Trap'];

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vendors' }]} />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-colors ${
                activeTab === 'list' ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Vendor List
            </button>
            <button
              onClick={() => setActiveTab('scorecard')}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-colors ${
                activeTab === 'scorecard' ? 'border-b-2 border-[#d4af37] text-[#1e4d6b]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Performance Scorecard
            </button>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() => guardAction('invite', 'vendor management', () => setShowInviteModal(true))}
              className="flex items-center space-x-2 px-4 py-2 border border-[#1e4d6b] text-[#1e4d6b] rounded-lg hover:bg-[#eef4f8] shadow-sm transition-colors duration-150"
            >
              <Send className="h-4 w-4" />
              <span>Invite a Vendor</span>
            </button>
            <button
              onClick={() => showToast('Add Vendor form coming soon.')}
              className="flex items-center space-x-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] shadow-sm transition-colors duration-150"
            >
              <Plus className="h-5 w-5" />
              <span>Add Vendor</span>
            </button>
          </div>
        </div>

        {activeTab === 'list' && (
          <>
            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
                >
                  <option value="all">All Statuses</option>
                  <option value="current">Current</option>
                  <option value="upcoming">Due Soon</option>
                  <option value="overdue">Overdue</option>
                </select>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
                >
                  <option value="all">All Service Types</option>
                  {SERVICE_TYPES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]"
                >
                  {showAllLocationsOption() && <option value="all">All Locations</option>}
                  {vendorAccessibleLocs.map((loc) => (
                    <option key={loc.locationId} value={loc.locationId}>{loc.locationName}</option>
                  ))}
                </select>
                {(statusFilter !== 'all' || serviceFilter !== 'all' || locationFilter !== 'all') && (
                  <button
                    onClick={() => { setStatusFilter('all'); setServiceFilter('all'); setLocationFilter('all'); }}
                    className="text-sm text-[#1e4d6b] hover:text-[#163a52] font-medium px-2"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#1e4d6b]" />
                <span className="ml-3 text-gray-600">Loading vendors...</span>
              </div>
            )}

            {/* Vendor Cards */}
            {!loading && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVendors.map((vendor) => {
                const displayStatus = getDisplayStatus(vendor);
                const displayLocations = getDisplayLocations(vendor);
                return (
                <div
                  key={vendor.id}
                  onClick={() => handleSelectVendor(vendor)}
                  className="bg-white rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow cursor-pointer border-l-4"
                  style={{
                    borderLeftColor: displayStatus === 'overdue' ? '#dc2626' : displayStatus === 'upcoming' ? '#d97706' : '#16a34a',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-[#1e4d6b]" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{vendor.companyName}</h3>
                        <span className="text-xs text-gray-500">{vendor.serviceType}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
                  </div>

                  {/* Status + Document Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      displayStatus === 'overdue' ? 'bg-red-100 text-red-800' :
                      displayStatus === 'upcoming' ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {displayStatus === 'overdue' ? 'Overdue' : displayStatus === 'upcoming' ? 'Due Soon' : 'Current'}
                    </span>
                    {vendor.pendingDocuments > 0 ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Pending Documents: {vendor.pendingDocuments}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        All Documents Current
                      </span>
                    )}
                    {vendor.coiStatus === 'expired' && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">COI Expired</span>
                    )}
                    {vendor.coiStatus === 'expiring' && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">COI Expiring</span>
                    )}
                    {vendor.autoRequestEnabled && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 flex items-center">
                        <Bell className="h-3 w-3 mr-0.5" />Auto
                      </span>
                    )}
                  </div>

                  {/* Locations — show filtered or all */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">{locationFilter !== 'all' ? 'Location:' : `Locations (${vendor.locations.length}):`}</p>
                    <div className="flex flex-wrap gap-1">
                      {displayLocations.map((loc) => (
                        <span key={loc.locationId} className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                          <MapPin className="h-3 w-3 mr-0.5 text-gray-400" />
                          {loc.locationName}
                          {locationFilter !== 'all' && (
                            <span className="ml-1 text-gray-400">
                              · Next: {format(new Date(loc.nextDue), 'MMM d')}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="text-sm text-gray-600 mb-3">
                    <p className="font-medium text-gray-700">{vendor.contactName}</p>
                    <div className="flex items-center space-x-1 text-xs text-gray-500 mt-0.5">
                      <Mail className="h-3 w-3" />
                      <span>{vendor.email}</span>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); showToast('Schedule service for ' + vendor.companyName); }}
                      className="flex-1 flex items-center justify-center px-2 py-1.5 min-h-[44px] text-xs font-medium text-[#1e4d6b] rounded transition-colors"
                      style={{ backgroundColor: '#eef4f8' }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dde9f0')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#eef4f8')}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Schedule
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDemoMode && profile?.organization_id) {
                          supabase.from('vendor_upload_requests').insert({
                            organization_id: profile.organization_id,
                            vendor_id: vendor.id,
                            request_type: 'COI',
                            description: 'Certificate of Insurance request',
                            status: 'pending',
                            requested_by: profile.id,
                            vendor_email: vendor.email,
                          });
                        }
                        showToast('COI request sent to ' + vendor.email);
                      }}
                      className="flex-1 flex items-center justify-center px-2 py-1.5 min-h-[44px] text-xs font-medium text-[#1e4d6b] rounded transition-colors"
                      style={{ backgroundColor: '#eef4f8' }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dde9f0')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#eef4f8')}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Request COI
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelectVendor(vendor); setDetailTab('documents'); }}
                      className="flex-1 flex items-center justify-center px-2 py-1.5 min-h-[44px] text-xs font-medium text-[#1e4d6b] rounded transition-colors"
                      style={{ backgroundColor: '#eef4f8' }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dde9f0')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#eef4f8')}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Documents
                    </button>
                  </div>
                </div>
                );
              })}
            </div>}

            {!loading && filteredVendors.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="font-medium">No vendors match your filters</p>
                <button
                  onClick={() => { setStatusFilter('all'); setServiceFilter('all'); setLocationFilter('all'); }}
                  className="mt-2 text-sm text-[#1e4d6b] hover:text-[#163a52]"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'scorecard' && (
          <>
            <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-lg p-4 sm:p-6 text-white">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Vendor Performance Overview</h3>
              <p className="text-gray-200 mb-4">Track reliability, service quality, and document compliance</p>
              <div className="flex items-center space-x-4 flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold text-center">{VENDOR_PERFORMANCE.filter((v) => v.reliabilityScore >= 90).length}/{VENDOR_PERFORMANCE.length}</div>
                    <div className="text-sm text-gray-300">Fully Compliant</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {consolidatedVendors.map((vendor) => {
                const perf = VENDOR_PERFORMANCE.find((p) => p.vendorId === vendor.id);
                if (!perf) return null;
                return (
                  <div key={vendor.id} onClick={() => handleSelectVendor(vendor)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{vendor.companyName}</h3>
                        <span className="text-sm text-gray-500">{vendor.serviceType}</span>
                      </div>
                      {perf.trend === 'improving' ? <TrendingUp className="h-5 w-5 text-green-600" /> :
                       perf.trend === 'declining' ? <TrendingDown className="h-5 w-5 text-red-600" /> :
                       <Minus className="h-5 w-5 text-gray-400" />}
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Reliability Score</span>
                        <span className={`text-2xl font-bold text-center ${getScoreColor(perf.reliabilityScore)}`}>{perf.reliabilityScore}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${perf.reliabilityScore >= 90 ? 'bg-green-500' : perf.reliabilityScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${perf.reliabilityScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded-xl shadow-sm p-3" style={{ borderLeft: `4px solid ${getScoreBorder(perf.onTimeRate)}` }}>
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <Clock className="h-3.5 w-3.5" style={{ color: getScoreBorder(perf.onTimeRate) }} />
                          <span className="text-xs text-gray-500 font-medium">On-time Service</span>
                        </div>
                        <p className={`text-xl font-bold text-center ${getScoreColor(perf.onTimeRate)}`}>{perf.onTimeRate}%</p>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm p-3" style={{ borderLeft: `4px solid ${getScoreBorder(perf.docComplianceRate)}` }}>
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <FileText className="h-3.5 w-3.5" style={{ color: getScoreBorder(perf.docComplianceRate) }} />
                          <span className="text-xs text-gray-500 font-medium">Doc Compliance</span>
                        </div>
                        <p className={`text-xl font-bold text-center ${getScoreColor(perf.docComplianceRate)}`}>{perf.docComplianceRate}%</p>
                      </div>
                    </div>

                    <div className="border-t pt-3 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        perf.trend === 'improving' ? 'bg-green-100 text-green-800' :
                        perf.trend === 'declining' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {perf.trend === 'improving' ? 'Improving' : perf.trend === 'declining' ? 'Declining' : 'Stable'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Invite a Vendor Modal */}
      {showInviteModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowInviteModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-[95vw] sm:w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-[#eef4f8] rounded-lg">
                      <Send className="h-5 w-5 text-[#1e4d6b]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Invite a Vendor</h3>
                      <p className="text-sm text-gray-500">Send a branded invitation to join EvidLY</p>
                    </div>
                  </div>
                  <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={inviteForm.companyName}
                    onChange={(e) => setInviteForm({ ...inviteForm, companyName: e.target.value })}
                    placeholder="e.g., Valley Fire Systems"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="vendor@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <select
                    value={inviteForm.serviceType}
                    onChange={(e) => setInviteForm({ ...inviteForm, serviceType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                  >
                    {SERVICE_TYPES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-[#eef4f8] rounded-lg p-3 border border-[#b8d4e8]">
                  <p className="text-xs text-[#1e4d6b]">
                    <strong>What happens next:</strong> The vendor will receive a branded email from EvidLY inviting them to create a free vendor account, upload their credentials, and start receiving service requests from your organization.
                  </p>
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!inviteForm.companyName || !inviteForm.email) {
                      showToast('Please fill in company name and email.');
                      return;
                    }
                    if (!isDemoMode && profile?.organization_id) {
                      const { data: vendorData, error: vendorError } = await supabase
                        .from('vendors')
                        .insert({
                          company_name: inviteForm.companyName,
                          email: inviteForm.email,
                          service_type: inviteForm.serviceType,
                          status: 'current',
                        })
                        .select('id')
                        .single();

                      if (!vendorError && vendorData) {
                        await supabase.from('vendor_client_relationships').insert({
                          vendor_id: vendorData.id,
                          organization_id: profile.organization_id,
                          status: 'active',
                        });
                      }
                    }
                    showToast(`Invitation sent to ${inviteForm.email}! They will receive a branded email to join EvidLY.`);
                    setShowInviteModal(false);
                    setInviteForm({ companyName: '', email: '', serviceType: 'Hood Cleaning' });
                  }}
                  className="px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium"
                >
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {showUpgrade && (
        <DemoUpgradePrompt action={upgradeAction} featureName={upgradeFeature} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}
