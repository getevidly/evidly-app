/**
 * Customer Satisfaction Widget — dashboard card showing survey stats.
 */
import { useNavigate } from 'react-router-dom';
import { Star, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';
import { useSurveyStats } from '../../hooks/api/useSurveys';

export function CustomerSatisfactionWidget() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useSurveyStats();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-10 bg-gray-200 rounded w-20 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>
    );
  }

  const avgRating = stats?.averageRating ?? 0;
  const responseRate = stats?.responseRate ?? 0;
  const totalSent = stats?.totalSent ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Customer Satisfaction</h3>
        <button
          onClick={() => navigate('/surveys')}
          className="text-xs text-[#1e4d6b] hover:underline flex items-center gap-1"
        >
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {totalSent === 0 ? (
        <div className="text-center py-4">
          <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No surveys sent yet</p>
          <button
            onClick={() => navigate('/settings/surveys')}
            className="mt-2 text-xs text-[#1e4d6b] hover:underline"
          >
            Configure surveys
          </button>
        </div>
      ) : (
        <>
          {/* Average Rating */}
          <div className="flex items-end gap-3 mb-4">
            <span className="text-4xl font-bold text-gray-900">
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            </span>
            <div className="flex items-center gap-0.5 mb-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${
                    s <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-none text-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{responseRate}%</p>
                <p className="text-xs text-gray-500">Response rate</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{totalSent}</p>
                <p className="text-xs text-gray-500">Sent this month</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
