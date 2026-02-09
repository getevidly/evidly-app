import { useState, useEffect, useMemo } from 'react';
import { Plus, FileText, Download, Trash2, Share2, Search, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format, differenceInDays } from 'date-fns';
import { DemoModeBanner } from '../components/DemoModeBanner';
import { EmptyState } from '../components/EmptyState';
import { DocumentScanAnimation } from '../components/DocumentScanAnimation';
import { Breadcrumb } from '../components/Breadcrumb';
import { ShareModal } from '../components/ShareModal';

interface Document {
  id: string;
  title: string;
  category: string;
  expiration_date: string | null;
  created_at: string;
  status: string;
  location: string;
  provided_by?: string;
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
  { id: '1', title: 'Food Service License', category: 'License', expiration_date: d(120), created_at: d(-300), status: 'active', location: 'Downtown Kitchen' },
  { id: '2', title: 'Food Service License', category: 'License', expiration_date: d(85), created_at: d(-280), status: 'active', location: 'Airport Cafe' },
  { id: '3', title: 'Business License', category: 'License', expiration_date: d(200), created_at: d(-160), status: 'active', location: 'Downtown Kitchen' },
  { id: '4', title: 'Business License', category: 'License', expiration_date: d(22), created_at: d(-150), status: 'active', location: 'Airport Cafe' },
  { id: '5', title: 'Business License', category: 'License', expiration_date: d(180), created_at: d(-140), status: 'active', location: 'University Dining' },

  // === Permits ===
  { id: '6', title: 'Health Department Permit', category: 'Permit', expiration_date: d(45), created_at: d(-280), status: 'active', location: 'Downtown Kitchen' },
  { id: '7', title: 'Health Department Permit', category: 'Permit', expiration_date: d(15), created_at: d(-260), status: 'active', location: 'Airport Cafe' },
  { id: '8', title: 'Health Department Inspection Report', category: 'Permit', expiration_date: d(330), created_at: d(-35), status: 'active', location: 'Downtown Kitchen' },
  { id: '9', title: 'Health Department Inspection Report', category: 'Permit', expiration_date: d(310), created_at: d(-55), status: 'active', location: 'University Dining' },
  { id: '10', title: 'Fire Safety Inspection Report', category: 'Permit', expiration_date: d(280), created_at: d(-30), status: 'active', location: 'Downtown Kitchen', provided_by: 'Valley Fire Systems' },

  // === Certificates ===
  { id: '11', title: 'ServSafe Manager Certificate - Mike Johnson', category: 'Certificate', expiration_date: d(540), created_at: d(-200), status: 'active', location: 'Downtown Kitchen' },
  { id: '12', title: 'ServSafe Manager Certificate - Sarah Chen', category: 'Certificate', expiration_date: d(380), created_at: d(-180), status: 'active', location: 'Airport Cafe' },
  { id: '13', title: 'Ansul System Certification', category: 'Certificate', expiration_date: d(-15), created_at: d(-380), status: 'active', location: 'Airport Cafe', provided_by: 'Valley Fire Systems' },

  // === Insurance ===
  { id: '14', title: 'General Liability Insurance', category: 'Insurance', expiration_date: d(250), created_at: d(-100), status: 'active', location: 'All Locations' },
  { id: '15', title: 'Vendor COI - Valley Fire Systems', category: 'Insurance', expiration_date: d(190), created_at: d(-60), status: 'active', location: 'All Locations', provided_by: 'Valley Fire Systems' },
  { id: '16', title: 'Vendor COI - GreenShield Pest Control', category: 'Insurance', expiration_date: d(8), created_at: d(-50), status: 'active', location: 'All Locations', provided_by: 'GreenShield Pest Control' },
  { id: '17', title: "Worker's Compensation Insurance", category: 'Insurance', expiration_date: d(300), created_at: d(-90), status: 'active', location: 'All Locations' },

