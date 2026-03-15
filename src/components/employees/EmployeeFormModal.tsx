import { useState } from 'react';
import { X, Save, Upload } from 'lucide-react';
import { SERVICE_TYPES, type Employee, type EmployeeRole, type EmployeeStatus } from '../../data/employeesDemoData';

const NAVY = '#1e4d6b';
const ROLES: { value: EmployeeRole; label: string }[] = [
  { value: 'technician', label: 'Technician' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'office', label: 'Office' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
];
const STATUSES: { value: EmployeeStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
];

interface EmployeeFormModalProps {
  employee: Employee;
  onClose: () => void;
  onSave: (updates: Partial<Employee>) => void;
  isAdmin: boolean;
}

export function EmployeeFormModal({ employee, onClose, onSave, isAdmin }: EmployeeFormModalProps) {
  const [firstName, setFirstName] = useState(employee.firstName);
  const [lastName, setLastName] = useState(employee.lastName);
  const [phone, setPhone] = useState(employee.phone);
  const [role, setRole] = useState<EmployeeRole>(employee.role);
  const [status, setStatus] = useState<EmployeeStatus>(employee.status);
  const [hourlyRate, setHourlyRate] = useState(String(employee.hourlyRate));
  const [serviceTypes, setServiceTypes] = useState<string[]>([...employee.serviceTypes]);

  const toggleService = (s: string) => {
    setServiceTypes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSave = () => {
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      phone: phone.trim(),
      role,
      status,
      hourlyRate: parseFloat(hourlyRate) || 0,
      serviceTypes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl shadow-xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: '#D1D9E6' }}>
          <h3 className="text-lg font-semibold" style={{ color: '#0B1628' }}>Edit Employee</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" style={{ color: '#6B7F96' }} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Photo upload stub */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: '#EEF1F7', color: NAVY }}>
              {employee.firstName[0]}{employee.lastName[0]}
            </div>
            <button onClick={() => alert('Photo upload available in the live app.')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-gray-50" style={{ borderColor: '#D1D9E6', color: '#3D5068' }}>
              <Upload className="w-3.5 h-3.5" /> Upload Photo
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>First Name</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Email</label>
            <input value={employee.email} disabled className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 cursor-not-allowed" style={{ borderColor: '#D1D9E6', color: '#6B7F96' }} />
            <p className="text-xs mt-1" style={{ color: '#6B7F96' }}>Email cannot be changed after creation</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
          </div>

          {isAdmin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Role</label>
                <select value={role} onChange={e => setRole(e.target.value as EmployeeRole)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as EmployeeStatus)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#0B1628' }}>Hourly Rate</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B7F96' }}>$</span>
                <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" style={{ borderColor: '#D1D9E6', color: '#0B1628' }} />
              </div>
            </div>
          )}

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
          <button onClick={handleSave} className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg text-white hover:opacity-90" style={{ backgroundColor: NAVY }}>
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
