import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home, ChevronDown, ChevronRight } from 'lucide-react';

interface ErrorFallbackProps {
  level: 'page' | 'section' | 'widget';
  error: Error | null;
  onRetry: () => void;
}

function PageFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

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
        <AlertTriangle size={48} style={{ color: '#d4af37' }} className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2" style={{ color: '#1e4d6b' }}>
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-6">
          This page encountered an error. Your other pages still work fine.
        </p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors cursor-pointer"
            style={{ backgroundColor: '#d4af37' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <RotateCcw size={16} />
            Try Again
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-transparent transition-colors cursor-pointer"
            style={{ border: '1px solid #1e4d6b', color: '#1e4d6b' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b', e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = '#1e4d6b')}
          >
            <Home size={16} />
            Go to Dashboard
          </button>
        </div>
        {error && (
          <div className="text-left mt-4">
            <button
              onClick={() => setShowDetails((prev) => !prev)}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer bg-transparent border-none p-0"
            >
              {showDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Show details
            </button>
            {showDetails && (
              <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-700 font-mono overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
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
  return (
    <div
      className="rounded-lg p-4 flex items-center gap-3"
      style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}
    >
      <AlertTriangle size={20} style={{ color: '#d4af37' }} className="flex-shrink-0" />
      <span className="text-sm text-gray-600 flex-1">Unable to load this section</span>
      <button
        onClick={onRetry}
        className="text-sm font-medium bg-transparent border-none cursor-pointer p-0"
        style={{ color: '#d4af37' }}
      >
        Try Again
      </button>
    </div>
  );
}

function WidgetFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
      <AlertTriangle size={14} style={{ color: '#d4af37' }} />
      <span>Error loading</span>
      <span className="text-gray-300">·</span>
      <button
        onClick={onRetry}
        className="font-medium bg-transparent border-none cursor-pointer p-0"
        style={{ color: '#d4af37' }}
      >
        Retry
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
