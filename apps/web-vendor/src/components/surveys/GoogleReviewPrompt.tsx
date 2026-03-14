/**
 * Google Review Prompt — shown after positive survey submission.
 */
import { ExternalLink } from 'lucide-react';

interface GoogleReviewPromptProps {
  googleUrl: string;
  rating: number;
  onReviewClick: () => void;
  clicked: boolean;
}

export function GoogleReviewPrompt({ googleUrl, rating, onReviewClick, clicked }: GoogleReviewPromptProps) {
  const handleClick = () => {
    onReviewClick();
    window.open(googleUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
      <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-10 h-10">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">Share your experience on Google</h3>
      <p className="text-sm text-gray-500 mb-4">Your {rating}-star rating helps other customers find great service</p>
      {clicked ? (
        <p className="text-sm text-green-600 font-medium">Thank you for sharing your review!</p>
      ) : (
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-2 bg-white border-2 border-[#1e4d6b] text-[#1e4d6b] px-6 py-3 rounded-xl font-semibold hover:bg-[#1e4d6b] hover:text-white transition-colors"
        >
          <ExternalLink className="w-5 h-5" />
          Leave a Google Review
        </button>
      )}
    </div>
  );
}
