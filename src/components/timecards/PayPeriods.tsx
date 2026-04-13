import { useState } from 'react';
import { Calendar, Download, Lock, CheckCircle, Plus, X } from 'lucide-react';
import {
  type PayPeriod,
  PAY_PERIOD_STATUS_CONFIG,
  formatDateRange,
} from '../../data/timecardsDemoData';

interface PayPeriodsProps {
  payPeriods: PayPeriod[];
  onClosePeriod: (id: string) => void;
  onExportPeriod: (id: string, format: string) => void;
  onMarkPaid: (id: string) => void;
  onCreatePeriod: () => void;
  isAdmin: boolean;
}

const EXPORT_FORMATS = ['CSV', 'QuickBooks', 'Gusto', 'ADP'];

export function PayPeriods({ payPeriods, onClosePeriod, onExportPeriod, onMarkPaid, onCreatePeriod, isAdmin }: PayPeriodsProps) {
  const [exportMenuId, setExportMenuId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Header */}
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={onCreatePeriod}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#1E2D4D' }}
          >
            <Plus className="w-4 h-4" />
            Create Pay Period
          </button>
        </div>
      )}

      {/* Pay period cards */}
      <div className="space-y-4">
        {payPeriods.map(pp => {
          const stat = PAY_PERIOD_STATUS_CONFIG[pp.status];
          const totalHours = pp.totalRegularHours + pp.totalOvertimeHours + pp.totalDoubleTimeHours;
          const isOpen = pp.status === 'open';
          const isClosed = pp.status === 'closed';

          return (
            <div
              key={pp.id}
              className="rounded-xl border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}
            >
              <div className="flex flex-wrap items-center justify-between px-5 py-4 gap-4">
                {/* Left: date range + status */}
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: '#EEF1F7' }}>
                    <Calendar className="w-5 h-5" style={{ color: '#1E2D4D' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#0B1628' }}>
                      {formatDateRange(pp.startDate, pp.endDate)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ color: stat.color, backgroundColor: stat.bg }}
                      >
                        {stat.label}
                      </span>
                      <span className="text-xs" style={{ color: '#6B7F96' }}>
                        {pp.employeeCount} employees
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center: hours breakdown */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs" style={{ color: '#6B7F96' }}>Regular</p>
                    <p className="text-sm font-bold" style={{ color: '#0B1628' }}>{pp.totalRegularHours.toFixed(1)}h</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: '#6B7F96' }}>OT</p>
                    <p className="text-sm font-bold" style={{ color: '#854d0e' }}>{pp.totalOvertimeHours.toFixed(1)}h</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: '#6B7F96' }}>DT</p>
                    <p className="text-sm font-bold" style={{ color: '#9a3412' }}>{pp.totalDoubleTimeHours.toFixed(1)}h</p>
                  </div>
                  <div className="text-center pl-3 border-l" style={{ borderColor: '#D1D9E6' }}>
                    <p className="text-xs" style={{ color: '#6B7F96' }}>Total</p>
                    <p className="text-sm font-bold" style={{ color: '#0B1628' }}>{totalHours.toFixed(1)}h</p>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2 relative">
                  {isOpen && isAdmin && (
                    <button
                      onClick={() => onClosePeriod(pp.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors hover:bg-[#FAF7F0]"
                      style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Close
                    </button>
                  )}
                  {isClosed && isAdmin && (
                    <button
                      onClick={() => onMarkPaid(pp.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors hover:opacity-90"
                      style={{ backgroundColor: '#16a34a' }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Mark Paid
                    </button>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setExportMenuId(exportMenuId === pp.id ? null : pp.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors hover:bg-[#FAF7F0]"
                      style={{ borderColor: '#D1D9E6', color: '#3D5068' }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                    {exportMenuId === pp.id && (
                      <div
                        className="absolute right-0 top-full mt-1 w-40 rounded-xl border shadow-lg z-20"
                        style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: '#E8EDF5' }}>
                          <span className="text-xs font-semibold" style={{ color: '#0B1628' }}>Export as</span>
                          <button onClick={() => setExportMenuId(null)} className="p-2 -m-1 rounded-full hover:bg-[#1E2D4D]/5">
                            <X className="w-3 h-3" style={{ color: '#6B7F96' }} />
                          </button>
                        </div>
                        {EXPORT_FORMATS.map(fmt => (
                          <button
                            key={fmt}
                            onClick={() => { onExportPeriod(pp.id, fmt); setExportMenuId(null); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[#FAF7F0] transition-colors"
                            style={{ color: '#0B1628' }}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Closed by info */}
              {pp.closedBy && (
                <div className="px-5 py-2 border-t text-xs" style={{ borderColor: '#E8EDF5', color: '#6B7F96' }}>
                  Closed by {pp.closedBy}
                  {pp.closedAt && ` on ${new Date(pp.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {payPeriods.length === 0 && (
        <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}>
          <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: '#D1D9E6' }} />
          <p className="text-sm" style={{ color: '#6B7F96' }}>No pay periods yet</p>
        </div>
      )}
    </div>
  );
}
