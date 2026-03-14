/**
 * Public Survey Page — customers rate their service experience.
 * Route: /survey/:token (no auth required)
 * Multi-step wizard: Rating → Details → Feedback → Thank You
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Send, ExternalLink, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

type Step = 'loading' | 'rating' | 'details' | 'feedback' | 'thankyou' | 'expired' | 'completed' | 'error';

interface SurveyData {
  id: string;
  token: string;
  recipient_name: string | null;
  overall_rating: number | null;
  completed_at: string | null;
  expires_at: string;
  status: string;
  google_review_prompted: boolean;
  google_review_clicked: boolean;
  job?: {
    service_date: string;
    service_types: string[];
    technician_name: string;
  };
  location?: {
    name: string;
    address: string;
  };
  vendor?: {
    google_business_url: string | null;
    google_review_threshold: number;
    company_name: string;
  };
}

function StarRating({ value, onChange, size = 'lg' }: { value: number; onChange: (v: number) => void; size?: 'sm' | 'lg' }) {
  const [hover, setHover] = useState(0);
  const starSize = size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';

  return (
    <div className="flex items-center gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`${starSize} transition-transform hover:scale-110 focus:outline-none`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
        >
          <Star
            className={`w-full h-full transition-colors ${
              star <= (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-none text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function DetailRatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <StarRating value={value} onChange={onChange} size="sm" />
    </div>
  );
}

export function SurveyPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [overallRating, setOverallRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleClicked, setGoogleClicked] = useState(false);

  useEffect(() => {
    if (!token) { setStep('error'); return; }
    // TODO: Fetch survey by token from Supabase
    // For now, show a placeholder that indicates the system is live but data will come from API
    const timer = setTimeout(() => {
      // Stub: In production, fetch from supabase
      // const { data } = await supabase.from('customer_surveys').select('*').eq('token', token).single();
      setStep('error');
    }, 1500);
    return () => clearTimeout(timer);
  }, [token]);

  const handleSubmit = async () => {
    if (!survey || !token) return;
    setSubmitting(true);
    try {
      // TODO: Submit to Supabase
      // await supabase.from('customer_surveys').update({
      //   overall_rating: overallRating,
      //   quality_rating: qualityRating || null,
      //   professionalism_rating: professionalismRating || null,
      //   timeliness_rating: timelinessRating || null,
      //   communication_rating: communicationRating || null,
      //   feedback_text: feedbackText || null,
      //   would_recommend: wouldRecommend,
      //   completed_at: new Date().toISOString(),
      //   status: 'completed',
      //   google_review_prompted: overallRating >= (survey.vendor?.google_review_threshold || 4),
      // }).eq('token', token);
      setStep('thankyou');
    } catch {
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleReviewClick = () => {
    setGoogleClicked(true);
    // TODO: Update google_review_clicked in Supabase
    if (survey?.vendor?.google_business_url) {
      window.open(survey.vendor.google_business_url, '_blank');
    }
  };

  const showGooglePrompt = overallRating >= (survey?.vendor?.google_review_threshold || 4);

  // ── Loading ──────────────────────────────
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1e4d6b] mx-auto" />
          <p className="mt-4 text-gray-500">Loading survey...</p>
        </div>
      </div>
    );
  }

  // ── Error/Not Found ──────────────────────
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Survey Not Found</h1>
          <p className="text-gray-500">This survey link is invalid or has been removed. Please contact the service provider for assistance.</p>
        </div>
      </div>
    );
  }

  // ── Expired ──────────────────────────────
  if (step === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Survey Expired</h1>
          <p className="text-gray-500 mb-4">This survey has expired. Please contact us directly if you'd like to share feedback.</p>
          <p className="text-sm text-gray-400">Thank you for your business.</p>
        </div>
      </div>
    );
  }

  // ── Already Completed ────────────────────
  if (step === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Already Submitted</h1>
          <p className="text-gray-500 mb-6">You've already submitted feedback for this service. Thank you!</p>
          {survey?.vendor?.google_business_url && !survey.google_review_clicked && (
            <button
              onClick={handleGoogleReviewClick}
              className="inline-flex items-center gap-2 bg-white border-2 border-[#1e4d6b] text-[#1e4d6b] px-6 py-3 rounded-xl font-semibold hover:bg-[#1e4d6b] hover:text-white transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Leave a Google Review
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Main Survey Flow ─────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e4d6b] px-6 py-6 text-center">
          <h1 className="text-2xl font-bold text-white">HoodOps</h1>
          <p className="text-blue-100 mt-1 text-sm">Service Feedback</p>
        </div>

        <div className="p-6">
          {/* Job Details */}
          {survey?.job && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
              <div className="grid grid-cols-2 gap-2 text-gray-600">
                {survey.location?.name && (
                  <div>
                    <span className="text-gray-400">Location</span>
                    <p className="font-medium text-gray-800">{survey.location.name}</p>
                  </div>
                )}
                {survey.job.service_date && (
                  <div>
                    <span className="text-gray-400">Date</span>
                    <p className="font-medium text-gray-800">{survey.job.service_date}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step: Overall Rating */}
          {step === 'rating' && (
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">How was your service?</h2>
              <p className="text-gray-500 mb-8">Tap a star to rate your experience</p>
              <StarRating value={overallRating} onChange={setOverallRating} />
              {overallRating > 0 && (
                <div className="mt-2 text-sm text-gray-500">
                  {overallRating === 5 && 'Excellent!'}
                  {overallRating === 4 && 'Great!'}
                  {overallRating === 3 && 'Good'}
                  {overallRating === 2 && 'Fair'}
                  {overallRating === 1 && 'Poor'}
                </div>
              )}
              <button
                onClick={() => setStep('details')}
                disabled={overallRating === 0}
                className="mt-8 w-full bg-[#1e4d6b] text-white py-3 rounded-xl font-semibold disabled:opacity-40 hover:bg-[#163a52] transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {/* Step: Detail Ratings */}
          {step === 'details' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Rate the details</h2>
              <p className="text-gray-500 text-sm mb-4">Optional — skip if you prefer</p>
              <div className="mb-6">
                <DetailRatingRow label="Quality of Work" value={qualityRating} onChange={setQualityRating} />
                <DetailRatingRow label="Professionalism" value={professionalismRating} onChange={setProfessionalismRating} />
                <DetailRatingRow label="Timeliness" value={timelinessRating} onChange={setTimelinessRating} />
                <DetailRatingRow label="Communication" value={communicationRating} onChange={setCommunicationRating} />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('feedback')}
                  className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => setStep('feedback')}
                  className="flex-1 bg-[#1e4d6b] text-white py-3 rounded-xl font-semibold hover:bg-[#163a52] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step: Feedback */}
          {step === 'feedback' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {overallRating >= 4 ? 'Anything else you\'d like to share?' : 'We\'d love to hear more'}
              </h2>
              {overallRating < 4 && (
                <p className="text-gray-500 text-sm mb-4">
                  We're sorry we didn't meet your expectations. Your feedback helps us improve.
                </p>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Would you recommend us?</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWouldRecommend(true)}
                    className={`flex-1 py-2.5 rounded-lg border-2 font-medium transition-colors ${
                      wouldRecommend === true
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setWouldRecommend(false)}
                    className={`flex-1 py-2.5 rounded-lg border-2 font-medium transition-colors ${
                      wouldRecommend === false
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional feedback <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent resize-none"
                  placeholder={overallRating < 4 ? 'Tell us what went wrong...' : 'Share your experience...'}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[#1e4d6b] text-white py-3 rounded-xl font-semibold hover:bg-[#163a52] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step: Thank You */}
          {step === 'thankyou' && (
            <div className="text-center py-4">
              {showGooglePrompt ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Thank you for your feedback!</h2>
                  <p className="text-gray-500 mb-6">We're glad you had a great experience. Would you mind sharing it on Google?</p>
                  {survey?.vendor?.google_business_url && (
                    <>
                      <button
                        onClick={handleGoogleReviewClick}
                        className="w-full bg-white border-2 border-[#1e4d6b] text-[#1e4d6b] py-3 rounded-xl font-semibold hover:bg-[#1e4d6b] hover:text-white transition-colors flex items-center justify-center gap-2 mb-3"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Leave a Google Review
                      </button>
                      {!googleClicked && (
                        <button onClick={() => {}} className="text-sm text-gray-400 hover:text-gray-600">
                          Maybe later
                        </button>
                      )}
                      {googleClicked && (
                        <p className="text-sm text-green-600 font-medium">Thank you for sharing!</p>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-[#1e4d6b]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">We appreciate your feedback</h2>
                  <p className="text-gray-500 mb-2">We're sorry we didn't meet your expectations.</p>
                  <p className="text-gray-500 mb-4">Your feedback has been sent to our team and a manager will follow up shortly.</p>
                  <p className="text-sm text-gray-400">Thank you for helping us improve.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 text-center">
          <p className="text-xs text-gray-400">Powered by HoodOps</p>
        </div>
      </div>
    </div>
  );
}
