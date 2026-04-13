/**
 * QRCodeDisplay — Renders a QR code from a value string.
 * Uses qrcode.react (already installed).
 */
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  showLogo?: boolean;
}

export function QRCodeDisplay({ value, size = 128, showLogo = true }: QRCodeDisplayProps) {
  const scanUrl = `${window.location.origin}/equipment/scan/${value}`;

  return (
    <div className="inline-flex items-center justify-center p-3 bg-white rounded-xl">
      <QRCodeSVG
        value={scanUrl}
        size={size}
        level="M"
        marginSize={2}
        imageSettings={showLogo ? {
          src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0iIzFFMkQ0RCIvPjx0ZXh0IHg9IjEyIiB5PSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiNBMDhDNUEiPkg8L3RleHQ+PC9zdmc+',
          height: Math.round(size * 0.15),
          width: Math.round(size * 0.15),
          excavate: true,
        } : undefined}
      />
    </div>
  );
}
