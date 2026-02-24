import { useEffect, useState } from 'react';
import { X, Lock } from 'lucide-react';

interface DemoUpgradePromptProps {
  action: string;
  featureName?: string;
  onClose: () => void;
  onOverride?: () => void;
}

const OVERRIDE_CODE = 'EVIDLY-DEMO-OVERRIDE';

export function DemoUpgradePrompt({ action: _action, featureName: _featureName, onClose, onOverride }: DemoUpgradePromptProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() === OVERRIDE_CODE) {
      setError('');
      onOverride?.();
    } else {
      setError('Invalid code.');
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" onClick={onClose}>
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
          <p className="text-gray-700 text-sm leading-relaxed mb-5">
            This action is disabled in demo mode.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Override Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              placeholder="Enter override code"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b]/30 focus:border-[#1e4d6b]"
              autoFocus
            />
            {error && (
              <p className="text-red-600 text-xs mt-1.5">{error}</p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-[#1e4d6b] hover:bg-[#163a52] text-white font-medium rounded-lg transition-colors text-sm"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
