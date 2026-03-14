/**
 * Survey Already Completed Page — shown when the survey was already submitted.
 */
import { CheckCircle2, ExternalLink } from 'lucide-react';

export function SurveyCompletedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Feedback Submitted</h1>
        <p className="text-gray-500 mb-6">
          You've already submitted feedback for this service. Thank you!
        </p>
        <button
          onClick={() => {
            // TODO: Open Google review URL from survey data
            alert('Google review link will be configured by your service provider.');
          }}
          className="inline-flex items-center gap-2 bg-white border-2 border-[#1e4d6b] text-[#1e4d6b] px-6 py-3 rounded-xl font-semibold hover:bg-[#1e4d6b] hover:text-white transition-colors"
        >
          <ExternalLink className="w-5 h-5" />
          Leave a Google Review
        </button>
      </div>
    </div>
  );
}
