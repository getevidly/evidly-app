/**
 * Survey Detail Page — view a single survey response.
 * Route: /surveys/:id (authenticated)
 */
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, CheckCircle2, Clock, ExternalLink, Send, AlertTriangle, MessageSquare } from 'lucide-react';
import { useSurvey } from '../../hooks/api/useSurveys';

function RatingRow({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={`w-4 h-4 ${s <= value ? 'fill-amber-400 text-amber-400' : 'fill-none text-gray-200'}`} />
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">{value}/5</span>
      </div>
    </div>
  );
}

function TimelineItem({ icon: Icon, label, time, color }: { icon: typeof Clock; label: string; time: string | null; color: string }) {
  if (!time) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{new Date(time).toLocaleString()}</p>
      </div>
    </div>
  );
}

export function SurveyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: survey, isLoading } = useSurvey(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900">Survey not found</h3>
        <button onClick={() => navigate('/surveys')} className="mt-3 text-sm text-[#1e4d6b] hover:underline">
          Back to surveys
        </button>
      </div>
    );
  }

  const hasDetailedRatings = survey.quality_rating || survey.professionalism_rating || survey.timeliness_rating || survey.communication_rating;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/surveys')} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Survey Details</h1>
          <p className="text-sm text-gray-500">{survey.recipient_name || 'Customer'} &middot; {new Date(survey.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overall Rating */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Rating</h2>
            {survey.overall_rating ? (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-8 h-8 ${s <= survey.overall_rating! ? 'fill-amber-400 text-amber-400' : 'fill-none text-gray-200'}`} />
                  ))}
                </div>
                <p className="text-3xl font-bold text-gray-900">{survey.overall_rating}/5</p>
                <p className="text-sm text-gray-500 mt-1">
                  {survey.overall_rating >= 4 ? 'Positive review' : 'Needs attention'}
                </p>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-6">No rating submitted yet</p>
            )}

            {hasDetailedRatings && (
              <div className="border-t border-gray-100 mt-4 pt-4">
                <RatingRow label="Quality of Work" value={survey.quality_rating} />
                <RatingRow label="Professionalism" value={survey.professionalism_rating} />
                <RatingRow label="Timeliness" value={survey.timeliness_rating} />
                <RatingRow label="Communication" value={survey.communication_rating} />
              </div>
            )}
          </div>

          {/* Feedback */}
          {(survey.feedback_text || survey.would_recommend !== null) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Feedback</h2>
              {survey.would_recommend !== null && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-600">Would recommend:</span>
                  <span className={`text-sm font-medium ${survey.would_recommend ? 'text-green-600' : 'text-red-600'}`}>
                    {survey.would_recommend ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
              {survey.feedback_text && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 italic">"{survey.feedback_text}"</p>
                </div>
              )}
            </div>
          )}

          {/* Follow-up (for low ratings) */}
          {survey.requires_followup && (
            <div className="bg-white rounded-xl border border-red-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold text-red-700">Follow-up Required</h2>
              </div>
              {survey.followup_handled_at ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 font-medium">Handled on {new Date(survey.followup_handled_at).toLocaleDateString()}</p>
                  {survey.followup_notes && <p className="text-sm text-green-600 mt-1">{survey.followup_notes}</p>}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">This customer gave a low rating and hasn't been contacted yet.</p>
                  <button className="mt-3 text-sm font-medium text-[#1e4d6b] hover:underline">
                    Mark as Handled
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h3>
            <div className="space-y-1">
              <TimelineItem icon={Clock} label="Created" time={survey.created_at} color="bg-gray-400" />
              <TimelineItem icon={Send} label="Sent" time={survey.sent_at} color="bg-blue-500" />
              <TimelineItem icon={Send} label="Reminder Sent" time={survey.reminder_sent_at} color="bg-blue-400" />
              <TimelineItem icon={CheckCircle2} label="Completed" time={survey.completed_at} color="bg-green-500" />
            </div>
          </div>

          {/* Google Review */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Google Review</h3>
            {survey.google_review_clicked ? (
              <div className="flex items-center gap-2 text-green-600">
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">Customer clicked review link</span>
              </div>
            ) : survey.google_review_prompted ? (
              <p className="text-sm text-gray-500">Prompted but not clicked</p>
            ) : (
              <p className="text-sm text-gray-400">Not prompted</p>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="font-medium text-gray-900">{survey.recipient_name || '—'}</p>
              </div>
              <div>
                <span className="text-gray-500">Email</span>
                <p className="font-medium text-gray-900">{survey.recipient_email || '—'}</p>
              </div>
              <div>
                <span className="text-gray-500">Phone</span>
                <p className="font-medium text-gray-900">{survey.recipient_phone || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
