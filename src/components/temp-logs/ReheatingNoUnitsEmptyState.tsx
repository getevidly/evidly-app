import { Thermometer } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ReheatingNoUnitsEmptyState() {
  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center text-center py-16 px-6"
      style={{ backgroundColor: '#FAF7F0', border: '2px dashed #E2DDD4' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: '#FFF7ED' }}
      >
        <Thermometer className="h-7 w-7" style={{ color: '#DC2626' }} />
      </div>
      <h4 className="text-base font-bold mb-2" style={{ color: '#1E2D4D' }}>
        No reheating units configured
      </h4>
      <p className="text-sm mb-6 max-w-sm" style={{ color: '#6B7F96' }}>
        Add ovens and reheating equipment to verify items reach 165°F before service.
      </p>
      <Link
        to="/admin/equipment"
        className="px-5 py-3 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5"
        style={{ backgroundColor: '#1E2D4D', color: 'white', minHeight: '44px' }}
      >
        + Add reheating unit
      </Link>
    </div>
  );
}
