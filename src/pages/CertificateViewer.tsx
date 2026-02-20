import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Award, Download, Eye, Search, Filter,
  CheckCircle2, AlertTriangle, XCircle, Clock, Printer,
  BookOpenCheck, Flame, Settings2, Brain, Globe,
} from 'lucide-react';
import {
  trainingCertificates, trainingCourses,
  type TrainingCertificate, type TrainingCategory,
} from '../data/demoData';

const CATEGORY_CONFIG: Record<TrainingCategory, { label: string; color: string; bg: string }> = {
  food_safety_handler: { label: 'Food Handler', color: '#15803d', bg: '#dcfce7' },
  food_safety_manager: { label: 'CFPM', color: '#1e4d6b', bg: '#e0f2fe' },
  fire_safety: { label: 'Fire Safety', color: '#dc2626', bg: '#fee2e2' },
  compliance_ops: { label: 'Compliance', color: '#d4af37', bg: '#fef3c7' },
  custom: { label: 'Custom', color: '#7c3aed', bg: '#ede9fe' },
};

function getExpirationStatus(expiresAt: string | null) {
  if (!expiresAt) return { label: 'No Expiry', color: '#6b7280', bg: '#f3f4f6', urgency: 0 };
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: 'Expired', color: '#dc2626', bg: '#fee2e2', urgency: 3 };
  if (days <= 30) return { label: `${days}d left`, color: '#dc2626', bg: '#fee2e2', urgency: 2 };
  if (days <= 90) return { label: `${days}d left`, color: '#92400e', bg: '#fef3c7', urgency: 1 };
  return { label: 'Valid', color: '#15803d', bg: '#dcfce7', urgency: 0 };
}

