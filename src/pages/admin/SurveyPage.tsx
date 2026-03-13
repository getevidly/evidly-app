/**
 * CSAT Survey Page — Public, no auth required
 * Route: /support/survey/:token
 * Allows customers to rate their support experience after ticket resolution.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useDemoGuard } from '../../hooks/useDemoGuard';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT_SEC = '#6B7F96';
const TEXT_MUTED = '#9CA3AF';
const BORDER = '#E2D9C8';

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
      <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: TEXT_SEC, fontSize: 14 }}>Loading survey...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: '#FFFFFF', borderRadius: 16, padding: '48px 40px', maxWidth: 440, width: '90%',
          textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#128533;</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Survey Unavailable</h1>
          <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.5 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: '40px 36px', maxWidth: 480, width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Logo / branding */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: NAVY, letterSpacing: 1 }}>EVIDLY</div>
          <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, marginTop: 2 }}>Customer Satisfaction Survey</div>
        </div>

        {submitted ? (
          /* Thank you state */
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#127775;</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Thank You!</h2>
            <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.5, marginBottom: 16 }}>
              Your feedback helps us improve our support. We appreciate you taking the time to respond.
            </p>
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 12,
            }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} style={{ fontSize: 28, color: star <= rating ? '#F59E0B' : '#E5E7EB' }}>
                  &#9733;
                </span>
              ))}
            </div>
            <p style={{ fontSize: 12, color: TEXT_MUTED }}>
              You rated your experience: <strong style={{ color: NAVY }}>{starLabels[rating - 1]}</strong>
            </p>
          </div>
        ) : (
          /* Survey form */
          <>
            {/* Ticket reference */}
            <div style={{
              background: '#F9FAFB', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                Regarding Ticket
              </div>
              <div style={{ fontSize: 14, color: NAVY, fontWeight: 600, marginBottom: 2 }}>
                {ticket?.subject}
              </div>
              <div style={{ fontSize: 12, color: TEXT_SEC }}>
                {ticket?.ticket_number}
              </div>
            </div>

            {/* Question */}
            <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, textAlign: 'center', marginBottom: 4 }}>
              How was your support experience?
            </h2>
            <p style={{ fontSize: 13, color: TEXT_SEC, textAlign: 'center', marginBottom: 20 }}>
              {ticket?.contact_name ? `Hi ${ticket.contact_name}, ` : ''}Please rate your experience below.
            </p>

            {/* Star rating */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    fontSize: 36, color: star <= (hoveredStar || rating) ? '#F59E0B' : '#D1D5DB',
                    transition: 'transform 0.15s, color 0.15s',
                    transform: star <= (hoveredStar || rating) ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  &#9733;
                </button>
              ))}
            </div>
            {(hoveredStar > 0 || rating > 0) && (
              <p style={{ textAlign: 'center', fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 16 }}>
                {starLabels[(hoveredStar || rating) - 1]}
              </p>
            )}

            {/* Optional comment */}
            <div style={{ marginTop: 16, marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: TEXT_SEC, display: 'block', marginBottom: 6 }}>
                Additional comments (optional)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Tell us more about your experience..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', background: '#F9FAFB', border: `1px solid ${BORDER}`,
                  borderRadius: 8, color: NAVY, fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              style={{
                width: '100%', padding: '12px 20px',
                background: rating === 0 || submitting ? '#E5E7EB' : GOLD,
                border: 'none', borderRadius: 10, color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                cursor: rating === 0 || submitting ? 'default' : 'pointer',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>

            {error && (
              <p style={{ fontSize: 12, color: '#DC2626', textAlign: 'center', marginTop: 10 }}>{error}</p>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 11, color: TEXT_MUTED }}>
          Powered by EvidLY Support
        </div>
      </div>
    </div>
  );
}
