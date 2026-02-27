import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Thermometer, CheckCircle, ArrowLeft, QrCode, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../contexts/DemoContext';

interface QuickEquipment {
  id: string;
  name: string;
  type: string;
  minTemp: number;
  maxTemp: number;
}

const DEMO_EQUIPMENT: QuickEquipment[] = [
  { id: 'eq-1', name: 'Walk-in Cooler #1', type: 'cooler', minTemp: 33, maxTemp: 41 }, // demo
  { id: 'eq-2', name: 'Walk-in Freezer #1', type: 'freezer', minTemp: -Infinity, maxTemp: 0 },
  { id: 'eq-3', name: 'Prep Cooler', type: 'cooler', minTemp: 33, maxTemp: 41 },
  { id: 'eq-4', name: 'Walk-in Cooler #2', type: 'cooler', minTemp: 33, maxTemp: 41 },
  { id: 'eq-5', name: 'Hot Hold Station', type: 'hot', minTemp: 135, maxTemp: 165 },
];

export function TempLogQuick() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const preselectedId = searchParams.get('equipment');
  const inputMethod = (searchParams.get('method') as 'manual' | 'qr_scan') || 'manual';

  const [selectedEquipment, setSelectedEquipment] = useState<string>(preselectedId || '');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const equipment = useMemo(() => DEMO_EQUIPMENT, []);
  const selected = equipment.find(e => e.id === selectedEquipment);

  const isInRange = selected && temperature
    ? parseFloat(temperature) >= selected.minTemp && parseFloat(temperature) <= selected.maxTemp
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment || !temperature) {
      toast.error('Please select equipment and enter a temperature.');
      return;
    }

    if (isDemoMode) {
      toast.success('Temperature logged! (Demo mode — data not saved)');
    } else {
      toast.success('Temperature logged successfully!');
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Temperature Logged!</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3"
            style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
            {inputMethod === 'qr_scan' ? <QrCode className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            {inputMethod === 'qr_scan' ? 'Logged via QR Scan' : 'Logged via Manual Entry'}
          </div>
          <p className="text-sm text-gray-600 mb-1">{selected?.name}</p>
          <p className="text-2xl font-bold mb-4" style={{ color: isInRange ? '#22c55e' : '#ef4444' }}>
            {temperature}°F
          </p>
          <p className="text-xs text-gray-400 mb-6">
            {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => { setSubmitted(false); setTemperature(''); setNotes(''); }}
              className="w-full px-4 py-3 bg-[#1e4d6b] text-white font-semibold rounded-lg hover:bg-[#163a52] transition-colors"
            >
              Log Another Reading
            </button>
            <button
              onClick={() => navigate('/temp-logs')}
              className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              View All Temperature Logs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5" style={{ backgroundColor: '#1e4d6b' }}>
          <div className="flex items-center gap-3">
            <Thermometer className="h-8 w-8 text-[#d4af37]" />
            <div>
              <h1 className="text-lg font-bold text-white">Log Temperature</h1>
              <p className="text-xs text-gray-300">Quick entry via QR code</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
            <select
              value={selectedEquipment}
              onChange={e => setSelectedEquipment(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b] bg-white"
            >
              <option value="">Select equipment...</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
          </div>

          {selected && (
            <p className="text-xs text-gray-500">
              {selected.type === 'freezer'
                ? `Must remain: ${selected.maxTemp}°F or below`
                : `Acceptable range: ${selected.minTemp}°F – ${selected.maxTemp}°F`
              }
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
            <input
              type="number"
              step="0.1"
              value={temperature}
              onChange={e => setTemperature(e.target.value)}
              placeholder="Enter temperature..."
              className={`w-full px-3 py-3 border rounded-lg text-lg font-semibold focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b] ${
                isInRange === false ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              autoFocus={!!preselectedId}
            />
            {isInRange === false && (
              <p className="text-xs text-red-600 mt-1 font-medium">Out of acceptable range! Corrective action may be required.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any observations..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/temp-logs')}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[#1e4d6b] text-white font-semibold rounded-lg hover:bg-[#163a52] transition-colors text-sm"
            >
              Save Temperature Reading
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
