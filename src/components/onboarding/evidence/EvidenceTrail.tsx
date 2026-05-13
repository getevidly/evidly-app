import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus, ChevronUp, FileWarning, Paperclip } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useItemEvidenceTrail,
  type EvidenceMessage,
} from '../../../hooks/onboarding/useItemEvidenceTrail';
import { EvidenceComposer } from './EvidenceComposer';
import { AddParticipantModal } from './AddParticipantModal';
import { EvidenceSignal } from './EvidenceSignal';

// Keywords that gate the "File corrective action" button
const CA_KEYWORDS = [
  "hasn't arrived", "has not arrived", "broken", "doesn't work",
  "does not work", "missed", "failed", "expired", "damaged",
  "overdue", "out of compliance", "violation",
];

function shouldShowCA(body: string): boolean {
  const lower = body.toLowerCase();
  return CA_KEYWORDS.some(kw => lower.includes(kw));
}

// Initials avatar with deterministic color
const AVATAR_COLORS = [
  '#1E2D4D', '#2E7D32', '#C62828', '#AD6200', '#6A1B9A', '#00695C',
];

function getColor(id: string) {
  let h = 0;
  for (const c of id) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

// Timestamp: "May 14, 2:33 PM"
function fmtTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

const OWNER_ROLES = ['owner', 'owner_operator', 'executive'];

interface EvidenceTrailProps {
  requirementCode: string;
  pillar: 'food_safety' | 'fire_safety';
  requirementLabel: string;
  onCollapse: () => void;
  onSummaryRefresh?: () => void;
}

export function EvidenceTrail({
  requirementCode,
  pillar,
  requirementLabel,
  onCollapse,
  onSummaryRefresh,
}: EvidenceTrailProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const {
    threadId,
    messages,
    participants,
    signals,
    messageCount,
    attachmentCount,
    loading,
    sendMessage,
    addParticipant,
  } = useItemEvidenceTrail(orgId, requirementCode, pillar, true);

  const [showAddModal, setShowAddModal] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const handleCA = (msg: EvidenceMessage) => {
    sessionStorage.setItem(
      'evidence_ca_context',
      JSON.stringify({
        title: `Evidence: ${requirementLabel}`,
        description: msg.body,
        severity: 'medium',
        category: pillar === 'fire_safety' ? 'fire_safety' : 'food_safety',
        source: 'Evidence Trail',
      })
    );
    navigate('/corrective-actions?from=evidence-trail');
  };

  const handleSend = async (body: string, files?: File[]) => {
    try {
      await sendMessage(body, files);
      onSummaryRefresh?.();
    } catch (err) {
      console.error('Failed to send evidence entry:', err);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 text-center border-t border-[#E2DDD4]">
        <div className="w-4 h-4 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="border-t border-[#E2DDD4] bg-[#FAFAF6]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#E2DDD4]/60">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#1E2D4D]" />
          <span className="text-xs font-medium text-[#1E2D4D]">
            Evidence trail &middot; {messageCount}{' '}
            {messageCount === 1 ? 'entry' : 'entries'}
            {attachmentCount > 0 &&
              ` \u00B7 ${attachmentCount} ${attachmentCount === 1 ? 'attachment' : 'attachments'}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {threadId && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="text-[10px] text-[#1E2D4D] hover:underline flex items-center gap-1"
            >
              <UserPlus size={12} /> Add
            </button>
          )}
          <button
            type="button"
            onClick={onCollapse}
            className="text-[#8A93A6] hover:text-[#1E2D4D]"
          >
            <ChevronUp size={14} />
          </button>
        </div>
      </div>

      {/* Signal callout — only when real signal exists */}
      {signals.length > 0 && <EvidenceSignal signals={signals} />}

      {/* Message list */}
      <div ref={listRef} className="max-h-[300px] overflow-y-auto px-4 py-2 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-[#8A93A6] text-center py-4">
            No evidence yet. Add the first entry below.
          </p>
        )}
        {messages.map(msg => {
          const isOwner = OWNER_ROLES.includes(msg.sender_role);
          const showCABtn = shouldShowCA(msg.body);
          return (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2 ${
                isOwner
                  ? 'bg-white border border-[#E2DDD4]/60'
                  : 'bg-[#EEF2FF] border border-[#D4DFFA]/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: getColor(msg.sender_user_id) }}
                >
                  {initials(msg.sender_name)}
                </div>
                <span className="text-[11px] font-medium text-[#1E2D4D]">
                  {msg.sender_name}
                </span>
                <span className="text-[10px] text-[#8A93A6]">
                  {fmtTime(msg.created_at)}
                </span>
              </div>
              <p className="text-xs text-[#1E2D4D]/90 whitespace-pre-wrap">{msg.body}</p>
              {/* Attachments */}
              {msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {msg.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-[#1E2D4D] bg-white border border-[#E2DDD4] rounded px-2 py-0.5 hover:border-[#1E2D4D]"
                    >
                      <Paperclip size={10} />
                      {att.name}
                    </a>
                  ))}
                </div>
              )}
              {/* Prevent action button — keyword-gated */}
              {showCABtn && (
                <button
                  type="button"
                  onClick={() => handleCA(msg)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-[#C62828] hover:underline"
                >
                  <FileWarning size={10} /> File corrective action
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <EvidenceComposer onSend={handleSend} />

      {/* Add participant modal */}
      {showAddModal && threadId && orgId && (
        <AddParticipantModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          orgId={orgId}
          existingParticipantIds={participants.map(p => p.user_id)}
          onAdd={addParticipant}
        />
      )}
    </div>
  );
}
