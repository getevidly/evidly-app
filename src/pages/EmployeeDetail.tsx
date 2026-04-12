import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, MoreHorizontal, UserX, Send, Trash2, User, Award, Clock, BarChart3 } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import {
  DEMO_EMPLOYEES,
  type Employee,
  type EmployeeCert,
  getInitials,
  ROLE_CONFIG,
  STATUS_CONFIG,
} from '../data/employeesDemoData';
import { RoleBadge } from '../components/employees/RoleBadge';
import { ClockStatus } from '../components/employees/ClockStatus';
import { EmployeeOverview } from '../components/employees/EmployeeOverview';
import { EmployeeCertifications } from '../components/employees/EmployeeCertifications';
import { EmployeeTimecards } from '../components/employees/EmployeeTimecards';
import { EmployeePerformance } from '../components/employees/EmployeePerformance';
import { EmployeeFormModal } from '../components/employees/EmployeeFormModal';
import { CertificationFormModal } from '../components/employees/CertificationFormModal';

const NAVY = '#1E2D4D';
const F: React.CSSProperties = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

type Tab = 'overview' | 'certifications' | 'timecards' | 'performance';

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useRole();
  const isAdmin = ['owner_operator', 'platform_admin', 'executive'].includes(userRole);

  const [employees, setEmployees] = useState<Employee[]>(() => [...DEMO_EMPLOYEES]);
  const employee = useMemo(() => employees.find(e => e.id === id), [employees, id]);

  const [tab, setTab] = useState<Tab>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [editingCert, setEditingCert] = useState<EmployeeCert | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!employee) {
    return (
      <div className="p-6 text-center" style={F}>
        <p className="text-sm" style={{ color: '#6B7F96' }}>Employee not found</p>
        <button onClick={() => navigate('/employees')} className="mt-3 text-sm font-medium" style={{ color: NAVY }}>Back to Employees</button>
      </div>
    );
  }

  const statCfg = STATUS_CONFIG[employee.status];

  const handleSaveEmployee = (updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, ...updates } : e));
    setShowEditModal(false);
  };

  const handleAddCert = () => { setEditingCert(null); setShowCertModal(true); };
  const handleEditCert = (cert: EmployeeCert) => { setEditingCert(cert); setShowCertModal(true); };
  const handleDeleteCert = (certId: string) => {
    setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, certifications: e.certifications.filter(c => c.id !== certId) } : e));
  };
  const handleSaveCert = (data: { certType: string; certName: string; certNumber: string; issuedDate: string; expiryDate: string }) => {
    const now = new Date();
    const exp = new Date(data.expiryDate + 'T00:00:00');
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const status = diff < 0 ? 'expired' as const : diff <= 30 ? 'expiring' as const : 'active' as const;

    if (editingCert) {
      setEmployees(prev => prev.map(e => e.id === employee.id ? {
        ...e,
        certifications: e.certifications.map(c => c.id === editingCert.id ? { ...c, ...data, status, documentUrl: c.documentUrl } : c),
      } : e));
    } else {
      const newCert: EmployeeCert = {
        id: `cert-new-${Date.now()}`,
        employeeId: employee.id,
        ...data,
        status,
        documentUrl: null,
      };
      setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, certifications: [...e.certifications, newCert] } : e));
    }
    setShowCertModal(false);
    setEditingCert(null);
  };

  const handleResendInvite = () => alert(`Invite resent to ${employee.email}`);
  const handleDeactivate = () => {
    setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, status: 'inactive' as const } : e));
    setShowMoreMenu(false);
  };
  const handleDelete = () => {
    alert('Employee deleted.');
    navigate('/employees');
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { key: 'certifications', label: 'Certifications', icon: <Award className="w-4 h-4" /> },
    { key: 'timecards', label: 'Timecards', icon: <Clock className="w-4 h-4" /> },
    { key: 'performance', label: 'Performance', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-[1200px] mx-auto" style={F}>
      {/* Back */}
      <button onClick={() => navigate('/employees')} className="flex items-center gap-1.5 text-sm font-medium mb-4 hover:underline" style={{ color: NAVY }}>
        <ArrowLeft className="w-4 h-4" /> Employees
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ backgroundColor: ROLE_CONFIG[employee.role].bg, color: ROLE_CONFIG[employee.role].color }}>
            {getInitials(employee.name)}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#0B1628' }}>{employee.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={employee.role} />
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: statCfg.color, backgroundColor: statCfg.bg }}>{statCfg.label}</span>
              <ClockStatus state={employee.clockState} since={employee.clockSince} jobLocation={employee.jobLocation} />
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 relative">
            <button onClick={() => setShowEditModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border hover:bg-gray-50" style={{ borderColor: '#D1D9E6', color: '#3D5068' }}>
              <Pencil className="w-4 h-4" /> Edit
            </button>
            <div className="relative">
              <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-1.5 rounded-lg border hover:bg-gray-50" style={{ borderColor: '#D1D9E6' }}>
                <MoreHorizontal className="w-4 h-4" style={{ color: '#6B7F96' }} />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border shadow-lg z-20" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}>
                  {employee.status === 'active' && (
                    <button onClick={handleDeactivate} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50" style={{ color: '#d97706' }}>
                      <UserX className="w-4 h-4" /> Deactivate
                    </button>
                  )}
                  {employee.status === 'pending' && (
                    <button onClick={() => { handleResendInvite(); setShowMoreMenu(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50" style={{ color: '#1E2D4D' }}>
                      <Send className="w-4 h-4" /> Resend Invite
                    </button>
                  )}
                  <button onClick={handleDelete} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50" style={{ color: '#dc2626' }}>
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: '#D1D9E6' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors -mb-px whitespace-nowrap" style={{ color: tab === t.key ? NAVY : '#6B7F96', borderBottom: tab === t.key ? `2px solid ${NAVY}` : '2px solid transparent' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <EmployeeOverview employee={employee} isAdmin={isAdmin} onResendInvite={handleResendInvite} />}
      {tab === 'certifications' && <EmployeeCertifications certifications={employee.certifications} onAdd={handleAddCert} onEdit={handleEditCert} onDelete={handleDeleteCert} canEdit={isAdmin} />}
      {tab === 'timecards' && <EmployeeTimecards employeeId={employee.id} />}
      {tab === 'performance' && <EmployeePerformance performance={employee.performance} name={employee.name} />}

      {/* Edit Modal */}
      {showEditModal && <EmployeeFormModal employee={employee} onClose={() => setShowEditModal(false)} onSave={handleSaveEmployee} isAdmin={isAdmin} />}

      {/* Cert Modal */}
      {showCertModal && <CertificationFormModal existing={editingCert} onClose={() => { setShowCertModal(false); setEditingCert(null); }} onSave={handleSaveCert} />}
    </div>
  );
}
