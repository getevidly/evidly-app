import { FileText } from 'lucide-react';

interface ReportEmptyStateProps {
  reportTitle?: string;
  message?: string;
  guidance?: string;
}

export function ReportEmptyState({
  reportTitle,
  message,
  guidance,
}: ReportEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: '#eef4f8' }}
      >
        <FileText className="w-8 h-8" style={{ color: '#1E2D4D' }} />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-[#1E2D4D] mb-2">
        {message || `No data available${reportTitle ? ` for ${reportTitle}` : ''}`}
      </h3>
      <p className="text-sm text-[#1E2D4D]/50 max-w-md leading-relaxed">
        {guidance || 'Add locations and start using the platform to generate reports.'}
      </p>
    </div>
  );
}
