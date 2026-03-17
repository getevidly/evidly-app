import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { SERVICE_TYPES, type EmployeeRole } from '../../data/employeesDemoData';

const NAVY = '#1e4d6b';
const ROLES: { value: EmployeeRole; label: string }[] = [
  { value: 'technician', label: 'Technician' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'office', label: 'Office' },
  { value: 'admin', label: 'Admin' },
];

interface InviteEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (data: { firstName: string; lastName: string; email: string; phone: string; role: EmployeeRole; hourlyRate: number; serviceTypes: string[] }) => void;
}

export function InviteEmployeeModal({ open, onClose, onInvite }: InviteEmployeeModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<EmployeeRole>('technician');
  const [hourlyRate, setHourlyRate] = useState('');
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const toggleService = (s: string) => {
    setServiceTypes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Required';
    if (!lastName.trim()) e.lastName = 'Required';
    if (!email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onInvite({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim(), role, hourlyRate: parseFloat(hourlyRate) || 0, serviceTypes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: '#D1D9E6' }}>
          <h3 className="text-lg font-semibold" style={{ color: '#0B1628' }}>Invite Employee</h3>
          <button onClick={onClose} className="p-2.5 -m-1 rounded-lg hover:bg-gray-100" aria-label="Close"><X className="w-5 h-5" style={{ color: '#6B7F96' }} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>First Name <span className="text-red-500">*</span></label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: errors.firstName ? '#dc2626' : '#D1D9E6', color: '#0B1628' }} />
              {errors.firstName && <p className="text-xs mt-1 text-red-500">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Last Name <span className="text-red-500">*</span></label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: errors.lastName ? '#dc2626' : '#D1D9E6', color: '#0B1628' }} />
              {errors.lastName && <p className="text-xs mt-1 text-red-500">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Email <span className="text-red-500">*</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: errors.email ? '#dc2626' : '#D1D9E6', color: '#0B1628' }} />
            {errors.email && <p className="text-xs mt-1 text-red-500">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-0000" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value as EmployeeRole)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Hourly Rate</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B7F96' }}>$</span>
                <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="0.00" className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0B1628' }}>Service Types</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map(s => (
                <button key={s} onClick={() => toggleService(s)} className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors" style={{ borderColor: serviceTypes.includes(s) ? NAVY : '#D1D9E6', color: serviceTypes.includes(s) ? '#FFFFFF' : '#3D5068', backgroundColor: serviceTypes.includes(s) ? NAVY : '#FFFFFF' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#D1D9E6' }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50" style={{ borderColor: '#D1D9E6', color: '#3D5068' }}>Cancel</button>
          <button onClick={handleSubmit} className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg text-white hover:opacity-90" style={{ backgroundColor: NAVY }}>
            <Send className="w-4 h-4" /> Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}
