/**
 * Survey Expired Page — shown when the survey link has expired.
 */
import { Clock } from 'lucide-react';

export function SurveyExpiredPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Survey Expired</h1>
        <p className="text-gray-500 mb-6">
          This survey has expired. If you'd like to share feedback about your recent service, please contact us directly.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-1">HoodOps</p>
          <p>Thank you for your business.</p>
        </div>
      </div>
    </div>
  );
}
