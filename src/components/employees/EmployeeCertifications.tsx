import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, FileText, AlertTriangle, Filter } from 'lucide-react';
import { type EmployeeCert, type CertStatus, CERT_STATUS_CONFIG, formatDate } from '../../data/employeesDemoData';

interface EmployeeCertificationsProps {
  certifications: EmployeeCert[];
  onAdd: () => void;
  onEdit: (cert: EmployeeCert) => void;
  onDelete: (certId: string) => void;
  canEdit: boolean;
}

export function EmployeeCertifications({ certifications, onAdd, onEdit, onDelete, canEdit }: EmployeeCertificationsProps) {
  const [statusFilter, setStatusFilter] = useState<CertStatus | 'all'>('all');

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return certifications;
    return certifications.filter(c => c.status === statusFilter);
  }, [certifications, statusFilter]);

  const expiringCount = certifications.filter(c => c.status === 'expiring').length;
  const expiredCount = certifications.filter(c => c.status === 'expired').length;

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4" style={{ color: '#6B7F96' }} />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as CertStatus | 'all')}
            className="text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            style={{ borderColor: '#D1D9E6', color: '#0B1628' }}
          >
            <option value="all">All ({certifications.length})</option>
            <option value="active">Active</option>
            <option value="expiring">Expiring Soon ({expiringCount})</option>
            <option value="expired">Expired ({expiredCount})</option>
          </select>
        </div>
        {canEdit && (
          <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white hover:opacity-90" style={{ backgroundColor: '#1e4d6b' }}>
            <Plus className="w-4 h-4" /> Add Certification
          </button>
        )}
      </div>

      {/* Expiry warnings */}
      {(expiredCount > 0 || expiringCount > 0) && statusFilter === 'all' && (
        <div className="rounded-lg border p-3" style={{ borderColor: expiredCount > 0 ? '#fecaca' : '#fed7aa', backgroundColor: expiredCount > 0 ? '#fef2f2' : '#fff7ed' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: expiredCount > 0 ? '#dc2626' : '#d97706' }} />
            <p className="text-sm font-medium" style={{ color: expiredCount > 0 ? '#991b1b' : '#9a3412' }}>
              {expiredCount > 0 && `${expiredCount} expired`}
              {expiredCount > 0 && expiringCount > 0 && ', '}
              {expiringCount > 0 && `${expiringCount} expiring within 30 days`}
            </p>
          </div>
        </div>
      )}

      {/* Cert list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}>
          <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: '#D1D9E6' }} />
          <p className="text-sm" style={{ color: '#6B7F96' }}>No certifications {statusFilter !== 'all' ? `with status "${statusFilter}"` : 'yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(cert => {
            const stat = CERT_STATUS_CONFIG[cert.status];
            return (
              <div key={cert.id} className="rounded-xl border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold" style={{ color: '#0B1628' }}>{cert.certName}</p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color: stat.color, backgroundColor: stat.bg }}>
                        {stat.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: '#6B7F96' }}>
                      <span className="px-2 py-0.5 rounded" style={{ backgroundColor: '#EEF1F7', color: '#3D5068' }}>{cert.certType}</span>
                      <span>#{cert.certNumber}</span>
                      <span>Issued: {formatDate(cert.issuedDate)}</span>
                      <span style={{ color: cert.status === 'expired' ? '#dc2626' : cert.status === 'expiring' ? '#d97706' : undefined }}>
                        Expires: {formatDate(cert.expiryDate)}
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEdit(cert)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" style={{ color: '#6B7F96' }} />
                      </button>
                      <button onClick={() => onDelete(cert.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" style={{ color: '#dc2626' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
