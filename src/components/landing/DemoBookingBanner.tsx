import { X } from 'lucide-react';
import CalendlyButton from './CalendlyButton';
import { useDemoEngagement } from '../../hooks/useDemoEngagement';

export default function DemoBookingBanner() {
  const { showBooking, dismiss } = useDemoEngagement();

  if (!showBooking) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 transform transition-transform duration-500 animate-slide-up">
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1" style={{ color: '#1e4d6b' }}>
                Like what you see?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Book a 15-minute live walkthrough with Arthur, EvidLY's founder.
                See how it works with YOUR kitchen.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <CalendlyButton text="Book Free Walkthrough" variant="gold" />
                <button
                  onClick={dismiss}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors bg-transparent border-none cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 bg-transparent border-none cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
