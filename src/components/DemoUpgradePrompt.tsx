import { useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { canBookMeeting } from '../config/sidebarConfig';

const COPY: Record<string, { headline: string; body: string }> = {
  edit: {
    headline: 'Unlock Editing',
    body: 'Start your free trial to edit and manage your records in real-time.',
  },
  download: {
    headline: 'Unlock Downloads',
    body: 'Start your free trial to download compliance reports, inspection documents, and audit trails.',
  },
  delete: {
    headline: 'Unlock Full Management',
    body: 'Start your free trial to fully manage your records — add, edit, and remove as needed.',
  },
  export: {
    headline: 'Unlock Exports',
    body: 'Start your free trial to export your data as PDF, CSV, or send directly to inspectors.',
  },
  print: {
    headline: 'Unlock Printing',
    body: 'Start your free trial to print compliance reports and inspection-ready documents.',
  },
  invite: {
    headline: 'Unlock Team Features',
    body: 'Start your free trial to invite your team and assign roles across your locations.',
  },
  settings: {
    headline: 'Unlock Settings',
    body: 'Start your free trial to customize your compliance settings, alerts, and workflows.',
  },
};

interface DemoUpgradePromptProps {
  action: string;
  featureName?: string;
  onClose: () => void;
}

export function DemoUpgradePrompt({ action, featureName, onClose }: DemoUpgradePromptProps) {
  const navigate = useNavigate();
  const { userRole } = useRole();
  const showBooking = canBookMeeting(userRole);
  const copy = COPY[action] || COPY.edit;

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
            <div className="h-10 w-10 rounded-full bg-[#d4af37]/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[#d4af37]" />
            </div>
            <h3 className="text-lg font-bold text-white">{copy.headline}</h3>
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
          <p className="text-gray-600 text-sm leading-relaxed">
            {copy.body}
            {featureName && (
              <span className="font-medium text-gray-800"> Manage your {featureName} and more.</span>
            )}
          </p>

          <div className="mt-5 space-y-3">
            <button
              onClick={() => { onClose(); navigate('/signup'); }}
              className="w-full py-3 px-4 bg-[#d4af37] hover:bg-[#c49a2b] text-[#1e4d6b] font-bold rounded-lg transition-colors text-sm"
            >
              Start Free Trial — $99/month
            </button>
            {showBooking && (
              <button
                onClick={() => { onClose(); navigate('/enterprise'); }}
                className="w-full py-2.5 px-4 text-sm font-medium text-[#1e4d6b] hover:bg-[#eef4f8] rounded-lg transition-colors"
              >
                Schedule a Demo Call
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
