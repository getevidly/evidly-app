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
        <span className="text-sm text-[#1E2D4D]/70 hidden sm:block">
          {isAuthenticatedDemo
            ? 'Your profile data is saved. Upgrade to start real compliance tracking.'
            : "You're viewing sample data to preview the interface. Sign in to access your actual data."}
        </span>
        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <button
            onClick={() => navigate(isAuthenticatedDemo ? '/pricing' : '/signup')}
            className="px-4 py-2 text-sm font-semibold text-[#1E2D4D] rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: '#A08C5A' }}
          >
            {isAuthenticatedDemo ? 'Upgrade to Full Account' : 'Start Free Trial'}
          </button>
          {showBooking && (
            <a
              href="https://calendly.com/founders-getevidly/60min"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium border border-[#1E2D4D]/15 rounded-xl hover:bg-[#FAF7F0] transition-colors text-[#1E2D4D]/80"
            >
              Book a Walkthrough
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
