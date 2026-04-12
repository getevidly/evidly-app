import { Link } from 'react-router-dom';
import { Home, LogIn, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Brand Mark */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#1E2D4D] mb-6">
            <span className="text-3xl font-bold text-white tracking-tight">E</span>
          </div>
        </div>

        {/* 404 */}
        <h1 className="text-7xl font-extrabold text-[#1E2D4D] mb-3 tracking-tight">404</h1>
        <h2 className="text-xl font-semibold text-[#1E2D4D] mb-3">Page not found</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-[#1E2D4D] text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-[#162340] transition-colors min-h-[44px]"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Link>
        </div>

        {/* Back link */}
        <button
          onClick={() => window.history.back()}
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1E2D4D] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Go back
        </button>

        {/* Brand footer */}
        <p className="mt-12 text-xs text-gray-400">
          EvidLY &mdash; Operations Intelligence for Commercial Kitchens
        </p>
      </div>
    </div>
  );
}
