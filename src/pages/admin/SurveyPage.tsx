/**
 * CSAT Survey Page — Public, no auth required
 * Route: /support/survey/:token
 * Allows customers to rate their support experience after ticket resolution.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useDemoGuard } from '../../hooks/useDemoGuard';

interface TicketInfo {
  id: string;
  ticket_number: string;
  subject: string;
  contact_name: string | null;
  satisfaction_score: number | null;
}

export default function SurveyPage() {
  useDemoGuard();
  const { token } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid survey link.');
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error: fetchErr } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, subject, contact_name, satisfaction_score')
        .eq('csat_token', token)
        .single();

      if (fetchErr || !data) {
        setError('Survey not found or link has expired.');
      } else if (data.satisfaction_score) {
        setTicket(data);
        setRating(data.satisfaction_score);
        setSubmitted(true);
      } else {
        setTicket(data);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!ticket || rating === 0) return;
    setSubmitting(true);
    const { error: updateErr } = await supabase
      .from('support_tickets')
      .update({
        satisfaction_score: rating,
        csat_comment: comment.trim() || null,
        csat_completed_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    if (updateErr) {
      setError('Failed to submit survey. Please try again.');
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const starLabels = ['Very Poor', 'Poor', 'Okay', 'Good', 'Excellent'];

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-warm flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-[3px] border-gray-200 border-t-gold rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate_ui text-sm">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="min-h-screen bg-cream-warm flex items-center justify-center">
        <div className="bg-white rounded-2xl px-10 py-12 max-w-[440px] w-[90%] text-center shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
          <div className="text-[48px] mb-4">&#128533;</div>
          <h1 className="text-xl font-bold text-navy mb-2">Survey Unavailable</h1>
          <p className="text-sm text-slate_ui leading-normal">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-warm flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl px-9 py-10 max-w-[480px] w-full shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
        {/* Logo / branding */}
        <div className="text-center mb-7">
          <div className="text-sm font-extrabold text-navy tracking-[1px]">EVIDLY</div>
          <div className="text-[11px] text-gold font-semibold mt-0.5">Customer Satisfaction Survey</div>
        </div>

        {submitted ? (
          /* Thank you state */
          <div className="text-center">
            <div className="text-[48px] mb-4">&#127775;</div>
            <h2 className="text-xl font-bold text-navy mb-2">Thank You!</h2>
            <p className="text-sm text-slate_ui leading-normal mb-4">
              Your feedback helps us improve our support. We appreciate you taking the time to respond.
            </p>
            <div className="flex justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className={`text-[28px] ${star <= rating ? 'text-amber-400' : 'text-gray-200'}`}>
                  &#9733;
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              You rated your experience: <strong className="text-navy">{starLabels[rating - 1]}</strong>
            </p>
          </div>
        ) : (
          /* Survey form */
          <>
            {/* Ticket reference */}
            <div className="bg-gray-50 border border-border_ui-warm rounded-[10px] px-4 py-3.5 mb-6">
              <div className="text-[11px] text-gray-400 font-semibold uppercase mb-1">
                Regarding Ticket
              </div>
              <div className="text-sm text-navy font-semibold mb-0.5">
                {ticket?.subject}
              </div>
              <div className="text-xs text-slate_ui">
                {ticket?.ticket_number}
              </div>
            </div>

            {/* Question */}
            <h2 className="text-base font-bold text-navy text-center mb-1">
              How was your support experience?
            </h2>
            <p className="text-[13px] text-slate_ui text-center mb-5">
              {ticket?.contact_name ? `Hi ${ticket.contact_name}, ` : ''}Please rate your experience below.
            </p>

            {/* Star rating */}
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className={`bg-transparent border-none cursor-pointer p-1 text-[36px] transition-transform duration-150 ${
                    star <= (hoveredStar || rating) ? 'text-amber-400 scale-[1.15]' : 'text-gray-300 scale-100'
                  }`}
                >
                  &#9733;
                </button>
              ))}
            </div>
            {(hoveredStar > 0 || rating > 0) && (
              <p className="text-center text-[13px] text-gold font-semibold mb-4">
                {starLabels[(hoveredStar || rating) - 1]}
              </p>
            )}

            {/* Optional comment */}
            <div className="mt-4 mb-5">
              <label className="text-xs text-slate_ui block mb-1.5">
                Additional comments (optional)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Tell us more about your experience..."
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-50 border border-border_ui-warm rounded-lg text-navy text-[13px] resize-y box-border"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className={`w-full px-5 py-3 border-none rounded-[10px] text-white text-sm font-bold ${
                rating === 0 || submitting
                  ? 'bg-gray-200 cursor-default'
                  : 'bg-gold cursor-pointer'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>

            {error && (
              <p className="text-xs text-red-600 text-center mt-2.5">{error}</p>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-7 text-[11px] text-gray-400">
          Powered by EvidLY Support
        </div>
      </div>
    </div>
  );
}
