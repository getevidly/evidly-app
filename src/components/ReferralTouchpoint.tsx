/**
 * Referral Touchpoint — shown max 1x per session
 * Appears contextually when user achieves something notable
 */
import { useState, useEffect } from 'react';
import { Gift, X, Share2, Heart, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../contexts/DemoContext';
import { shouldShowTouchpoint, markTouchpointShown } from '../lib/referralSystem';

type TouchpointVariant = 'badge_earned' | 'score_improved' | 'k2c_impact';

const VARIANTS: Record<TouchpointVariant, { icon: typeof Gift; title: string; message: string; cta: string; color: string }> = {
  badge_earned: {
    icon: Award,
    title: 'You earned a badge!',
    message: 'Share your Compliance Champion badge and earn a free month when someone signs up.',
    cta: 'Share Badge',
    color: '#d4af37',
  },
  score_improved: {
    icon: Share2,
    title: 'Score improved!',
    message: "Your compliance score went up. Tell a fellow kitchen manager about EvidLY — you'll both benefit.",
    cta: 'Invite a Peer',
    color: '#1e4d6b',
  },
  k2c_impact: {
    icon: Heart,
    title: 'Make a difference',
    message: "Every referral donates $25 to a food charity. You've helped donate $75 so far!",
    cta: 'Refer & Donate',
    color: '#ef4444',
  },
};

export function ReferralTouchpoint() {
  const { isDemoMode, presenterMode } = useDemo();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [variant, setVariant] = useState<TouchpointVariant>('badge_earned');

  useEffect(() => {
    if (!isDemoMode || presenterMode) return;
    if (!shouldShowTouchpoint()) return;

    // Show after 20s delay to not be intrusive
    const timer = setTimeout(() => {
      // Randomly pick a variant for demo
      const variants: TouchpointVariant[] = ['badge_earned', 'score_improved', 'k2c_impact'];
      setVariant(variants[Math.floor(Math.random() * variants.length)]);
      setVisible(true);
      markTouchpointShown();
    }, 20000);

    return () => clearTimeout(timer);
  }, [isDemoMode, presenterMode]);

  if (!visible) return null;

  const v = VARIANTS[variant];
  const Icon = v.icon;

  return (
    <div className="fixed bottom-24 right-6 z-50 animate-in slide-in-from-bottom-4 max-w-sm">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 relative">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-2 right-2 p-1 text-gray-300 hover:text-gray-500 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${v.color}15` }}>
            <Icon className="h-5 w-5" style={{ color: v.color }} />
          </div>
          <div className="flex-1 pr-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-0.5">{v.title}</h4>
            <p className="text-xs text-gray-500 mb-3">{v.message}</p>
            <button
              onClick={() => {
                setVisible(false);
                navigate('/referrals');
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors cursor-pointer"
              style={{ backgroundColor: v.color }}
            >
              {v.cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
