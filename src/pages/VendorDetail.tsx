import { useState } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, CheckCircle, XCircle, AlertTriangle, Download, Upload, Send } from 'lucide-react';
import { vendors } from '../data/demoData';
import { Breadcrumb } from '../components/Breadcrumb';
import { VendorContactActions } from '../components/VendorContactActions';
import { useDemoGuard } from '../hooks/useDemoGuard';
import { DemoUpgradePrompt } from '../components/DemoUpgradePrompt';

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
  const { guardAction, showUpgrade, setShowUpgrade, upgradeAction, upgradeFeature } = useDemoGuard();

  const vendor = vendors.find(v => v.id === vendorId);
  const documents = DEMO_DOCUMENTS[vendorId || ''] || [];

  if (!vendor) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Vendor not found</p>
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
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />On File</span>;
      case 'missing':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Missing</span>;
      case 'expiring':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Expiring</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Expired</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vendors', href: '/vendors' }, { label: vendor.companyName }]} />
          <button
            onClick={() => navigate('/vendors')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 min-h-[44px]"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to All Vendors
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{vendor.companyName}</h1>
              <p className="mt-1 text-sm text-gray-500">{vendor.serviceType}</p>
            </div>
            <div className="mt-4 md:mt-0">
              {vendor.status === 'overdue' && (
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800">Overdue</span>
              )}
              {vendor.status === 'current' && (
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">Current</span>
              )}
              {vendor.status === 'upcoming' && (
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">Due Soon</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'documents', 'history', 'contact'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm min-h-[44px] ${
                  activeTab === tab
                    ? 'border-[#1e4d6b] text-[#1e4d6b]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
              <div className="space-y-3">
                <div className="flex items-center text-gray-700">
                  <Phone className="h-5 w-5 mr-3 text-gray-400" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Mail className="h-5 w-5 mr-3 text-gray-400" />
                  <span>{vendor.email}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <MapPin className="h-5 w-5 mr-3 text-gray-400" />
                  <span>{vendor.contactName}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-4">Service Schedule</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Service:</span>
                  <span className="font-medium">{vendor.lastService}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Next Due:</span>
                  <span className="font-medium">{vendor.nextDue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Documents:</span>
                  <span className="font-medium">{onFileDocs} of {requiredDocs.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Required Documents</h2>
                  <p className="text-sm text-gray-600 mt-1">{onFileDocs} of {requiredDocs.length} required documents on file</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  <button
                    onClick={() => setShowRequestModal(true)}
                    className="flex items-center px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] min-h-[44px]"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Request Document
                  </button>
                  <button
                    onClick={() => guardAction('upload', 'Vendor Documents', () => toast.info('Upload'))}
                    className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 min-h-[44px]"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </button>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="space-y-4">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3 flex-1">
                      <FileText className="h-5 w-5 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {getStatusBadge(doc.status)}
                          {doc.expirationDate && (
                            <span className="text-xs text-gray-500">Exp: {doc.expirationDate}</span>
                          )}
                          {doc.uploadDate && (
                            <span className="text-xs text-gray-500">Uploaded: {doc.uploadDate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {doc.status === 'on-file' && (
                      <button
                        onClick={() => guardAction('download', 'Vendor Documents', () => toast.info('Downloading ' + doc.name))}
                        className="flex items-center mt-2 md:mt-0 min-h-[44px] px-2 hover:opacity-70"
                        style={{ color: '#1e4d6b' }}
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Service History</h2>
            <div className="space-y-6">
              <div className="border-l-2 border-gray-300 pl-4 pb-4">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="font-medium">{vendor.lastService}</span>
                </div>
                <p className="text-gray-600">Regular service completed by {vendor.contactName}</p>
                <p className="text-sm text-gray-500 mt-1">All systems checked and operational</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Contact {vendor.contactName}</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <p className="mt-1 text-gray-900">{vendor.companyName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                <p className="mt-1 text-gray-900">{vendor.contactName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{vendor.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-gray-900">{vendor.phone}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Quick Actions</p>
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
          <div className="bg-white rounded-xl p-4 sm:p-6 w-[95vw] sm:w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Request Document</h3>
            <p className="text-gray-600 mb-4">
              An email will be sent to {vendor.email} requesting the missing documents with a secure upload link.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => guardAction('send', 'Vendor Documents', () => {
                  setShowRequestModal(false);
                  toast.success('Document request sent');
                })}
                className="px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] min-h-[44px]"
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
