import { useState, useEffect } from 'react';
import { Check, FileText } from 'lucide-react';

interface DocumentScanAnimationProps {
  onComplete?: () => void;
}

interface ExtractedField {
  label: string;
  value: string;
  delay: number;
}

export function DocumentScanAnimation({ onComplete }: DocumentScanAnimationProps) {
  const [isScanning, setIsScanning] = useState(true);
  const [showFields, setShowFields] = useState(false);
  const [visibleFields, setVisibleFields] = useState<number[]>([]);

  const fields: ExtractedField[] = [
    { label: 'Document Type', value: 'Hood Cleaning Certificate', delay: 0 },
    { label: 'Vendor', value: 'ABC Fire Protection', delay: 200 },
    { label: 'Issue Date', value: 'Jan 15, 2026', delay: 400 },
    { label: 'Expiration', value: 'Jul 15, 2026', delay: 600 },
  ];

  useEffect(() => {
    const scanTimer = setTimeout(() => {
      setIsScanning(false);
      setShowFields(true);
    }, 2000);

    return () => clearTimeout(scanTimer);
  }, []);

  useEffect(() => {
    if (showFields) {
      fields.forEach((field, index) => {
        setTimeout(() => {
          setVisibleFields((prev) => [...prev, index]);
        }, field.delay);
      });

      const completeTimer = setTimeout(() => {
        onComplete?.();
      }, fields[fields.length - 1].delay + 500);

      return () => clearTimeout(completeTimer);
    }
  }, [showFields]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-xl p-4 sm:p-5 max-w-md w-full mx-4 animate-slide-up">
        <div className="mb-6">
          <div className="relative bg-gray-100 rounded-lg p-8 h-64 flex items-center justify-center overflow-hidden">
            <FileText className="w-24 h-24 text-gray-300" />
            {isScanning && (
              <div
                className="absolute left-0 right-0 h-1 bg-blue-500 opacity-70"
                style={{ animation: 'scan-bar 2s ease-in-out' }}
              />
            )}
          </div>
          <div className="text-center mt-4">
            {isScanning ? (
              <p className="text-sm text-gray-600 font-medium">Scanning document...</p>
            ) : (
              <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                Scan complete
              </p>
            )}
          </div>
        </div>

        {showFields && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 mb-4">Extracted Information:</p>
            {fields.map((field, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-300 ${
                  visibleFields.includes(index)
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-4'
                }`}
              >
                <div className="flex items-center gap-2">
                  {visibleFields.includes(index) && (
                    <Check className="w-4 h-4 text-green-500 animate-bounce-in" />
                  )}
                  <span className="text-sm font-medium text-gray-700">{field.label}:</span>
                </div>
                <span className="text-sm text-gray-900 font-semibold">{field.value}</span>
              </div>
            ))}
          </div>
        )}

        {!isScanning && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              AI Extracted — verify and save
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
