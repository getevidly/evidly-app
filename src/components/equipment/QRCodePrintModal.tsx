/**
 * QRCodePrintModal — Print a single equipment QR code with various layout options.
 */
import { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import DOMPurify from 'dompurify';
import type { EquipmentItem } from '../../hooks/api/useEquipment';
import { NAVY, CARD_BG, CARD_BORDER, TEXT_TERTIARY, MUTED } from '../dashboard/shared/constants';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

interface QRCodePrintModalProps {
  equipment: EquipmentItem;
  onClose: () => void;
}

export function QRCodePrintModal({ equipment, onClose }: QRCodePrintModalProps) {
  const [layout, setLayout] = useState<'large' | 'label' | 'sheet'>('large');

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=600,height=800');
    if (!printWin) return;

    const qrUrl = `${window.location.origin}/equipment/scan/${equipment.qrCodeId}`;

    const content = layout === 'large'
      ? `<div style="text-align:center;padding:40px;font-family:sans-serif;">
          <h2 style="color:#1E2D4D;margin-bottom:8px;">${escapeHtml(equipment.name)}</h2>
          <p style="color:#6B7F96;margin-bottom:24px;">${escapeHtml(equipment.locationName)}</p>
          <div id="qr" style="margin:0 auto 16px;"></div>
          <p style="font-family:monospace;color:#6B7F96;font-size:12px;">${equipment.qrCodeId}</p>
          <p style="color:#A08C5A;font-size:10px;margin-top:24px;">Powered by HoodOps</p>
        </div>`
      : layout === 'label'
      ? `<div style="display:inline-block;padding:16px;border:1px solid #ddd;border-radius:8px;font-family:sans-serif;text-align:center;">
          <div id="qr" style="margin-bottom:8px;"></div>
          <p style="font-size:11px;font-weight:bold;color:#1E2D4D;margin:0;">${escapeHtml(equipment.name)}</p>
          <p style="font-size:9px;color:#6B7F96;margin:2px 0 0;">${escapeHtml(equipment.locationName)}</p>
        </div>`
      : `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:20px;font-family:sans-serif;">
          ${Array.from({ length: 9 }).map(() => `
            <div style="border:1px solid #ddd;border-radius:6px;padding:12px;text-align:center;">
              <div class="qr-placeholder" style="width:80px;height:80px;margin:0 auto 6px;background:#f0f0f0;"></div>
              <p style="font-size:9px;font-weight:bold;color:#1E2D4D;margin:0;">${escapeHtml(equipment.name)}</p>
              <p style="font-size:7px;color:#6B7F96;margin:2px 0 0;">${equipment.qrCodeId}</p>
            </div>
          `).join('')}
        </div>`;

    printWin.document.write(DOMPurify.sanitize(`
      <!DOCTYPE html>
      <html><head><title>QR Code - ${escapeHtml(equipment.name)}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
      </head><body>
      ${content}
      <script>
        var qrEl = document.getElementById('qr');
        if (qrEl) new QRCode(qrEl, { text: "${qrUrl}", width: ${layout === 'large' ? 200 : 100}, height: ${layout === 'large' ? 200 : 100}, correctLevel: QRCode.CorrectLevel.M });
        setTimeout(function() { window.print(); window.close(); }, 500);
      <\/script>
      </body></html>
    `, { WHOLE_DOCUMENT: true, ADD_TAGS: ['script'], ADD_ATTR: ['src'] }));
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="rounded-xl w-full max-w-md mx-4"
        style={{ background: CARD_BG, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: CARD_BORDER }}>
          <h2 className="text-base font-bold" style={{ color: NAVY }}>Print QR Code</h2>
          <button onClick={onClose} className="p-2.5 -m-1 rounded hover:bg-gray-100" aria-label="Close"><X className="w-5 h-5" style={{ color: TEXT_TERTIARY }} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview */}
          <div className="text-center">
            <QRCodeDisplay value={equipment.qrCodeId} size={140} />
            <p className="text-sm font-semibold mt-3" style={{ color: NAVY }}>{equipment.name}</p>
            <p className="text-xs" style={{ color: TEXT_TERTIARY }}>{equipment.locationName}</p>
          </div>

          {/* Layout options */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: MUTED }}>Print Layout</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'large' as const, label: 'Single (Large)', desc: 'Full page with details' },
                { key: 'label' as const, label: 'Label', desc: 'Small label format' },
                { key: 'sheet' as const, label: 'Sheet (9)', desc: '3x3 grid of labels' },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setLayout(opt.key)}
                  className="p-3 rounded-lg border text-left transition-all"
                  style={{
                    borderColor: layout === opt.key ? '#1e4d6b' : CARD_BORDER,
                    background: layout === opt.key ? '#eef4f8' : CARD_BG,
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: NAVY }}>{opt.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: TEXT_TERTIARY }}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Include on label */}
          <div className="text-xs space-y-1" style={{ color: MUTED }}>
            <p className="font-semibold">Label includes:</p>
            <ul className="list-disc pl-4 space-y-0.5" style={{ color: TEXT_TERTIARY }}>
              <li>QR Code</li>
              <li>Equipment name</li>
              <li>Location name</li>
              <li>Equipment ID</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: CARD_BORDER }}>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50" style={{ borderColor: CARD_BORDER, color: NAVY }}>
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ background: '#1e4d6b' }}
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
