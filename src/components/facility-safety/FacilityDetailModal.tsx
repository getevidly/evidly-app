import {
  X, Shield, Clock, Building2, FileText, Upload,
  CalendarDays, Star, Phone, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import { statusColor, statusLabel } from '../shared/FireStatusBars';
import type { FacilityDetailData, ServiceHistoryEntry, DocumentEntry } from '../../data/facilityDetailDemoData';

const NAVY = '#1e4d6b';

interface FacilityDetailModalProps {
  open: boolean;
  onClose: () => void;
  data: FacilityDetailData;
  onAction: (action: string, category: string) => void;
}

function ResultBadge({ result }: { result: ServiceHistoryEntry['result'] }) {
  const cfg = result === 'pass'
    ? { bg: '#f0fdf4', color: '#16a34a', label: 'Pass' }
    : result === 'fail'
    ? { bg: '#fef2f2', color: '#dc2626', label: 'Fail' }
    : { bg: '#eff6ff', color: '#2563eb', label: 'Completed' };

  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function DocStatusBadge({ status }: { status: DocumentEntry['status'] }) {
  const cfg = status === 'current'
    ? { bg: '#f0fdf4', color: '#16a34a', label: 'Current' }
    : status === 'expired'
    ? { bg: '#fef2f2', color: '#dc2626', label: 'Expired' }
    : { bg: '#fef9c3', color: '#a16207', label: 'Missing' };

  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} fill={i <= rating ? '#EAB308' : 'none'} color={i <= rating ? '#EAB308' : '#D1D5DB'} />
      ))}
    </span>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Shield; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon size={14} className="text-gray-400" />
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</h4>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-4">
      <p className="text-xs text-gray-400">{message}</p>
    </div>
  );
}

export function FacilityDetailModal({ open, onClose, data, onAction }: FacilityDetailModalProps) {
  if (!open) return null;

  const color = statusColor(data.status);
  const label = statusLabel(data.status);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-xl max-h-[85vh] flex flex-col relative"
        style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
              <Shield size={18} style={{ color }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{data.fullName}</h3>
              <span
                className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5"
                style={{ backgroundColor: `${color}18`, color }}
              >
                {label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Service History */}
          <div>
            <SectionHeader icon={Clock} title="Service History" />
            {data.serviceHistory.length === 0 ? (
              <EmptyState message={`No ${data.fullName.toLowerCase()} service records yet. Schedule your first service.`} />
            ) : (
              <div className="space-y-2">
                {data.serviceHistory.map((entry, i) => (
                  <div key={i} className="flex items-start justify-between py-2 px-3 rounded-lg bg-gray-50 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-500">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <ResultBadge result={entry.result} />
                      </div>
                      <p className="text-xs text-gray-700 mt-0.5">{entry.description}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {entry.vendor}{entry.technician ? ` \u2014 ${entry.technician}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Vendor */}
          <div>
            <SectionHeader icon={Building2} title="Current Vendor" />
            {!data.vendor ? (
              <EmptyState message="No vendor assigned. Assign a vendor to track services." />
            ) : (
              <div className="rounded-lg border border-gray-100 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{data.vendor.name}</span>
                  <StarRating rating={data.vendor.rating} />
                </div>
                {data.vendor.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone size={11} />
                    <span>{data.vendor.phone}</span>
                  </div>
                )}
                <div className="flex gap-4 text-xs text-gray-500 pt-1">
                  <div>
                    <span className="text-gray-400">Last Service: </span>
                    <span className="font-medium text-gray-700">{new Date(data.vendor.lastService).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Next Due: </span>
                    <span className="font-medium text-gray-700">{new Date(data.vendor.nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compliance Requirement */}
          <div>
            <SectionHeader icon={Shield} title="Compliance Requirement" />
            <div className="rounded-lg bg-gray-50 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 w-20">Frequency:</span>
                <span className="font-medium text-gray-700">{data.compliance.frequency}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 w-20">Authority:</span>
                <span className="font-medium text-gray-700">{data.compliance.authorityReference}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 w-20">Jurisdiction:</span>
                <span className="font-medium text-gray-700">{data.compliance.jurisdiction}</span>
              </div>
              {data.compliance.notes && (
                <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-100 mt-1">{data.compliance.notes}</p>
              )}
            </div>
          </div>

          {/* Documents */}
          <div>
            <SectionHeader icon={FileText} title="Documents" />
            {data.documents.length === 0 ? (
              <EmptyState message="No documents uploaded. Upload certificates and inspection reports." />
            ) : (
              <div className="space-y-1.5">
                {data.documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-700 truncate">{doc.name}</p>
                      <p className="text-[10px] text-gray-400">
                        Uploaded {new Date(doc.uploadedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {doc.expiryDate ? ` \u00b7 Expires ${new Date(doc.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                      </p>
                    </div>
                    <DocStatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-100 p-4 flex flex-wrap gap-2">
          <button
            onClick={() => onAction('schedule', data.category)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: NAVY }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#163a52')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = NAVY)}
          >
            <CalendarDays size={13} />
            Schedule Service
          </button>
          <button
            onClick={() => onAction('change_vendor', data.category)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Building2 size={13} />
            Change Vendor
          </button>
          <button
            onClick={() => onAction('upload', data.category)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Upload size={13} />
            Upload Document
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
