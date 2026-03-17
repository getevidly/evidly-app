/**
 * TestimonialCarousel — SOCIAL-PROOF-01
 *
 * County-filtered testimonial display for ScoreTable pages.
 * Shows up to 3 approved testimonials. Hides entirely when empty.
 * Fetches from Supabase — no demo/fake data.
 */
import { useState, useEffect } from 'react';
import { fetchApprovedTestimonials, type Testimonial } from '../../lib/testimonialSystem';

interface TestimonialCarouselProps {
  county: string;
  /** ScoreTable page color palette */
  colors?: {
    navy: string;
    gold: string;
    cream: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
  };
}

const DEFAULT_COLORS = {
  navy: '#25396B',
  gold: '#B8A06A',
  cream: '#FAF8F4',
  border: '#E8E6E0',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
};

export function TestimonialCarousel({ county, colors }: TestimonialCarouselProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loaded, setLoaded] = useState(false);
  const c = { ...DEFAULT_COLORS, ...colors };

  useEffect(() => {
    let cancelled = false;
    fetchApprovedTestimonials(county).then(data => {
      if (!cancelled) {
        setTestimonials(data);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [county]);

  // Hide entirely when no testimonials or still loading
  if (!loaded || testimonials.length === 0) return null;

  return (
    <div>
      {testimonials.map(t => (
        <div
          key={t.id}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '20px 22px',
            border: `1px solid ${c.border}`,
            borderLeft: `4px solid ${c.gold}`,
            marginBottom: 12,
          }}
        >
          <p
            style={{
              fontSize: '0.88rem',
              color: c.textPrimary,
              lineHeight: 1.7,
              margin: '0 0 12px',
              fontStyle: 'italic',
            }}
          >
            "{t.quote}"
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: c.navy,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {(t.author_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: c.textPrimary, margin: 0 }}>
                {t.author_name || 'Anonymous'}
              </p>
              <p style={{ fontSize: '0.72rem', color: c.textSecondary, margin: 0 }}>
                {[t.role_title, t.org_name, t.city].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
