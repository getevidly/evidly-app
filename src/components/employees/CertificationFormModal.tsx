import { useState } from 'react';
import { X, Save, Upload } from 'lucide-react';
import { CERT_TYPES, type EmployeeCert } from '../../data/employeesDemoData';

const NAVY = '#1E2D4D';

interface CertificationFormModalProps {
  existing?: EmployeeCert | null;
  onClose: () => void;
  onSave: (data: { certType: string; certName: string; certNumber: string; issuedDate: string; expiryDate: string }) => void;
}

export function CertificationFormModal({ existing, onClose, onSave }: CertificationFormModalProps) {
  const [certType, setCertType] = useState(existing?.certType || CERT_TYPES[0]);
  const [certName, setCertName] = useState(existing?.certName || '');
  const [certNumber, setCertNumber] = useState(existing?.certNumber || '');
  const [issuedDate, setIssuedDate] = useState(existing?.issuedDate || '');
  const [expiryDate, setExpiryDate] = useState(existing?.expiryDate || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!certName.trim()) e.certName = 'Required';
    if (!certNumber.trim()) e.certNumber = 'Required';
    if (!issuedDate) e.issuedDate = 'Required';
    if (!expiryDate) e.expiryDate = 'Required';
    else if (expiryDate < issuedDate) e.expiryDate = 'Must be after issued date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({ certType, certName: certName.trim(), certNumber: certNumber.trim(), issuedDate, expiryDate });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop-enter">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: '#D1D9E6' }}>
          <h3 className="text-lg font-semibold tracking-tight" style={{ color: '#0B1628' }}>{existing ? 'Edit Certification' : 'Add Certification'}</h3>
          <button onClick={onClose} className="p-2.5 -m-1 rounded-lg hover:bg-[#1E2D4D]/5" aria-label="Close"><X className="w-5 h-5" style={{ color: '#6B7F96' }} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Certification Type</label>
            <select value={certType} onChange={e => setCertType(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>
              {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Certification Name <span className="text-red-500">*</span></label>
            <input value={certName} onChange={e => setCertName(e.target.value)} placeholder="e.g. IKECA Master Technician" className="w-full px-3 py-2 border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]" style={{ borderColor: errors.certName ? '#dc2626' : '#D1D9E6', color: '#0B1628' }} />
            {errors.certName && <p className="text-xs mt-1 text-red-500">{errors.certName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Certification Number <span className="text-red-500">*</span></label>
            <input value={certNumber} onChange={e => setCertNumber(e.target.value)} placeholder="e.g. IK-2024-0891" className="w-full px-3 py-2 border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]" style={{ borderColor: errors.certNumber ? '#dc2626' : '#D1D9E6', color: '#0B1628' }} />
            {errors.certNumber && <p className="text-xs mt-1 text-red-500">{errors.certNumber}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Issued Date <span className="text-red-500">*</span></label>
              <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]" style={{ borderColor: errors.issuedDate ? '#dc2626' : '#D1D9E6', color: '#0B1628' }} />
              {errors.issuedDate && <p className="text-xs mt-1 text-red-500">{errors.issuedDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Expiry Date <span className="text-red-500">*</span></label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus:ring-[#A08C5A]" style={{ borderColor: errors.expiryDate ? '#dc2626' : '#D1D9E6', color: '#0B1628' }} />
              {errors.expiryDate && <p className="text-xs mt-1 text-red-500">{errors.expiryDate}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Upload Document</label>
            <button onClick={() => alert('Document upload available in the live app.')} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed hover:bg-[#FAF7F0] transition-colors" style={{ borderColor: '#D1D9E6', color: '#6B7F96' }}>
              <Upload className="w-4 h-4" />
              <span className="text-sm">Upload PDF or image</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#D1D9E6' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-xl border hover:bg-[#FAF7F0]" style={{ borderColor: '#D1D9E6', color: '#3D5068' }}>Cancel</button>
          <button onClick={handleSubmit} className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-[#1E2D4D] hover:bg-[#162340] transition-colors min-h-[44px]">
            <Save className="w-4 h-4" /> {existing ? 'Update' : 'Add'} Certification
          </button>
        </div>
      </div>
    </div>
  );
}
