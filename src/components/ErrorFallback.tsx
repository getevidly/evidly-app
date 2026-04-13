import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

interface ErrorFallbackProps {
  level: 'page' | 'section' | 'widget';
  error: Error | null;
  onRetry: () => void;
}

function PageFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const { t } = useTranslation();

  const truncatedStack = error?.stack
    ? error.stack.length > 1000
      ? error.stack.slice(0, 1000) + '\n... (truncated)'
      : error.stack
    : 'No stack trace available';

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div
        className="max-w-lg w-full rounded-xl p-8 text-center"
        style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}
      >
        <AlertTriangle size={48} style={{ color: '#A08C5A' }} className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2" style={{ color: '#1E2D4D' }}>
          {t('errors.somethingWentWrong')}
        </h2>
        <p className="text-[#1E2D4D]/70 mb-6">
          {t('errors.pageError')}
        </p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors cursor-pointer"
            style={{ backgroundColor: '#A08C5A' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <RotateCcw size={16} />
            {t('errors.tryAgain')}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-transparent transition-colors cursor-pointer"
            style={{ border: '1px solid #1E2D4D', color: '#1E2D4D' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E2D4D', e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = '#1E2D4D')}
          >
            <Home size={16} />
            {t('errors.goToDashboard')}
          </button>
        </div>
        {error && (
          <div className="text-left mt-4">
            <button
              onClick={() => setShowDetails((prev) => !prev)}
              className="inline-flex items-center gap-1 text-sm text-[#1E2D4D]/50 hover:text-[#1E2D4D]/80 cursor-pointer bg-transparent border-none p-0"
            >
              {showDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {t('errors.showDetails')}
            </button>
            {showDetails && (
              <pre className="mt-2 p-3 bg-[#1E2D4D]/5 rounded-lg text-xs text-[#1E2D4D]/80 font-mono overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                <strong>Error:</strong> {error.message}
                {'\n\n'}
                <strong>Stack:</strong>
                {'\n'}
                {truncatedStack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3"
      style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}
    >
      <AlertTriangle size={20} style={{ color: '#A08C5A' }} className="flex-shrink-0" />
      <span className="text-sm text-[#1E2D4D]/70 flex-1">{t('errors.somethingWentWrong')}</span>
      <button
        onClick={onRetry}
        className="text-sm font-medium bg-transparent border-none cursor-pointer p-0"
        style={{ color: '#A08C5A' }}
      >
        {t('errors.tryAgain')}
      </button>
    </div>
  );
}

function WidgetFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[#1E2D4D]/50">
      <AlertTriangle size={14} style={{ color: '#A08C5A' }} />
      <span>{t('errors.somethingWentWrong')}</span>
      <span className="text-[#1E2D4D]/30">·</span>
      <button
        onClick={onRetry}
        className="font-medium bg-transparent border-none cursor-pointer p-0"
        style={{ color: '#A08C5A' }}
      >
        {t('errors.tryAgain')}
      </button>
    </span>
  );
}

export function ErrorFallback({ level, error, onRetry }: ErrorFallbackProps) {
  if (level === 'page') {
    return <PageFallback error={error} onRetry={onRetry} />;
  }
  if (level === 'section') {
    return <SectionFallback onRetry={onRetry} />;
  }
  return <WidgetFallback onRetry={onRetry} />;
}
