import { useState } from 'react';
import { QrCode, X, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getReadinessColor } from '../../utils/inspectionReadiness';

interface LocationCardProps {
  locationId: string;
  locationName: string;
  score: number;
  onClick: () => void;
  isSelected?: boolean;
}

export default function LocationCard({ locationId, locationName, score, onClick, isSelected }: LocationCardProps) {
  const color = getReadinessColor(score);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const passportUrl = `${window.location.origin}/passport/${locationId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(passportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div
        className="relative flex flex-col items-center justify-center rounded-lg p-3 bg-white transition-all duration-200 hover:shadow-md"
        style={{
          fontFamily: 'Inter, sans-serif',
          width: 120,
          minHeight: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: isSelected ? '2px solid #1e4d6b' : '2px solid transparent',
        }}
      >
        {/* QR share button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowQrModal(true); }}
          className="absolute top-1 right-1 p-0.5 rounded hover:bg-gray-100 transition-colors"
          title="Share Passport"
          style={{ lineHeight: 0 }}
        >
          <QrCode className="w-3.5 h-3.5 text-gray-400 hover:text-[#1E2D4D]" />
        </button>

        {/* Main card content (clickable) */}
        <button
          type="button"
          onClick={onClick}
          className="flex flex-col items-center justify-center w-full cursor-pointer bg-transparent border-none"
          title={locationName}
        >
          <span className="text-xs font-medium text-gray-700 text-center leading-tight mb-2 w-full truncate">
            {locationName}
          </span>
          <span className="text-xl font-bold" style={{ color }}>
            {score}
          </span>
          <span
            className="inline-block w-2.5 h-2.5 rounded-full mt-1.5"
            style={{ backgroundColor: color }}
          />
        </button>
      </div>

      {/* QR Passport Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowQrModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-sm border border-gray-200 transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              {/* Header */}
              <div style={{ background: '#1E2D4D' }} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{locationName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-300">Compliance Score:</span>
                      <span className="text-sm font-bold" style={{ color: getReadinessColor(score) }}>{score}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div className="px-6 py-6 flex flex-col items-center">
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
                  <QRCodeSVG
                    value={passportUrl}
                    size={200}
                    level="M"
                    fgColor="#1E2D4D"
                  />
                </div>
                <p className="text-xs text-gray-500 mb-4">Scan to view live compliance passport</p>

                {/* Copyable URL */}
                <div className="w-full flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="text"
                    readOnly
                    value={passportUrl}
                    className="flex-1 text-xs text-gray-600 bg-transparent border-none outline-none truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                    style={{
                      background: copied ? '#22c55e' : '#A08C5A',
                      color: '#ffffff',
                    }}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-3 flex justify-end">
                <button
                  onClick={() => setShowQrModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ background: '#1E2D4D', color: '#ffffff' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
