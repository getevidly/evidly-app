import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Camera, CheckCircle, AlertTriangle, ArrowLeft, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import { useDemo } from '../contexts/DemoContext';
import { equipmentQRCodes } from '../data/demoData';

type ScanState = 'scanning' | 'found' | 'entry' | 'success';

interface MatchedEquipment {
  id: string;
  name: string;
  location: string;
  qrCode: string;
  minTemp: number;
  maxTemp: number;
  type: string;
  ccp: string;
  thresholdLabel: string;
}

// Equipment lookup with temp ranges, type, and CCP mapping
const EQUIPMENT_RANGES: Record<string, { minTemp: number; maxTemp: number; type: string; ccp: string; thresholdLabel: string }> = {
  'eq-1': { minTemp: 33, maxTemp: 41, type: 'Cold Storage', ccp: 'CCP-01', thresholdLabel: '≤41°F' },
  'eq-2': { minTemp: -Infinity, maxTemp: 0, type: 'Freezer', ccp: 'CCP-01', thresholdLabel: '≤0°F' },
  'eq-3': { minTemp: 135, maxTemp: 165, type: 'Hot Holding', ccp: 'CCP-02', thresholdLabel: '≥135°F' },
  'eq-4': { minTemp: 33, maxTemp: 41, type: 'Cold Storage', ccp: 'CCP-01', thresholdLabel: '≤41°F' },
  'eq-5': { minTemp: 33, maxTemp: 41, type: 'Cold Storage', ccp: 'CCP-01', thresholdLabel: '≤41°F' },
};

function lookupByQR(code: string): MatchedEquipment | null {
  // Parse EVIDLY-EQ-{id} format from raw code or URL
  let qrValue = code.trim();
  if (qrValue.includes('/scan/')) {
    const parts = qrValue.split('/scan/');
    qrValue = parts[parts.length - 1];
  }
  const match = equipmentQRCodes.find(q => q.qrCode === qrValue);
  if (!match) return null;
  const range = EQUIPMENT_RANGES[match.equipmentId] || { minTemp: 33, maxTemp: 41, type: 'Cold Storage', ccp: 'CCP-01', thresholdLabel: '≤41°F' };
  return {
    id: match.equipmentId,
    name: match.equipmentName,
    location: match.locationName,
    qrCode: match.qrCode,
    ...range,
  };
}

// Demo QR codes to cycle through when simulating scans
const DEMO_QR_SEQUENCE = equipmentQRCodes.map(q => q.qrCode);

