/**
 * IRRProgressCard — Compact dashboard widget showing Operations Check results
 *
 * Read-only display of IRR submission data. No scores, no retake prompt.
 * Returns null if no submission on file.
 */

import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, ArrowRight } from 'lucide-react';
import { useIRRSubmission } from '../../hooks/useIRRSubmission';
import { IRR_QUESTIONS, POSTURE_LABELS } from '../../data/workforceRiskDemoData';

const NAVY = '#1e4d6b';
const TEXT_SEC = '#6B7F96';
const BORDER = '#D1D9E6';

const ANSWER_DISPLAY: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Yes',     color: '#166534', bg: '#DCFCE7' },
  2: { label: 'Partial', color: '#92400E', bg: '#FEF3C7' },
  3: { label: 'No',      color: '#991B1B', bg: '#FEE2E2' },
};

export function IRRProgressCard() {
  const navigate = useNavigate();
  const { submission, isLoading } = useIRRSubmission();

  if (isLoading || !submission) return null;

  const posture = POSTURE_LABELS[submission.posture];
  const dateStr = new Date(submission.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardCheck size={18} color={NAVY} />
            <span style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>
              Your Operations Check
            </span>
          </div>
          <span style={{ fontSize: 11, color: TEXT_SEC }}>{dateStr}</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 12,
              background: posture.bg,
              color: posture.color,
            }}
          >
            {posture.label}
          </span>
        </div>
      </div>

      {/* Question grid */}
      <div style={{ padding: '12px 20px 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
          {IRR_QUESTIONS.map((q) => {
            const value = (submission as Record<string, unknown>)[q.key] as number;
            const display = ANSWER_DISPLAY[value] || ANSWER_DISPLAY[3];
            return (
              <div
                key={q.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 0',
                }}
              >
                <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>
                  {q.label}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 8,
                    background: display.bg,
                    color: display.color,
                    letterSpacing: '0.02em',
                  }}
                >
                  {display.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 20px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 10, color: TEXT_SEC }}>
          Your Operations Check responses — informational only
        </span>
        <button
          onClick={() => navigate('/progress')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: NAVY,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          View Details <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
