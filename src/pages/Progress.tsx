/**
 * Progress — Operations Check results (read-only)
 *
 * Shows the operator's IRR submission with platform feature links.
 * No scores, no grades, no retake prompt. Advisory language only.
 */

import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, ArrowRight, Info, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { RoleGuard } from '../components/auth/RoleGuard';
import { useIRRSubmission } from '../hooks/useIRRSubmission';
import { IRR_QUESTIONS, POSTURE_LABELS } from '../data/workforceRiskDemoData';

const NAVY = '#1e4d6b';
const TEXT_SEC = '#6B7F96';
const BORDER = '#D1D9E6';

const ANSWER_CONFIG: Record<number, { label: string; color: string; bg: string; border: string; Icon: typeof CheckCircle2 }> = {
  1: { label: 'Yes',     color: '#166534', bg: '#F0FDF4', border: '#BBF7D0', Icon: CheckCircle2 },
  2: { label: 'Partial', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', Icon: AlertCircle },
  3: { label: 'No',      color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', Icon: XCircle },
};

/** Platform feature label from path */
const PATH_LABELS: Record<string, string> = {
  '/temp-logs': 'Temperature Logs',
  '/checklists': 'Checklists',
  '/dashboard/training': 'Training Records',
  '/facility-safety': 'Facility Safety',
  '/vendors': 'Vendors',
};

export default function Progress() {
  const navigate = useNavigate();
  const { submission, isLoading } = useIRRSubmission();

  if (isLoading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 48, background: '#E5E7EB', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state — no IRR on file
  if (!submission) {
    return (
      <RoleGuard
        allowedRoles={['platform_admin', 'owner_operator', 'executive', 'compliance_manager']}
        fallback={<AccessDenied />}
      >
        <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
          <ClipboardCheck style={{ width: 48, height: 48, color: '#9CA3AF', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 8 }}>
            No Operations Check on File
          </h2>
          <p style={{ fontSize: 13, color: TEXT_SEC, lineHeight: 1.6, margin: 0 }}>
            The Operations Check is a free self-assessment that identifies gaps in your food safety
            and facility safety documentation. When you complete one, your results will appear here.
          </p>
        </div>
      </RoleGuard>
    );
  }

  const posture = POSTURE_LABELS[submission.posture];
  const dateStr = new Date(submission.created_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const foodQuestions = IRR_QUESTIONS.filter(q => q.group === 'Food Safety');
  const facilityQuestions = IRR_QUESTIONS.filter(q => q.group === 'Facility Safety');

  return (
    <RoleGuard
      allowedRoles={['platform_admin', 'owner_operator', 'executive', 'compliance_manager']}
      fallback={<AccessDenied />}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <ClipboardCheck style={{ width: 22, height: 22, color: NAVY }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>
              Operations Check
            </h1>
          </div>
          {submission.business_name && (
            <p style={{ fontSize: 14, color: '#374151', margin: '4px 0 0 32px', fontWeight: 600 }}>
              {submission.business_name}
            </p>
          )}
          <p style={{ fontSize: 12, color: TEXT_SEC, margin: '4px 0 0 32px' }}>{dateStr}</p>
        </div>

        {/* Posture label */}
        <div
          style={{
            background: posture.bg,
            border: `1px solid ${posture.color}30`,
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: posture.color }}>
            {posture.label}
          </span>
        </div>

        {/* Food Safety section */}
        <SectionGroup
          title="Food Safety"
          questions={foodQuestions}
          submission={submission}
          navigate={navigate}
        />

        {/* Facility Safety section */}
        <SectionGroup
          title="Facility Safety"
          questions={facilityQuestions}
          submission={submission}
          navigate={navigate}
        />

        {/* Advisory disclaimer */}
        <div
          style={{
            background: '#F9FAFB',
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: '14px 18px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            marginTop: 24,
          }}
        >
          <Info style={{ width: 16, height: 16, color: TEXT_SEC, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: TEXT_SEC, lineHeight: 1.6, margin: 0 }}>
            Your Operations Check responses are provided for informational purposes only. EvidLY does not
            generate compliance scores or determine regulatory status. Consult your carrier or broker to
            confirm your Protective Safeguards Endorsement requirements.
          </p>
        </div>
      </div>
    </RoleGuard>
  );
}

// ── Section Group ────────────────────────────────────────────

function SectionGroup({
  title,
  questions,
  submission,
  navigate,
}: {
  title: string;
  questions: typeof IRR_QUESTIONS;
  submission: Record<string, unknown>;
  navigate: (path: string) => void;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 10 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {questions.map((q) => {
          const value = submission[q.key] as number;
          const config = ANSWER_CONFIG[value] || ANSWER_CONFIG[3];
          const { Icon } = config;
          const platformLabel = PATH_LABELS[q.path] || q.path;
          return (
            <div
              key={q.key}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <Icon
                  size={16}
                  style={{ color: config.color, flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E2D4D' }}>
                    {q.label}
                  </div>
                  <button
                    onClick={() => navigate(q.path)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 11,
                      color: NAVY,
                      fontWeight: 500,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      marginTop: 2,
                    }}
                  >
                    <ArrowRight size={10} /> {platformLabel}
                  </button>
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 8,
                  background: config.bg,
                  color: config.color,
                  border: `1px solid ${config.border}`,
                  flexShrink: 0,
                }}
              >
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Access Denied Fallback ───────────────────────────────────

function AccessDenied() {
  return (
    <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
      <ClipboardCheck style={{ width: 48, height: 48, color: '#9CA3AF', margin: '0 auto 16px' }} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E2D4D', marginBottom: 8 }}>
        Access Restricted
      </h2>
      <p style={{ fontSize: 14, color: '#6B7F96' }}>
        Operations Check results are available to owners, executives, and compliance managers.
      </p>
    </div>
  );
}