function CertificateCard({ cert, onView }: { cert: TrainingCertificate; onView: () => void }) {
  const status = getExpirationStatus(cert.expiresAt);
  const course = trainingCourses.find(c => c.id === cert.courseId);
  const cat = course ? CATEGORY_CONFIG[course.category] : null;

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
      {/* Gold Top Stripe */}
      <div style={{ height: 4, background: '#d4af37' }} />
      <div style={{ padding: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={22} color="#d4af37" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{cert.employeeName}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{cert.locationName}</div>
            </div>
          </div>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: status.bg, color: status.color }}>
            {status.label}
          </span>
        </div>

        {/* Course */}
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{cert.courseTitle}</div>
        {cat && (
          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: cat.bg, color: cat.color, marginBottom: 12 }}>
            {cat.label}
          </span>
        )}

        {/* Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13, color: '#6b7280' }}>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Certificate #</div>
            <code style={{ fontSize: 12, background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>{cert.certificateNumber}</code>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Score</div>
            <span style={{ fontWeight: 600, color: cert.scorePercent >= 80 ? '#15803d' : '#92400e' }}>{cert.scorePercent}%</span>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Issued</div>
            <span>{new Date(cert.issuedAt).toLocaleDateString()}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Expires</div>
            <span>{cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onView}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
            <Eye size={14} /> View
          </button>
          <button onClick={() => toast.success(`Downloaded ${cert.certificateNumber}`)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', minHeight: 48 }}>
            <Download size={16} color="#6b7280" />
          </button>
          <button onClick={() => toast.info(`Print ${cert.certificateNumber} — demo mode`)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', minHeight: 48 }}>
            <Printer size={16} color="#6b7280" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CertificateDetailModal({ cert, onClose }: { cert: TrainingCertificate; onClose: () => void }) {
  const course = trainingCourses.find(c => c.id === cert.courseId);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '95vw', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', padding: 0 }}
        onClick={e => e.stopPropagation()}>
        {/* Certificate Render */}
        <div style={{ padding: '24px 16px', textAlign: 'center', background: 'linear-gradient(180deg, #fffbeb 0%, #fff 40%)' }}>
          <div style={{ border: '3px solid #d4af37', borderRadius: 12, padding: '20px 16px', background: '#fff' }}>
            <Award size={48} color="#d4af37" style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e4d6b', margin: '0 0 4px' }}>Certificate of Completion</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>EvidLY Training & Certification Platform</p>

            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 4px' }}>This certifies that</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{cert.employeeName}</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>{cert.locationName}</p>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 4px' }}>has successfully completed</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#1e4d6b', margin: '0 0 4px' }}>{cert.courseTitle}</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>
              Score: {cert.scorePercent}% {course && `• ${course.moduleCount} modules • ${course.estimatedDurationMin} min`}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Certificate #</div>
                <code style={{ fontSize: 13, fontWeight: 600 }}>{cert.certificateNumber}</code>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Issued</div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{new Date(cert.issuedAt).toLocaleDateString()}</span>
              </div>
              {cert.expiresAt && (
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Valid Until</div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{new Date(cert.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Modal Actions */}
        <div style={{ padding: '16px 16px 24px', display: 'flex', gap: 12, justifyContent: 'center', borderTop: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
          <button onClick={() => toast.success(`Downloaded ${cert.certificateNumber}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
            <Download size={16} /> Download PDF
          </button>
          <button onClick={() => toast.info(`Print ${cert.certificateNumber} — demo mode`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
            <Printer size={16} /> Print
          </button>
          <button onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function CertificateViewer() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewCert, setViewCert] = useState<TrainingCertificate | null>(null);

  const filtered = trainingCertificates.filter(c => {
    if (typeFilter !== 'all' && c.certificateType !== typeFilter) return false;
    if (statusFilter === 'valid') { const s = getExpirationStatus(c.expiresAt); if (s.urgency > 0) return false; }
    if (statusFilter === 'expiring') { const s = getExpirationStatus(c.expiresAt); if (s.urgency !== 1 && s.urgency !== 2) return false; }
    if (statusFilter === 'expired') { const s = getExpirationStatus(c.expiresAt); if (s.urgency !== 3) return false; }
    if (search) {
      const q = search.toLowerCase();
      if (!c.employeeName.toLowerCase().includes(q) && !c.courseTitle.toLowerCase().includes(q) && !c.certificateNumber.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: trainingCertificates.length,
    valid: trainingCertificates.filter(c => getExpirationStatus(c.expiresAt).urgency === 0).length,
    expiring: trainingCertificates.filter(c => { const u = getExpirationStatus(c.expiresAt).urgency; return u === 1 || u === 2; }).length,
    expired: trainingCertificates.filter(c => getExpirationStatus(c.expiresAt).urgency === 3).length,
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <button onClick={() => navigate('/training')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#1e4d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
        <ArrowLeft size={16} /> Back to Training
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Certificate Manager</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>View, download, and manage all training certificates</p>
        </div>
        <button onClick={() => toast.info('Bulk download — demo mode')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: '#1e4d6b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 48 }}>
          <Download size={16} /> Bulk Download
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Certificates', value: stats.total, icon: Award, color: '#1e4d6b' },
          { label: 'Valid', value: stats.valid, icon: CheckCircle2, color: '#15803d' },
          { label: 'Expiring Soon', value: stats.expiring, icon: AlertTriangle, color: '#92400e' },
          { label: 'Expired', value: stats.expired, icon: XCircle, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <s.icon size={16} color={s.color} />
              <span style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</span>
            </div>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 12, color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, course, or certificate number..."
            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} color="#6b7280" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <option value="all">All Types</option>
            <option value="food_handler">Food Handler</option>
            <option value="food_manager_prep">CFPM</option>
            <option value="fire_safety">Fire Safety</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
          <option value="all">All Statuses</option>
          <option value="valid">Valid</option>
          <option value="expiring">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Certificate Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 16 }}>
        {filtered.map(cert => (
          <CertificateCard key={cert.id} cert={cert} onView={() => setViewCert(cert)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
          <Award size={40} style={{ marginBottom: 8 }} />
          <p>No certificates match your filters</p>
        </div>
      )}

      {/* Certificate Detail Modal */}
      {viewCert && <CertificateDetailModal cert={viewCert} onClose={() => setViewCert(null)} />}
    </div>
  );
}
