/**
 * Survey Management — list all customer surveys with stats.
 * Route: /surveys (authenticated)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Star, MessageSquare, ExternalLink, Send, Eye, AlertTriangle, Clock, Filter } from 'lucide-react';
import { useSurveys, useSurveyStats, type CustomerSurvey } from '../../hooks/api/useSurveys';

type TabKey = 'all' | 'pending' | 'low_ratings' | 'followup';

const TABS: { key: TabKey; label: string; icon: typeof Star }[] = [
  { key: 'all', label: 'All', icon: MessageSquare },
  { key: 'pending', label: 'Pending Response', icon: Clock },
  { key: 'low_ratings', label: 'Low Ratings', icon: AlertTriangle },
  { key: 'followup', label: 'Needs Follow-up', icon: Send },
];

function StarsDisplay({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-gray-400 text-sm">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-none text-gray-200'}`}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
    expired: 'bg-orange-50 text-orange-600',
    bounced: 'bg-red-50 text-red-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function SurveysPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const { data: stats } = useSurveyStats();
  const { data: surveys, isLoading } = useSurveys(
    activeTab === 'low_ratings' ? { maxRating: 3 } :
    activeTab === 'followup' ? { requiresFollowup: true } :
    activeTab === 'pending' ? { status: 'sent' } :
    undefined
  );

  const statCards = [
    { label: 'Sent This Month', value: stats?.totalSent ?? 0, icon: Send, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Response Rate', value: stats ? `${stats.responseRate}%` : '0%', icon: BarChart3, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Avg Rating', value: stats?.averageRating ? stats.averageRating.toFixed(1) : '—', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Google Reviews', value: stats?.googleReviewClicks ?? 0, icon: ExternalLink, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Surveys</h1>
          <p className="text-sm text-gray-500 mt-1">Track customer feedback and Google review performance</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'border-[#1e4d6b] text-[#1e4d6b]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b] mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading surveys...</p>
        </div>
      ) : !surveys || surveys.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No surveys yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Surveys are automatically sent to customers after job completion. Configure survey settings to get started.
          </p>
          <button
            onClick={() => navigate('/settings/surveys')}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#1e4d6b] hover:underline"
          >
            Configure Survey Settings
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Google</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((survey: CustomerSurvey) => (
                  <tr
                    key={survey.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/surveys/${survey.id}`)}
                  >
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(survey.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {survey.recipient_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {survey.location?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StarsDisplay rating={survey.overall_rating} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={survey.status} />
                    </td>
                    <td className="px-4 py-3">
                      {survey.google_review_clicked ? (
                        <span className="text-green-600 text-xs font-medium">Clicked</span>
                      ) : survey.google_review_prompted ? (
                        <span className="text-gray-400 text-xs">Prompted</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 text-gray-400 hover:text-[#1e4d6b] rounded-lg hover:bg-gray-100">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
