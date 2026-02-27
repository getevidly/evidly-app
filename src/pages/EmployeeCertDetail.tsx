import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, AlertTriangle, CheckCircle2, XCircle, Clock, Upload, GraduationCap, Flame } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import { toast } from 'sonner';
import { Breadcrumb } from '../components/Breadcrumb';
import { useDemo } from '../contexts/DemoContext';
import {
  trainingCertificates, trainingEnrollments, trainingRecords,
  certificationRequirements, trainingQuizAttempts,
} from '../data/demoData';

const NAVY = '#1e4d6b';
const F: React.CSSProperties = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

// Demo employee lookup (mirrors Team.tsx DEMO_MEMBERS)
const DEMO_EMPLOYEES = [
  { id: '1', name: 'Marcus Johnson', role: 'Admin', appRole: 'owner_operator', locationId: '1', locationName: 'Downtown Kitchen', hireDate: '2024-01-15', certs: [ // demo
    { type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-4481', issued: '2025-06-15', expires: '2028-06-15', status: 'active' },
    { type: 'cfpm', name: 'ServSafe Manager Certification', number: 'SM-2025-7721', issued: '2025-03-10', expires: '2030-03-10', status: 'active' },
    { type: 'haccp_training', name: 'HACCP Principles Training', number: 'HACCP-2025-102', issued: '2025-05-20', expires: null, status: 'active' },
    { type: 'fire_extinguisher_training', name: 'Fire Extinguisher Training', number: null, issued: '2025-11-15', expires: '2026-11-15', status: 'active' },
  ]},
  { id: '2', name: 'Sarah Chen', role: 'Manager', appRole: 'kitchen_manager', locationId: '1', locationName: 'Downtown Kitchen', hireDate: '2024-03-01', certs: [ // demo
    { type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-5502', issued: '2025-08-20', expires: '2028-08-20', status: 'active' },
    { type: 'cfpm', name: 'ServSafe Manager Certification', number: 'SM-2025-8832', issued: '2025-04-05', expires: '2026-03-15', status: 'expiring_soon' },
  ]},
  { id: '3', name: 'Maria Garcia', role: 'Manager', appRole: 'kitchen_manager', locationId: '2', locationName: 'Airport Cafe', hireDate: '2024-06-10', certs: [ // demo
    { type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-3390', issued: '2025-09-01', expires: '2028-09-01', status: 'active' },
    { type: 'cfpm', name: 'ServSafe Manager Certification', number: 'SM-2025-6643', issued: '2025-07-20', expires: '2030-07-20', status: 'active' },
  ]},
  { id: '4', name: 'David Park', role: 'Staff', appRole: 'kitchen_staff', locationId: '2', locationName: 'Airport Cafe', hireDate: '2024-04-02', certs: [ // demo
    { type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2024-2201', issued: '2024-04-02', expires: '2027-04-02', status: 'active' },
  ]},
  { id: '5', name: 'Michael Torres', role: 'Staff', appRole: 'kitchen_staff', locationId: '2', locationName: 'Airport Cafe', hireDate: '2023-02-26', certs: [ // demo
    { type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2023-1188', issued: '2023-02-26', expires: '2026-02-26', status: 'expiring_soon' },
  ]},
  { id: '6', name: 'Emma Rodriguez', role: 'Staff', appRole: 'kitchen_staff', locationId: '1', locationName: 'Downtown Kitchen', hireDate: '2025-07-10', certs: [ // demo
    { type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-9912', issued: '2025-07-10', expires: '2028-07-10', status: 'active' },
    { type: 'allergen_awareness', name: 'Allergen Awareness Training', number: 'AA-2025-445', issued: '2025-07-12', expires: '2027-07-12', status: 'active' },
  ]},
  { id: '7', name: 'Alex Thompson', role: 'Staff', appRole: 'kitchen_staff', locationId: '3', locationName: 'University Dining', hireDate: '2024-12-10', certs: [ // demo
    { type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2024-8834', issued: '2024-12-10', expires: '2027-12-10', status: 'active' },
  ]},
  { id: '8', name: 'Lisa Wang', role: 'Staff', appRole: 'kitchen_staff', locationId: '3', locationName: 'University Dining', hireDate: '2025-01-25', certs: [ // demo
    { type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-1105', issued: '2025-01-25', expires: '2028-01-25', status: 'active' },
  ]},
  { id: '9', name: 'James Wilson', role: 'Staff', appRole: 'kitchen_staff', locationId: '3', locationName: 'University Dining', hireDate: '2025-02-05', certs: [ // demo
    { type: 'food_handler', name: 'California Food Handler Card', number: 'FH-2025-2206', issued: '2025-02-05', expires: '2028-02-05', status: 'active' },
  ]},
];

function getCertIcon(type: string) {
  if (type.includes('fire') || type.includes('hood')) return <Flame size={16} color="#dc2626" />;
  if (type.includes('cfpm') || type.includes('haccp')) return <EvidlyIcon size={16} />;
  return <Award size={16} color="#15803d" />;
}

export function EmployeeCertDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();

  const employees = isDemoMode ? DEMO_EMPLOYEES : [];
  const employee = employees.find(e => e.id === userId);

  if (!employee) {
    return (
      <div style={F}>
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Training', href: '/training' }, { label: 'Employee' }]} />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <GraduationCap size={48} color="#d1d5db" />
          <p style={{ color: '#6b7280', marginTop: 16 }}>Employee not found</p>
          <button onClick={() => navigate('/training')} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: `1px solid ${NAVY}`, background: NAVY, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Back to Training
          </button>
        </div>
      </div>
    );
  }

  // Required certs for this employee's role
  const requiredReqs = certificationRequirements.filter(r => r.required && r.requiredForRoles.includes(employee.appRole));
  const heldCertTypes = new Set(employee.certs.map(c => c.type));
  const missingReqs = requiredReqs.filter(r => !heldCertTypes.has(r.certType));
  const isFullyCompliant = missingReqs.length === 0;

  // Training enrollments for this employee
  const enrollments = trainingEnrollments.filter(e => e.employeeName.includes(employee.name.split(' ')[1]) || e.employeeName.includes(employee.name.split(' ')[0]));
  const quizAttempts = trainingQuizAttempts.filter(q => q.employeeName.includes(employee.name.split(' ')[1]) || q.employeeName.includes(employee.name.split(' ')[0]));

  return (
    <div style={F}>
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Training', href: '/training' }, { label: employee.name }]} />

      {/* Back + Header */}
      <button onClick={() => navigate('/training')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
        <ArrowLeft size={16} /> Back to Training
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{employee.name}</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>{employee.role} · {employee.locationName} · Hired {employee.hireDate}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: isFullyCompliant ? '#dcfce7' : '#fee2e2',
            color: isFullyCompliant ? '#15803d' : '#dc2626',
          }}>
            {isFullyCompliant ? 'Fully Compliant' : `${missingReqs.length} Missing`}
          </span>
          <button onClick={() => toast.info('Certificate upload available in full version')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: NAVY, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <Upload size={14} /> Upload Certificate
          </button>
        </div>
      </div>

      {/* Certifications */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Certifications ({employee.certs.length})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {employee.certs.map((cert, i) => {
            const daysLeft = cert.expires ? Math.ceil((new Date(cert.expires).getTime() - Date.now()) / 86400000) : null;
            const isExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 90;
            const isExpired = daysLeft !== null && daysLeft < 0;
            return (
              <div key={i} style={{ background: '#fff', border: `1px solid ${isExpired ? '#fca5a5' : isExpiring ? '#fcd34d' : '#e5e7eb'}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {getCertIcon(cert.type)}
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{cert.name}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: '#6b7280' }}>
                  {cert.number && <div>Cert #: <span style={{ color: '#374151', fontWeight: 500 }}>{cert.number}</span></div>}
                  <div>Issued: <span style={{ color: '#374151', fontWeight: 500 }}>{cert.issued}</span></div>
                  <div>Expires: <span style={{ color: isExpired ? '#dc2626' : isExpiring ? '#92400e' : '#374151', fontWeight: 500 }}>{cert.expires || 'No expiry'}</span></div>
                  <div>
                    {isExpired ? (
                      <span style={{ padding: '1px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626' }}>Expired</span>
                    ) : isExpiring ? (
                      <span style={{ padding: '1px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>{daysLeft}d left</span>
                    ) : (
                      <span style={{ padding: '1px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>Active</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Missing Requirements */}
      {missingReqs.length > 0 && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={18} color="#92400e" />
            <span style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>Missing Required Certifications</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {missingReqs.map(req => (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <XCircle size={14} color="#dc2626" />
                <span style={{ fontWeight: 500, color: '#78350f' }}>{req.certName}</span>
                <span style={{ fontSize: 11, color: '#92400e' }}>({req.authority}{req.authoritySection ? ` ${req.authoritySection}` : ''})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training History */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Training History</h2>
        {enrollments.length > 0 ? (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Course</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Progress</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{e.courseTitle}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: e.status === 'completed' ? '#dcfce7' : e.status === 'in_progress' ? '#e0f2fe' : '#f3f4f6',
                        color: e.status === 'completed' ? '#15803d' : e.status === 'in_progress' ? '#0369a1' : '#6b7280',
                      }}>{e.status.replace('_', ' ')}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{e.progressPercent}%</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{e.scorePercent ? `${e.scorePercent}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24, textAlign: 'center' }}>
            <Clock size={24} color="#d1d5db" />
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>No training enrollments found for this employee</p>
          </div>
        )}
      </div>

      {/* Quiz History */}
      {quizAttempts.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Quiz Results</h2>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Module</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Attempt</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Score</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {quizAttempts.map(q => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{q.moduleTitle || 'Final Exam'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>#{q.attemptNumber}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{q.scorePercent}%</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {q.passed ? <CheckCircle2 size={16} color="#15803d" /> : <XCircle size={16} color="#dc2626" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  );
}
