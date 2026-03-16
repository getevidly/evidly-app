import { useState } from 'react';
import {
  AlertTriangle, Upload, Search, Phone, Mail, Plus, Filter,
} from 'lucide-react';
import { useViolationOutreach, useImportViolations } from '@/hooks/api/useMarketing';

type ViolationStatus = 'pending' | 'contacted' | 'interested' | 'not_interested' | 'converted' | 'invalid';

const STATUS_STYLES: Record<ViolationStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: '#FEF9C3', text: '#854D0E', label: 'Pending' },
  contacted: { bg: '#DBEAFE', text: '#1E40AF', label: 'Contacted' },
  interested: { bg: '#DCFCE7', text: '#166534', label: 'Interested' },
  not_interested: { bg: '#F3F4F6', text: '#6B7280', label: 'Not Interested' },
  converted: { bg: '#D1FAE5', text: '#065F46', label: 'Converted' },
  invalid: { bg: '#FEE2E2', text: '#991B1B', label: 'Invalid' },
};

const ALL_STATUSES: ViolationStatus[] = ['pending', 'contacted', 'interested', 'not_interested', 'converted', 'invalid'];

export function ViolationOutreachPage() {
  const { data, isLoading } = useViolationOutreach();
  const importViolations = useImportViolations();
  const [statusFilter, setStatusFilter] = useState<ViolationStatus | 'all'>('all');

  const violations = data?.violations ?? [];
  const stats = data?.stats ?? { total_found: 0, contacted: 0, converted: 0, revenue_generated: 0 };
  const filtered = statusFilter === 'all' ? violations : violations.filter((v: { status: ViolationStatus }) => v.status === statusFilter);
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6FA' }}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0B1628' }}>Violation Outreach</h1>
            <p className="mt-1 text-sm" style={{ color: '#6B7F96' }}>Target businesses with health and safety violations</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => importViolations.mutate()} disabled={importViolations.isPending} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}><Upload className="h-4 w-4" /> Import Violations</button>
            <button onClick={() => importViolations.mutate()} disabled={importViolations.isPending} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50" style={{ backgroundColor: '#1e4d6b' }}><Search className="h-4 w-4" /> Scan for New</button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Violations Found', value: stats.total_found },
            { label: 'Contacted', value: stats.contacted },
            { label: 'Converted', value: stats.converted },
            { label: 'Revenue Generated', value: formatCurrency(stats.revenue_generated) },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-white p-4 text-center" style={{ borderColor: '#D1D9E6' }}>
              <p className="text-2xl font-bold" style={{ color: '#1e4d6b' }}>{s.value}</p>
              <p className="mt-1 text-xs font-medium" style={{ color: '#6B7F96' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4" style={{ color: '#6B7F96' }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ViolationStatus | 'all')} className="rounded-lg border px-3 py-1.5 text-sm outline-none" style={{ borderColor: '#D1D9E6', color: '#0B1628' }}>
            <option value="all">All Statuses</option>
            {ALL_STATUSES.map((s) => (<option key={s} value={s}>{STATUS_STYLES[s].label}</option>))}
          </select>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white" style={{ borderColor: '#D1D9E6' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><p className="text-sm" style={{ color: '#6B7F96' }}>Loading violations...</p></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertTriangle className="mb-3 h-10 w-10" style={{ color: '#D1D9E6' }} />
              <p className="text-sm font-medium" style={{ color: '#0B1628' }}>No violations found</p>
              <p className="mt-1 text-xs" style={{ color: '#6B7F96' }}>Check back later or import manually.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F4F6FA' }}>
                  {['Business Name', 'Violation Type', 'Date', 'Location', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold" style={{ color: '#6B7F96' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v: { id: string; business_name: string; violation_type: string; date: string; location: string; status: ViolationStatus }) => {
                  const style = STATUS_STYLES[v.status];
                  return (
                    <tr key={v.id} className="border-t" style={{ borderColor: '#D1D9E6' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: '#0B1628' }}>{v.business_name}</td>
                      <td className="px-4 py-3" style={{ color: '#0B1628' }}>{v.violation_type}</td>
                      <td className="px-4 py-3" style={{ color: '#6B7F96' }}>{v.date}</td>
                      <td className="px-4 py-3" style={{ color: '#6B7F96' }}>{v.location}</td>
                      <td className="px-4 py-3"><span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: style.bg, color: style.text }}>{style.label}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button className="rounded p-1 transition-colors hover:bg-gray-100" title="Call"><Phone className="h-4 w-4" style={{ color: '#6B7F96' }} /></button>
                          <button className="rounded p-1 transition-colors hover:bg-gray-100" title="Email"><Mail className="h-4 w-4" style={{ color: '#6B7F96' }} /></button>
                          <button className="rounded p-1 transition-colors hover:bg-gray-100" title="Add to Campaign"><Plus className="h-4 w-4" style={{ color: '#6B7F96' }} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViolationOutreachPage;