  // === Training ===
  { id: '18', title: 'Food Handler Certificate - Emma Davis', category: 'Training', expiration_date: d(410), created_at: d(-150), status: 'active', location: 'Downtown Kitchen' },
  { id: '19', title: 'Food Handler Certificate - James Wilson', category: 'Training', expiration_date: d(25), created_at: d(-340), status: 'active', location: 'Airport Cafe' },
  { id: '20', title: 'Food Handler Certificate - Maria Garcia', category: 'Training', expiration_date: d(-10), created_at: d(-380), status: 'active', location: 'University Dining' },
  { id: '21', title: 'Food Handler Certificate - Tom Nguyen', category: 'Training', expiration_date: d(260), created_at: d(-100), status: 'active', location: 'Downtown Kitchen' },
  { id: '22', title: 'Allergen Awareness Training - All Staff', category: 'Training', expiration_date: d(180), created_at: d(-60), status: 'active', location: 'All Locations' },

  // === Other (service reports) ===
  { id: '23', title: 'Hood Cleaning Report - Q4 2025', category: 'Other', expiration_date: null, created_at: d(-45), status: 'active', location: 'Downtown Kitchen', provided_by: 'SparkClean Hoods' },
  { id: '24', title: 'Hood Cleaning Report - Q4 2025', category: 'Other', expiration_date: null, created_at: d(-40), status: 'active', location: 'Airport Cafe', provided_by: 'SparkClean Hoods' },
  { id: '25', title: 'Fire Extinguisher Inspection Tags', category: 'Other', expiration_date: d(330), created_at: d(-35), status: 'active', location: 'Downtown Kitchen', provided_by: 'Valley Fire Systems' },
  { id: '26', title: 'Grease Trap Service Record', category: 'Other', expiration_date: null, created_at: d(-20), status: 'active', location: 'Downtown Kitchen', provided_by: 'Pacific Grease Services' },
  { id: '27', title: 'Pest Control Report - Jan 2026', category: 'Other', expiration_date: null, created_at: d(-7), status: 'active', location: 'Downtown Kitchen', provided_by: 'GreenShield Pest Control' },
  { id: '28', title: 'Pest Control Report - Jan 2026', category: 'Other', expiration_date: null, created_at: d(-5), status: 'active', location: 'Airport Cafe', provided_by: 'GreenShield Pest Control' },
  { id: '29', title: 'HVAC Maintenance Record', category: 'Other', expiration_date: null, created_at: d(-25), status: 'active', location: 'Airport Cafe' },
  { id: '30', title: 'Fire Suppression System Inspection', category: 'Other', expiration_date: d(-45), created_at: d(-410), status: 'active', location: 'Airport Cafe', provided_by: 'Valley Fire Systems' },
];

const SHARED_ITEMS: SharedItem[] = [
  { id: '1', document: 'Health Department Permit', recipient: 'inspector@healthdept.gov', recipientType: 'Health Inspector', date: '2026-02-05', status: 'viewed' },
  { id: '2', document: 'General Liability Insurance', recipient: 'claims@insurance.com', recipientType: 'Insurance Company', date: '2026-02-03', status: 'downloaded' },
  { id: '3', document: 'Fire Safety Inspection Report', recipient: 'firemarshal@city.gov', recipientType: 'Fire Marshal', date: '2026-02-01', status: 'sent' },
];

const LOCATIONS = ['All Locations', 'Downtown Kitchen', 'Airport Cafe', 'University Dining'];

function getDocStatus(doc: Document): 'current' | 'expiring' | 'expired' {
  if (!doc.expiration_date) return 'current';
  const daysUntil = differenceInDays(new Date(doc.expiration_date), new Date());
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 30) return 'expiring';
  return 'current';
}

