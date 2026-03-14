import { AlertTriangle } from 'lucide-react';
import { getOvertimeSummary } from '../../data/timecardsDemoData';

export function OvertimeSummary() {
  const entries = getOvertimeSummary();

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6' }}>
        <p className="text-sm" style={{ color: '#6B7F96' }}>No overtime this week</p>
      </div>
    );
  }

  const totalOTCost = entries.reduce((sum, e) => sum + Math.round(e.ot * 30 + e.dt * 40), 0);

  return (
    <div className="rounded-xl border" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9E6', boxShadow: '0 1px 3px rgba(11,22,40,.06)' }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: '#D1D9E6' }}>
        <h4 className="text-sm font-semibold" style={{ color: '#0B1628' }}>Overtime Summary</h4>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: '#854d0e', backgroundColor: '#fffbeb' }}>
          ~${totalOTCost.toLocaleString()} OT cost
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="w-full text-sm" style={{ minWidth: 500 }}>
          <thead>
            <tr style={{ backgroundColor: '#F4F6FA' }}>
              {['Employee', 'Location', 'Regular', 'OT', 'DT', 'Total', 'Est. Cost'].map(h => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold" style={{ color: '#6B7F96' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(e => {
              const excessive = e.ot + e.dt > 10;
              return (
                <tr key={e.employeeId} className="border-t" style={{ borderColor: '#E8EDF5', backgroundColor: excessive ? '#fffbeb' : undefined }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: '#0B1628' }}>
                    <span className="flex items-center gap-1.5">
                      {e.employeeName}
                      {excessive && <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#d97706' }} />}
                    </span>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>{e.locationName}</td>
                  <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>{e.regular.toFixed(1)}h</td>
                  <td className="px-4 py-2.5 font-medium" style={{ color: '#854d0e' }}>{e.ot.toFixed(1)}h</td>
                  <td className="px-4 py-2.5 font-medium" style={{ color: e.dt > 0 ? '#9a3412' : '#3D5068' }}>{e.dt.toFixed(1)}h</td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: '#0B1628' }}>{e.total.toFixed(1)}h</td>
                  <td className="px-4 py-2.5" style={{ color: '#3D5068' }}>${e.estimatedCost.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
