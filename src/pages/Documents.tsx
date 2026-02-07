import { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Plus, FileText, Download, Trash2, Share2, CheckSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
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
}

interface SharedItem {
  id: string;
  document: string;
  recipient: string;
  recipientType: string;
  date: string;
  status: 'sent' | 'viewed' | 'downloaded';
}

const SAMPLE_DOCUMENTS: Document[] = [
  {
    id: '1',
    title: 'Food Service License',
    category: 'License',
    expiration_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
  {
    id: '2',
    title: 'Health Permit 2024',
    category: 'Permit',
    expiration_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 280 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
  {
    id: '3',
    title: 'ServSafe Manager Certificate',
    category: 'Certificate',
    expiration_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
  {
    id: '4',
    title: 'General Liability Insurance',
    category: 'Insurance',
    expiration_date: new Date(Date.now() + 250 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
  {
    id: '5',
    title: 'Fire Safety Inspection Report',
    category: 'Permit',
    expiration_date: null,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
];

const SHARED_ITEMS: SharedItem[] = [
  {
    id: '1',
    document: 'Health Permit 2024',
    recipient: 'inspector@healthdept.gov',
    recipientType: 'Health Inspector',
    date: '2026-02-05',
    status: 'viewed',
  },
  {
    id: '2',
    document: 'General Liability Insurance',
    recipient: 'claims@insurance.com',
    recipientType: 'Insurance Company',
    date: '2026-02-03',
    status: 'downloaded',
  },
  {
    id: '3',
    document: 'Fire Safety Inspection Report',
    recipient: 'firemarshal@city.gov',
    recipientType: 'Fire Marshal',
    date: '2026-02-01',
    status: 'sent',
  },
];

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

  const filteredDocuments = selectedCategory === 'All'
    ? documents
    : documents.filter(d => d.category === selectedCategory);

  const handleDownload = (doc: Document) => {
    // In production: fetch from Supabase Storage and trigger browser download
    // In demo mode: create a placeholder download
    const blob = new Blob(
      [`EvidLY Compliance Document\n\nDocument: ${doc.title}\nCategory: ${doc.category}\nStatus: ${doc.status}\nExpiration: ${doc.expiration_date || 'N/A'}\n\nThis is a demo placeholder. In production, the actual file from Supabase Storage would download.`],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  const getStatusBadge = (status: string) => {
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
    <Layout title="Documents">
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
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === 'All' ? 'bg-[#1b4965] text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All ({documents.length})
              </button>
              {categories.map((cat) => {
                const count = documents.filter(d => d.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                      selectedCategory === cat ? 'bg-[#1b4965] text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
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
                  title={selectedCategory === 'All' ? 'No documents yet' : `No ${selectedCategory} documents`}
                  description={selectedCategory === 'All'
                    ? 'Upload your first compliance document to get started tracking licenses, permits, and certificates.'
                    : `No documents found in the "${selectedCategory}" category. Upload one or select a different filter.`}
                  action={{
                    label: 'Upload Document',
                    onClick: () => setShowScanAnimation(true),
                  }}
                />
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedDocs.length === documents.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocs(documents.map(d => d.id));
                            } else {
                              setSelectedDocs([]);
                            }
                          }}
                          className="h-4 w-4 text-[#1e4d6b] focus:ring-[#1e4d6b] border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Uploaded
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className={selectedDocs.includes(doc.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedDocs.includes(doc.id)}
                            onChange={() => handleToggleDoc(doc.id)}
                            className="h-4 w-4 text-[#1e4d6b] focus:ring-[#1e4d6b] border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">{doc.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {doc.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(doc.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.expiration_date ? format(new Date(doc.expiration_date), 'MMM d, yyyy') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                              className="text-blue-600 hover:text-blue-800"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-800" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                        {getStatusBadge(item.status)}
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
    </Layout>
  );
}