function DocStatusBadge({ status }: { status: 'current' | 'expiring' | 'expired' }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    current: { bg: '#dcfce7', text: '#166534', label: 'Current' },
    expiring: { bg: '#fef9c3', text: '#854d0e', label: 'Expiring' },
    expired: { bg: '#fee2e2', text: '#991b1b', label: 'Expired' },
  };
  const s = styles[status];
  return (
    <span style={{ backgroundColor: s.bg, color: s.text, padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

export function Documents() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showScanAnimation, setShowScanAnimation] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'documents' | 'shared'>('documents');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All Locations');
  const [searchQuery, setSearchQuery] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState<'all' | 'expired' | 'expiring'>('all');

  const filteredDocuments = useMemo(() => {
    let filtered = documents;
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
  }, [documents, selectedCategory, selectedLocation, searchQuery, docStatusFilter]);

  // Documents filtered by location only (for category counts and summary)
  const locationFilteredDocs = useMemo(() => {
    if (selectedLocation === 'All Locations') return documents;
    return documents.filter(d => d.location === selectedLocation || d.location === 'All Locations');
  }, [documents, selectedLocation]);

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
  };

  useEffect(() => {
    if (profile?.organization_id) {
      setDemoMode(false);
      fetchDocuments();
    } else {
      setDemoMode(true);
      setTimeout(() => {
        setDocuments(SAMPLE_DOCUMENTS);
        setSharedItems(SHARED_ITEMS);
        setLoading(false);
      }, 500);
    }
  }, [profile]);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .order('created_at', { ascending: false });

    if (data) setDocuments(data);
    setLoading(false);
  };

  const handleShareDocument = (docTitle: string) => {
    setSelectedDocForShare(docTitle);
    setShowShareModal(true);
  };

  const handleShareMultiple = () => {
    setSelectedDocForShare(null);
    setShowShareModal(true);
  };

  const handleToggleDoc = (docId: string) => {
    if (selectedDocs.includes(docId)) {
      setSelectedDocs(selectedDocs.filter(id => id !== docId));
    } else {
      setSelectedDocs([...selectedDocs, docId]);
    }
  };

  const categories = ['License', 'Permit', 'Certificate', 'Insurance', 'Training', 'Other'];

  const getSharedStatusBadge = (status: string) => {
    switch (status) {
      case 'downloaded':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Downloaded</span>;
      case 'viewed':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Viewed</span>;
      case 'sent':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Sent</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Documents' }]} />
      <div className="space-y-6">
        {demoMode && <DemoModeBanner />}

        <div className="flex justify-between items-center">
          <p className="text-gray-600">Store and manage compliance documents</p>
          <div className="flex gap-2">
            {selectedDocs.length > 0 && activeTab === 'documents' && (
              <button
                onClick={handleShareMultiple}
                className="flex items-center space-x-2 px-4 py-2 text-white rounded-md shadow-sm transition-all"
                style={{ backgroundColor: '#1e4d6b' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#163a52'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1e4d6b'}
              >
                <Share2 className="h-5 w-5" />
                <span>Share {selectedDocs.length} Selected</span>
              </button>
            )}
            <button
              onClick={() => setShowScanAnimation(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-md hover:bg-[#2a6a8f] shadow-sm transition-all hover:scale-105"
            >
              <Plus className="h-5 w-5" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Documents</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e4d6b', textAlign: 'center' }}>{locationFilteredDocs.length}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Current</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#166534', textAlign: 'center' }}>{statusCounts.current}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Expiring Soon</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#854d0e', textAlign: 'center' }}>{statusCounts.expiring}</div>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Expired</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#991b1b', textAlign: 'center' }}>{statusCounts.expired}</div>
          </div>
        </div>

        {/* Expiring/Expired Alert Banner */}
        {(statusCounts.expiring > 0 || statusCounts.expired > 0) && (
          <div style={{ background: statusCounts.expired > 0 ? '#fef2f2' : '#fffbeb', border: `1px solid ${statusCounts.expired > 0 ? '#fecaca' : '#fde68a'}`, borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle style={{ width: '20px', height: '20px', color: statusCounts.expired > 0 ? '#dc2626' : '#d97706', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              {statusCounts.expired > 0 && (
                <strong
                  onClick={() => setDocStatusFilter(docStatusFilter === 'expired' ? 'all' : 'expired')}
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}
                >
                  {statusCounts.expired} document{statusCounts.expired > 1 ? 's' : ''} expired.{' '}
                </strong>
              )}
              {statusCounts.expiring > 0 && (
                <span
                  onClick={() => setDocStatusFilter(docStatusFilter === 'expiring' ? 'all' : 'expiring')}
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px' }}
                >
                  {statusCounts.expiring} document{statusCounts.expiring > 1 ? 's' : ''} expiring within 30 days.
                </span>
              )}
            </span>
          </div>
        )}

        {/* Active status filter indicator */}
        {docStatusFilter !== 'all' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Showing:</span>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600,
                backgroundColor: docStatusFilter === 'expired' ? '#fee2e2' : '#fef9c3',
                color: docStatusFilter === 'expired' ? '#991b1b' : '#854d0e',
              }}
            >
              {docStatusFilter === 'expired' ? 'Expired' : 'Expiring Soon'} documents
              <button onClick={() => setDocStatusFilter('all')} style={{ marginLeft: '2px', cursor: 'pointer', fontWeight: 'bold', background: 'none', border: 'none', color: 'inherit', fontSize: '14px', lineHeight: 1 }}>&times;</button>
            </span>
          </div>
        )}

        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'documents'
                ? 'border-[#d4af37] text-[#1e4d6b]'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            All Documents
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'shared'
                ? 'border-[#d4af37] text-[#1e4d6b]'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Shared ({sharedItems.length})
          </button>
        </div>

        {activeTab === 'documents' && (
          <>
            {/* Search bar + Location filter */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1e4d6b'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer' }}
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Category filter pills */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === 'All' ? 'bg-[#1e4d6b] text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All ({locationFilteredDocs.length})
              </button>
              {categories.map((cat) => {
                const count = locationFilteredDocs.filter(d => d.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                      selectedCategory === cat ? 'bg-[#1e4d6b] text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {cat} {count > 0 ? `(${count})` : ''}
                  </button>
                );
              })}
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-12">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={searchQuery ? 'No matching documents' : selectedCategory === 'All' ? 'No documents yet' : `No ${selectedCategory} documents`}
                  description={searchQuery
                    ? `No documents match "${searchQuery}". Try a different search term.`
                    : selectedCategory === 'All'
                    ? 'Upload your first compliance document to get started tracking licenses, permits, and certificates.'
                    : `No documents found in the "${selectedCategory}" category. Upload one or select a different filter.`}
                  action={{
                    label: 'Upload Document',
                    onClick: () => setShowScanAnimation(true),
                  }}
                />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
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
                            className="h-4 w-4 text-[#1e4d6b] focus:ring-[#1e4d6b] border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Document Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Uploaded
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expiration
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDocuments.map((doc) => {
                        const docStatus = getDocStatus(doc);
                        return (
                          <tr key={doc.id} className={selectedDocs.includes(doc.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedDocs.includes(doc.id)}
                                onChange={() => handleToggleDoc(doc.id)}
                                className="h-4 w-4 text-[#1e4d6b] focus:ring-[#1e4d6b] border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center">
                                <FileText className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                                  {doc.provided_by && (
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                      Provided by: <span style={{ color: '#1e4d6b', fontWeight: 500 }}>{doc.provided_by}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {doc.category}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                              {doc.location}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <DocStatusBadge status={docStatus} />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(doc.created_at), 'MMM d, yyyy')}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              {doc.expiration_date ? format(new Date(doc.expiration_date), 'MMM d, yyyy') : '—'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleShareDocument(doc.title)}
                                  style={{ color: '#1e4d6b' }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#163a52'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#1e4d6b'}
                                  title="Share document"
                                >
                                  <Share2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDownload(doc)}
                                  className="hover:opacity-70"
                                  style={{ color: '#1e4d6b' }}
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => alert(`"${doc.title}" deleted.`)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
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
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {sharedItems.length === 0 ? (
              <EmptyState
                icon={Share2}
                title="No shared documents"
                description="Documents you share with third parties will appear here with tracking information."
                action={{
                  label: 'Share a Document',
                  onClick: () => {
                    setActiveTab('documents');
                  },
                }}
              />
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Shared
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sharedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{item.document}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.recipient}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.recipientType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(item.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getSharedStatusBadge(item.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {showScanAnimation && (
          <DocumentScanAnimation onComplete={() => setShowScanAnimation(false)} />
        )}

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
    </>
  );
}
