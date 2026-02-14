import { QRCodeSVG } from 'qrcode.react';

interface EquipmentQRCodeProps {
  equipmentId: string;
  equipmentName: string;
}

export function EquipmentQRCode({ equipmentId, equipmentName }: EquipmentQRCodeProps) {
  const qrUrl = `${window.location.origin}/temp/log?equipment=${equipmentId}`;

  return (
    <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
      <QRCodeSVG value={qrUrl} size={180} level="M" />
      <p className="mt-3 text-sm font-medium text-gray-900">{equipmentName}</p>
      <p className="text-xs text-gray-400 mt-1">Scan to log temperature</p>
      <button
        onClick={() => {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html><head><title>QR - ${equipmentName}</title>
              <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}</style>
              </head><body>
              <div id="qr"></div>
              <h2>${equipmentName}</h2>
              <p style="color:#666">Scan to log temperature reading</p>
              <p style="color:#999;font-size:12px">${qrUrl}</p>
              <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
              <script>
                var canvas = document.createElement('canvas');
                QRCode.toCanvas(canvas, '${qrUrl}', {width:300}, function(){
                  document.getElementById('qr').appendChild(canvas);
                  setTimeout(function(){window.print();}, 500);
                });
              <\/script>
              </body></html>
            `);
            printWindow.document.close();
          }
        }}
        className="mt-3 px-4 py-2 text-sm font-medium text-[#1e4d6b] border border-[#1e4d6b] rounded-lg hover:bg-[#eef4f8] transition-colors"
      >
        Print QR Label
      </button>
    </div>
  );
}