export function TempLogScan() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();

  const [state, setState] = useState<ScanState>('scanning');
  const [matched, setMatched] = useState<MatchedEquipment | null>(null);
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [demoScanIdx, setDemoScanIdx] = useState(0);
  const [correctiveAction, setCorrectiveAction] = useState('');

  const isInRange = matched && temperature
    ? parseFloat(temperature) >= matched.minTemp && parseFloat(temperature) <= matched.maxTemp
    : null;

  const handleScanResult = useCallback((code: string) => {
    const eq = lookupByQR(code);
    if (eq) {
      setMatched(eq);
      setState('found');
      setTimeout(() => setState('entry'), 800);
    } else {
      toast.error('QR code not recognized. Try scanning again or enter the code manually.');
    }
  }, []);

  const handleDemoScan = useCallback(() => {
    const code = DEMO_QR_SEQUENCE[demoScanIdx % DEMO_QR_SEQUENCE.length];
    setDemoScanIdx(prev => prev + 1);
    handleScanResult(code);
  }, [demoScanIdx, handleScanResult]);

  const handleManualLookup = () => {
    if (!manualInput.trim()) return;
    handleScanResult(manualInput.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matched || !temperature) {
      toast.error('Please enter a temperature reading.');
      return;
    }
    if (isInRange === false && !correctiveAction.trim()) {
      toast.error(`${matched.ccp} deviation — corrective action required before submitting.`);
      return;
    }
    if (isDemoMode) {
      toast.success('Temperature logged via QR scan! (Demo mode — data not saved)');
    } else {
      toast.success('Temperature logged via QR scan!');
    }
    setState('success');
  };

  const handleReset = () => {
    setState('scanning');
    setMatched(null);
    setTemperature('');
    setNotes('');
    setManualInput('');
    setShowManualInput(false);
    setCorrectiveAction('');
  };

  // ── Success screen ──
  if (state === 'success' && matched) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Temperature Logged!</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3"
            style={{ backgroundColor: '#eef4f8', color: '#1e4d6b' }}>
            <QrCode className="h-3 w-3" />
            Logged via QR Scan
          </div>
          <p className="text-sm text-gray-600 mb-1">{matched.name}</p>
          <p className="text-xs text-gray-400 mb-2">{matched.location}</p>
          <p className="text-2xl font-bold mb-4" style={{ color: isInRange ? '#22c55e' : '#ef4444' }}>
            {temperature}°F
          </p>
          <p className="text-xs text-gray-400 mb-6">
            {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
          <div className="space-y-2">
            <button
              onClick={handleReset}
              className="w-full px-4 py-3 bg-[#1e4d6b] text-white font-semibold rounded-lg hover:bg-[#163a52] transition-colors"
            >
              Scan Another QR Code
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

  // ── Found animation (brief flash) ──
  if (state === 'found' && matched) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border-2 border-green-400 p-8 max-w-sm w-full text-center animate-pulse">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Equipment Found!</h2>
          <p className="text-sm text-gray-600">{matched.name}</p>
          <p className="text-xs text-gray-400">{matched.location}</p>
        </div>
      </div>
    );
  }

  // ── Entry form (after scan matched) ──
  if (state === 'entry' && matched) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-sm overflow-hidden">
          <div className="px-6 py-4" style={{ backgroundColor: '#1e4d6b' }}>
            <div className="flex items-center gap-3">
              <QrCode className="h-7 w-7 text-[#d4af37]" />
              <div>
                <h1 className="text-lg font-bold text-white">{matched.name}</h1>
                <p className="text-xs text-gray-300">{matched.location} — {matched.type}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-[#eef4f8] rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Required: {matched.thresholdLabel} ({matched.ccp})</p>
              <p className="text-lg font-bold" style={{ color: '#1e4d6b' }}>
                {matched.type === 'Freezer' ? `${matched.maxTemp}°F or below` : `${matched.minTemp}°F – ${matched.maxTemp}°F`}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={e => setTemperature(e.target.value)}
                placeholder="Enter reading..."
                className={`w-full px-4 py-4 border rounded-lg text-2xl font-bold text-center focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b] ${
                  isInRange === false ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                autoFocus
              />
              {isInRange === false && (
                <div className="flex items-center gap-1.5 mt-2 text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <p className="text-xs font-medium">FAIL — {matched.ccp} deviation detected</p>
                </div>
              )}
              {isInRange === true && (
                <div className="flex items-center gap-1.5 mt-2 text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <p className="text-xs font-medium">PASS — Within acceptable range</p>
                </div>
              )}
            </div>

            {isInRange === false && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <label className="block text-xs font-bold text-red-800 mb-1">
                  {matched.ccp} Corrective Action Required
                </label>
                <textarea
                  value={correctiveAction}
                  onChange={e => setCorrectiveAction(e.target.value)}
                  placeholder="Describe corrective action taken..."
                  rows={2}
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 bg-white"
                />
                {!correctiveAction.trim() && (
                  <p className="text-[10px] text-red-600 mt-1">Required — cannot submit without corrective action</p>
                )}
              </div>
            )}

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

            <button
              type="submit"
              className="w-full px-4 py-3 bg-[#1e4d6b] text-white font-semibold rounded-lg hover:bg-[#163a52] transition-colors"
            >
              Save Temperature Reading
            </button>
          </form>

          <div className="px-6 pb-4 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Scan Different Equipment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Scanner screen (default) ──
  return (
    <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5" style={{ backgroundColor: '#1e4d6b' }}>
          <div className="flex items-center gap-3">
            <QrCode className="h-8 w-8 text-[#d4af37]" />
            <div>
              <h1 className="text-lg font-bold text-white">Scan Equipment QR</h1>
              <p className="text-xs text-gray-300">Point camera at equipment label</p>
            </div>
          </div>
        </div>

        {/* Camera viewfinder (demo simulation) */}
        <div className="p-6">
          <div
            className="relative bg-gray-900 rounded-xl overflow-hidden aspect-square flex items-center justify-center cursor-pointer group"
            onClick={handleDemoScan}
          >
            {/* Scan frame corners */}
            <div className="absolute inset-8 border-2 border-white/30 rounded-lg">
              <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-[#d4af37] rounded-tl" />
              <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-[#d4af37] rounded-tr" />
              <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-[#d4af37] rounded-bl" />
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-[#d4af37] rounded-br" />
            </div>

            {/* Scanning line animation */}
            <div className="absolute inset-x-8 h-0.5 bg-[#d4af37]/60 animate-bounce" style={{ top: '50%' }} />

            <div className="text-center z-10">
              <Camera className="h-12 w-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/70 text-sm font-medium">Tap to simulate scan</p>
              <p className="text-white/40 text-xs mt-1">Demo Mode</p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-3">
            Scanning for <span className="font-mono text-gray-500">EVIDLY-EQ-*</span> codes
          </p>
        </div>

        {/* Manual entry fallback */}
        <div className="px-6 pb-4">
          {!showManualInput ? (
            <button
              onClick={() => setShowManualInput(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mx-auto"
            >
              <Keyboard className="h-3.5 w-3.5" />
              Enter code manually
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="EVIDLY-EQ-..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#1e4d6b] focus:border-[#1e4d6b]"
                onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
              />
              <button
                onClick={handleManualLookup}
                className="px-3 py-2 bg-[#1e4d6b] text-white text-xs font-medium rounded-lg hover:bg-[#163a52] transition-colors"
              >
                Look Up
              </button>
            </div>
          )}
        </div>

        <div className="px-6 pb-4 border-t border-gray-100 pt-3">
          <button
            onClick={() => navigate('/temp-logs')}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Temperature Logs
          </button>
        </div>
      </div>
    </div>
  );
}
