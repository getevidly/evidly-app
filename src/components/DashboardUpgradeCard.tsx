import { useNavigate } from 'react-router-dom';
import { Rocket, Check } from 'lucide-react';
import { useDemo } from '../contexts/DemoContext';

interface DashboardUpgradeCardProps {
  pagesVisited: number;
}

export function DashboardUpgradeCard({ pagesVisited }: DashboardUpgradeCardProps) {
  const { isDemoMode, presenterMode } = useDemo();
  const navigate = useNavigate();

  // Only show in demo mode after visiting 2+ pages; hide in presenter mode
  if (!isDemoMode || pagesVisited < 2 || presenterMode) return null;

  return (
    <div className="rounded-xl overflow-hidden mt-4" style={{ backgroundColor: '#0A3D6B' }}>
      <div className="px-5 sm:px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="h-5 w-5 text-[#d4af37]" />
          <h3 className="text-lg font-bold text-white">Like what you see?</h3>
        </div>

        <p className="text-sm text-gray-300 mb-4 leading-relaxed">
          Start managing your kitchen compliance today.{' '}
          Founder pricing: <span className="font-bold text-white">$99/month</span> for your first location.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <button
            onClick={() => {
              navigate('/signup');
            }}
            className="px-5 py-2.5 rounded-lg font-bold text-sm transition-colors hover:brightness-110"
            style={{ backgroundColor: '#d4af37', color: '#0A3D6B' }}
          >
            Start Free Trial — $99/month
          </button>
          <button
            onClick={() => {
              navigate('/enterprise');
            }}
            className="px-5 py-2.5 rounded-xl font-medium text-sm transition-colors text-white border border-white/30 hover:bg-white/10"
          >
            Schedule a Demo Call
          </button>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1 text-xs text-gray-300">
            <Check className="h-3.5 w-3.5 text-[#d4af37]" />
            No credit card required
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-300">
            <Check className="h-3.5 w-3.5 text-[#d4af37]" />
            14-day free trial
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-300">
            <Check className="h-3.5 w-3.5 text-[#d4af37]" />
            Cancel anytime
          </span>
        </div>
      </div>
    </div>
  );
}
