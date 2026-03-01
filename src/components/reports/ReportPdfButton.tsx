import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useDemoGuard } from '../../hooks/useDemoGuard';

interface ReportPdfButtonProps {
  onExport: () => void | Promise<void>;
  label?: string;
}

export function ReportPdfButton({ onExport, label = 'Export PDF' }: ReportPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const { guardAction } = useDemoGuard();

  const handleClick = () => {
    guardAction('export', 'report PDF export', async () => {
      setLoading(true);
      try {
        await onExport();
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
      style={{ backgroundColor: '#1e4d6b' }}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {label}
    </button>
  );
}
