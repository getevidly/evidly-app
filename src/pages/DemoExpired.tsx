import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, MessageCircle } from 'lucide-react';

const NAVY = '#1E2D4D';
const GOLD = '#d4af37';

/**
 * Full-screen upgrade prompt shown when an authenticated demo has expired.
 * Profile data is intact — this just gates operational features.
 */
export default function DemoExpired() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F4F6FA' }}>
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: '#fef3c7' }}
        >
          <Clock className="w-10 h-10" style={{ color: '#92400e' }} />
        </div>

        {/* Headline */}
        <h1 className="text-2xl font-bold mb-3" style={{ color: NAVY }}>
          Your demo has ended
        </h1>

        {/* Body */}
        <p className="text-gray-600 mb-2 text-base leading-relaxed">
          Your account profile, locations, and jurisdiction settings are saved and ready.
        </p>
        <p className="text-gray-500 mb-8 text-sm">
          Upgrade to start your real compliance tracking — no setup required, your configuration carries over.
        </p>

        {/* What's preserved */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8 text-left">
          <h3 className="text-sm font-semibold mb-3" style={{ color: NAVY }}>
            Your data is still here:
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
              Organization profile and settings
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
              Location and facility configurations
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
              Jurisdiction authority assignments
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
              Team member roles and access
            </li>
          </ul>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/pricing')}
            className="px-8 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors hover:opacity-90"
            style={{ backgroundColor: GOLD, color: NAVY }}
          >
            Upgrade Now
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="https://calendly.com/founders-getevidly/60min"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 rounded-xl font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Talk to Us
          </a>
        </div>
      </div>
    </div>
  );
}
