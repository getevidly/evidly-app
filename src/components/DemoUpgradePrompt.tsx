import { useEffect } from 'react';
import { X, Lock } from 'lucide-react';

interface DemoUpgradePromptProps {
  action: string;
  featureName?: string;
  onClose: () => void;
}

export function DemoUpgradePrompt({ action, featureName, onClose }: DemoUpgradePromptProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" data-demo-allow onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1e4d6b] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">Demo Mode</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-gray-700 text-sm leading-relaxed mb-2">
            <span className="font-semibold capitalize">{action}</span> is not available in demo mode.
            {featureName && <> Start a free trial to unlock <span className="font-semibold">{featureName}</span>.</>}
          </p>
          <p className="text-gray-500 text-xs mb-5">
            Get full access to all features with your own data.
          </p>

          <div className="flex gap-3">
            <a
              href="/signup"
              className="flex-1 py-2.5 px-4 bg-[#1e4d6b] hover:bg-[#163a52] text-white font-medium rounded-lg transition-colors text-sm text-center"
            >
              Start Free Trial
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Continue Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
