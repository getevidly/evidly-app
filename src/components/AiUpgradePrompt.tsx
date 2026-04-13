import { Sparkles, Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AiUpgradePromptProps {
  feature: string;
  description: string;
  variant?: 'inline' | 'modal' | 'banner';
  onClose?: () => void;
}

/**
 * Upgrade prompt shown when standard-tier users try to access premium AI features.
 * Shows what the feature does and a CTA to upgrade.
 */
export function AiUpgradePrompt({ feature, description, variant = 'inline', onClose }: AiUpgradePromptProps) {
  const navigate = useNavigate();

  if (variant === 'banner') {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg"
        style={{ backgroundColor: '#fdf8e8', border: '1px solid #A08C5A' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#A08C5A' }}>
          <Lock className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-[#1E2D4D]">{feature}</span>
          <span className="text-xs text-[#1E2D4D]/70 ml-2">{description}</span>
        </div>
        <button
          onClick={() => navigate('/settings?tab=billing')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1 flex-shrink-0"
          style={{ backgroundColor: '#A08C5A' }}
        >
          <Sparkles className="h-3 w-3" /> Upgrade
        </button>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 modal-backdrop-enter">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 max-w-md w-full p-6 text-center modal-content-enter">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#fdf8e8' }}>
            <Sparkles className="h-7 w-7" style={{ color: '#A08C5A' }} />
          </div>
          <h3 className="text-lg font-bold text-[#1E2D4D] mb-2">Upgrade to Premium</h3>
          <p className="text-sm text-[#1E2D4D]/70 mb-1"><strong>{feature}</strong></p>
          <p className="text-sm text-[#1E2D4D]/50 mb-6">{description}</p>
          <div className="flex gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-[#1E2D4D]/15 rounded-xl text-sm font-medium text-[#1E2D4D]/80 hover:bg-[#FAF7F0]"
              >
                Maybe Later
              </button>
            )}
            <button
              onClick={() => { onClose?.(); navigate('/settings?tab=billing'); }}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: '#A08C5A' }}
            >
              <Sparkles className="h-4 w-4" /> View Plans <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // inline
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ backgroundColor: '#fdf8e8', border: '1px solid #fde68a' }}
    >
      <Lock className="h-5 w-5 mx-auto mb-2" style={{ color: '#A08C5A' }} />
      <p className="text-sm font-semibold text-[#1E2D4D] mb-1">{feature}</p>
      <p className="text-xs text-[#1E2D4D]/70 mb-3">{description}</p>
      <button
        onClick={() => navigate('/settings?tab=billing')}
        className="px-4 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 mx-auto"
        style={{ backgroundColor: '#A08C5A' }}
      >
        <Sparkles className="h-3.5 w-3.5" /> Upgrade to Premium
      </button>
    </div>
  );
}
