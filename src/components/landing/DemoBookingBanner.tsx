import { X } from 'lucide-react';
import CalendlyButton from './CalendlyButton';
import { useDemoEngagement } from '../../hooks/useDemoEngagement';
import { useRole } from '../../contexts/RoleContext';
import { canBookMeeting } from '../../config/sidebarConfig';

export default function DemoBookingBanner() {
  const { showBooking, dismiss } = useDemoEngagement();
  const { userRole } = useRole();

  // Don't show booking banner for kitchen_manager or kitchen roles
  if (!showBooking || !canBookMeeting(userRole)) return null;

  return (
    <div className="fixed bottom-[12rem] right-4 lg:bottom-28 lg:right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] animate-slide-up">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 relative">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-bold mb-1 pr-6" style={{ color: '#1e4d6b' }}>
          Like what you see?
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Book a 15-minute live walkthrough with Arthur, EvidLY's founder.
        </p>
        <div className="flex items-center gap-3">
          <CalendlyButton text="Book Walkthrough" variant="gold" />
          <button
            onClick={dismiss}
            className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors bg-transparent border-none cursor-pointer"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
