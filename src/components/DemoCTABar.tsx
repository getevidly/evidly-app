import { useDemo } from '../contexts/DemoContext';
import { useNavigate } from 'react-router-dom';

export function DemoCTABar() {
  const { isDemoMode, presenterMode } = useDemo();
  const navigate = useNavigate();
  if (!isDemoMode || presenterMode) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg lg:pl-60">
      <div className="px-4 py-2.5 flex items-center justify-between max-w-[1200px] mx-auto">
        <span className="text-sm text-gray-600 hidden sm:block">
          You're exploring EvidLY in demo mode
        </span>
        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <button
            onClick={() => navigate('/signup')}
            className="px-4 py-2 text-sm font-semibold text-[#1e4d6b] rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: '#d4af37' }}
          >
            Start Free Trial
          </button>
          <a
            href="https://calendly.com/evidly/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
          >
            Book a Walkthrough
          </a>
        </div>
      </div>
    </div>
  );
}
