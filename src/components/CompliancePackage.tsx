import { useState } from 'react';
import { Download, FileText, Shield, Building, CheckCircle, Loader, Share2, Mail, QrCode, Printer } from 'lucide-react';

interface PackageDocument {
  name: string;
  category: string;
  status: 'included' | 'missing' | 'expired';
  date?: string;
}

const packageDocuments: PackageDocument[] = [
  { name: 'Health Permit', category: 'Licenses', status: 'included', date: 'Exp: Dec 31, 2026' },
  { name: 'Business License', category: 'Licenses', status: 'included', date: 'Exp: Dec 31, 2026' },
  { name: 'Certificate of Insurance', category: 'Insurance', status: 'included', date: 'Exp: Jun 30, 2026' },
  { name: 'Food Handler Certifications (4)', category: 'Training', status: 'included', date: 'Various dates' },
  { name: 'Hood Cleaning Certificate', category: 'Fire Safety', status: 'included', date: 'Jan 15, 2026' },
  { name: 'Fire Suppression Inspection', category: 'Fire Safety', status: 'expired', date: 'Exp: Feb 10, 2026' },
  { name: 'Fire Extinguisher Tags', category: 'Fire Safety', status: 'included', date: 'Nov 2025' },
  { name: 'Pest Control Report', category: 'Vendor Services', status: 'included', date: 'Feb 1, 2026' },
  { name: 'Grease Trap Manifest', category: 'Vendor Services', status: 'included', date: 'Sep 20, 2025' },
  { name: 'HACCP Plan', category: 'Food Safety', status: 'included', date: 'Current' },
  { name: 'Temperature Log Summary', category: 'Food Safety', status: 'included', date: 'Last 30 days' },
  { name: 'Compliance Score Report', category: 'Summary', status: 'included', date: 'Generated now' },
];

type PackageType = 'inspection' | 'insurance' | 'landlord' | 'custom';

const packagePresets: Record<PackageType, { label: string; description: string; icon: typeof Shield; docs: string[] }> = {
  inspection: {
    label: 'Health Inspection Packet',
    description: 'Everything an inspector needs — permits, food handler certs, HACCP plan, temp logs, vendor docs',
    icon: Shield,
    docs: ['Health Permit', 'Business License', 'Food Handler Certifications (4)', 'HACCP Plan', 'Temperature Log Summary', 'Hood Cleaning Certificate', 'Fire Suppression Inspection', 'Fire Extinguisher Tags', 'Pest Control Report', 'Compliance Score Report'],
  },
  insurance: {
    label: 'Insurance / PSE Package',
    description: 'For insurance inspections and renewals — COI, fire safety docs, vendor certifications',
    icon: FileText,
    docs: ['Certificate of Insurance', 'Hood Cleaning Certificate', 'Fire Suppression Inspection', 'Fire Extinguisher Tags', 'Grease Trap Manifest', 'Business License', 'Compliance Score Report'],
  },
  landlord: {
    label: 'Landlord / Property Manager',
    description: 'Proof of compliance for lease requirements — permits, insurance, fire safety',
    icon: Building,
    docs: ['Health Permit', 'Business License', 'Certificate of Insurance', 'Hood Cleaning Certificate', 'Fire Suppression Inspection', 'Pest Control Report', 'Compliance Score Report'],
  },
  custom: {
    label: 'Custom Package',
    description: 'Select exactly which documents to include',
    icon: FileText,
    docs: [],
  },
};

export function CompliancePackage() {
  const [selectedType, setSelectedType] = useState<PackageType>('inspection');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>(packagePresets.inspection.docs);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleTypeChange = (type: PackageType) => {
    setSelectedType(type);
    setGenerated(false);
    if (type !== 'custom') {
      setSelectedDocs(packagePresets[type].docs);
    }
  };

  const toggleDoc = (docName: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docName) ? prev.filter((d) => d !== docName) : [...prev, docName]
    );
  };

  const generatePackage = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 2000);
  };

  const preset = packagePresets[selectedType];
  const includedDocs = packageDocuments.filter((d) => selectedDocs.includes(d.name));
  const missingCount = includedDocs.filter((d) => d.status === 'expired' || d.status === 'missing').length;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance Package Builder</h3>
      <p className="text-sm text-gray-500 mb-6">Generate a ready-to-share compliance package for inspectors, insurers, or landlords.</p>

      {/* Package type selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {(Object.keys(packagePresets) as PackageType[]).map((type) => {
          const p = packagePresets[type];
          const Icon = p.icon;
          return (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedType === type
                  ? 'border-[#1e4d6b] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className={`w-6 h-6 mb-2 ${selectedType === type ? 'text-[#1e4d6b]' : 'text-gray-400'}`} />
              <p className="text-sm font-semibold text-gray-900">{p.label}</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
            </button>
          );
        })}
      </div>

      {/* Document checklist */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Documents in Package</h4>
          <span className="text-sm text-gray-500">{includedDocs.length} documents</span>
        </div>
        {missingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-4 text-sm text-amber-800">
            ⚠ {missingCount} document(s) are expired or missing — package will note these gaps
          </div>
        )}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {packageDocuments.map((doc) => {
            const isSelected = selectedDocs.includes(doc.name);
            return (
              <label
                key={doc.name}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected ? 'border-[#1e4d6b] bg-blue-50/50' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDoc(doc.name)}
                    className="w-4 h-4 text-[#1e4d6b] rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{doc.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{doc.date}</span>
                  {doc.status === 'included' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {doc.status === 'expired' && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">EXPIRED</span>}
                  {doc.status === 'missing' && <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">MISSING</span>}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Generate / Download */}
      <div className="flex items-center gap-3">
        <button
          onClick={generatePackage}
          disabled={generating || includedDocs.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] transition-colors font-medium disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : generated ? (
            <>
              <Download className="w-5 h-5" />
              Download PDF
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Generate Package
            </>
          )}
        </button>
        {generated && (
          <>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-3 text-[#1e4d6b] border border-[#1e4d6b] rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              <Share2 className="w-4 h-4" />
              Share Link
            </button>
            <button className="flex items-center gap-2 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button className="flex items-center gap-2 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Printer className="w-4 h-4" />
              Print
            </button>
          </>
        )}
      </div>

      {generated && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Package ready — {preset.label}</p>
            <p className="text-xs text-green-600">{includedDocs.length} documents included • Generated Feb 6, 2026</p>
          </div>
        </div>
      )}
    </div>
  );
}
