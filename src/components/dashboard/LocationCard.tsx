import { useState } from 'react';
import { QrCode, X, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getReadinessColor } from '../../utils/inspectionReadiness';
import { Modal } from '../ui/Modal';

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
          border: isSelected ? '2px solid #1E2D4D' : '2px solid transparent',
        }}
      >
        {/* QR share button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowQrModal(true); }}
          className="absolute top-1 right-1 p-2 -m-1 rounded hover:bg-[#1E2D4D]/5 transition-colors"
          title="Share Passport"
          style={{ lineHeight: 0 }}
        >
          <QrCode className="w-3.5 h-3.5 text-[#1E2D4D]/30 hover:text-[#1E2D4D]" />
        </button>

        {/* Main card content (clickable) */}
        <button
          type="button"
          onClick={onClick}
          className="flex flex-col items-center justify-center w-full cursor-pointer bg-transparent border-none"
          title={locationName}
        >
          <span className="text-xs font-medium text-[#1E2D4D]/80 text-center leading-tight mb-2 w-full truncate">
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
      <Modal isOpen={showQrModal} onClose={() => setShowQrModal(false)} size="md" className="border border-[#1E2D4D]/10 overflow-hidden">
              {/* Header */}
              <div style={{ background: '#1E2D4D' }} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-white">{locationName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-[#1E2D4D]/30">Compliance Score:</span>
                      <span className="text-sm font-bold" style={{ color: getReadinessColor(score) }}>{score}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="text-[#1E2D4D]/30 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div className="px-6 py-6 flex flex-col items-center">
                <div className="p-4 bg-white rounded-xl border border-[#1E2D4D]/10 mb-4">
                  <QRCodeSVG
                    value={passportUrl}
                    size={200}
                    level="M"
                    fgColor="#1E2D4D"
                  />
                </div>
                <p className="text-xs text-[#1E2D4D]/50 mb-4">Scan to view live compliance passport</p>

                {/* Copyable URL */}
                <div className="w-full flex items-center gap-2 p-2 bg-[#FAF7F0] rounded-xl border border-[#1E2D4D]/10">
                  <input
                    type="text"
                    readOnly
                    value={passportUrl}
                    className="flex-1 text-xs text-[#1E2D4D]/70 bg-transparent border-none outline-none truncate"
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
              <div className="bg-[#FAF7F0] px-6 py-3 flex justify-end">
                <button
                  onClick={() => setShowQrModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ background: '#1E2D4D', color: '#ffffff' }}
                >
                  Close
                </button>
              </div>
      </Modal>
    </>
  );
}
