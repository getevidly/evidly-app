import { useDemo } from '../contexts/DemoContext';
import { useRole } from '../contexts/RoleContext';
import { useNavigate } from 'react-router-dom';
import { canBookMeeting } from '../config/sidebarConfig';

export function DemoCTABar() {
  const { isDemoMode, isAuthenticatedDemo, presenterMode } = useDemo();
  const { userRole } = useRole();
  const navigate = useNavigate();
  if (presenterMode) return null;
  if (!isDemoMode && !isAuthenticatedDemo) return null;

  const showBooking = canBookMeeting(userRole);

  return (
    <div className="fixed bottom-14 lg:bottom-[52px] left-0 right-0 z-30 bg-white border-t shadow-lg lg:pl-60">
      <div className="px-4 py-2.5 flex items-center justify-between max-w-[1200px] mx-auto">
        <span className="text-sm text-gray-600 hidden sm:block">
          {isAuthenticatedDemo
            ? 'Your profile data is saved. Upgrade to start real compliance tracking.'
            : "You're viewing sample data to preview the interface. Sign in to access your actual data."}
        </span>
        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <button
            onClick={() => navigate(isAuthenticatedDemo ? '/pricing' : '/signup')}
            className="px-4 py-2 text-sm font-semibold text-[#1e4d6b] rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: '#d4af37' }}
          >
            {isAuthenticatedDemo ? 'Upgrade to Full Account' : 'Start Free Trial'}
          </button>
          {showBooking && (
            <a
              href="https://calendly.com/founders-getevidly/60min"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
            >
              Book a Walkthrough
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
