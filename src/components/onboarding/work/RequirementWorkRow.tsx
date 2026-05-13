import { useNavigate } from 'react-router-dom';
import { Upload, ExternalLink, UserPlus, Send } from 'lucide-react';
import type { PillarRequirement } from '../../../hooks/onboarding/usePillarRequirements';
import { StatusIcon } from '../shared/StatusIcon';
import { ACTION_LABELS, ROLE_LABELS } from './workConstants';

export interface CommitEntry {
  requirement_code: string;
  choice: 'me' | 'invite' | 'skip';
  invite_role?: string;
  skip_reason?: string;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
}

export interface InviteInfo {
  email: string;
  full_name: string | null;
  status: 'pending' | 'accepted' | 'expired';
  role?: string;
}

interface RequirementWorkRowProps {
  requirement: PillarRequirement;
  commitEntry: CommitEntry | null;
  inviteInfo: InviteInfo | null;
  isComplete: boolean;
  isSkipped: boolean;
  onAction: (type: 'upload' | 'identify_vendor' | 'request' | 'invite') => void;
  onConfirm: () => void;
  onResume: () => void;
  onResendInvite: () => void;
}

type RowVariant = 'active' | 'done' | 'muted';

function deriveVariant(
  commitEntry: CommitEntry | null,
  inviteInfo: InviteInfo | null,
  isComplete: boolean,
  isSkipped: boolean,
): RowVariant {
  if (isSkipped) return 'muted';
  if (isComplete) return 'done';
  if (commitEntry?.choice === 'invite') {
    if (!inviteInfo || inviteInfo.status === 'pending') return 'muted';
  }
  return 'active';
}

function deriveSublabel(
  commitEntry: CommitEntry | null,
  inviteInfo: InviteInfo | null,
  isComplete: boolean,
  isSkipped: boolean,
): string | null {
  if (isSkipped) {
    const reason = commitEntry?.skip_reason;
    return reason ? `Skipped — ${reason}` : 'Skipped';
  }
  if (commitEntry?.choice === 'invite') {
    const name = commitEntry.assigned_to_name || inviteInfo?.full_name || inviteInfo?.email || 'invitee';
    if (isComplete) return `Done by ${name}`;
    if (commitEntry.assigned_to_user_id) return `Assigned to ${name}`;
    if (!inviteInfo || inviteInfo.status === 'pending') return `Awaiting ${name}`;
    if (inviteInfo.status === 'accepted') return `Assigned to ${name}`;
  }
  if (isComplete && commitEntry?.choice === 'me') return 'Done';
  return null;
}

function deriveStatusIconState(
  variant: RowVariant,
  isSkipped: boolean,
  commitEntry: CommitEntry | null,
  inviteInfo: InviteInfo | null,
): 'done' | 'skipped' | 'in_progress' | 'pending' {
  if (variant === 'done') return 'done';
  if (isSkipped) return 'skipped';
  if (commitEntry?.choice === 'invite' && inviteInfo?.status === 'accepted') return 'in_progress';
  if (commitEntry?.choice === 'me') return 'in_progress';
  return 'pending';
}

export function RequirementWorkRow({
  requirement,
  commitEntry,
  inviteInfo,
  isComplete,
  isSkipped,
  onAction,
  onConfirm,
  onResume,
  onResendInvite,
}: RequirementWorkRowProps) {
  const navigate = useNavigate();
  const variant = deriveVariant(commitEntry, inviteInfo, isComplete, isSkipped);
  const sublabel = deriveSublabel(commitEntry, inviteInfo, isComplete, isSkipped);
  const iconState = deriveStatusIconState(variant, isSkipped, commitEntry, inviteInfo);

  const canAct = variant === 'active';
  const roleLabel = ROLE_LABELS[requirement.typical_role] || requirement.typical_role;

  const handleRouteOut = () => {
    if (requirement.requirement_code === 'temperature_logs') {
      navigate('/temp-logs');
    } else if (requirement.requirement_code === 'haccp_plan') {
      navigate('/haccp');
    }
  };

  return (
    <div className={`px-4 py-3 border-b border-[#E2DDD4]/50 ${variant === 'muted' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <StatusIcon state={iconState} size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium text-[#1E2D4D] ${isSkipped ? 'line-through' : ''}`}>
              {requirement.label}
            </span>
            {requirement.citation && (
              <span className="text-[10px] text-[#8A93A6] font-mono">{requirement.citation}</span>
            )}
          </div>

          {sublabel && (
            <p className={`text-xs mt-0.5 ${
              variant === 'done' ? 'text-[#1E2D4D]/70' : 'text-[#8A93A6]'
            }`}>
              {sublabel}
            </p>
          )}

          {/* Action buttons — only when row is active */}
          {canAct && (
            <div className="flex flex-wrap gap-2 mt-2">
              {requirement.action_type === 'upload' && (
                <ActionButton icon={<Upload size={12} />} label="Upload" onClick={() => onAction('upload')} />
              )}
              {requirement.action_type === 'identify_vendor' && (
                <ActionButton icon={<UserPlus size={12} />} label="Identify vendor" onClick={() => onAction('identify_vendor')} />
              )}
              {requirement.action_type === 'route_out' && requirement.requirement_code === 'temperature_logs' && (
                <ActionButton icon={<ExternalLink size={12} />} label="Go to Temperatures" onClick={handleRouteOut} />
              )}
              {requirement.action_type === 'route_out' && requirement.requirement_code === 'haccp_plan' && (
                <>
                  <ActionButton icon={<Upload size={12} />} label="Upload" onClick={() => onAction('upload')} />
                  <ActionButton icon={<ExternalLink size={12} />} label="Build" onClick={handleRouteOut} />
                </>
              )}
              {requirement.action_type === 'confirm' && (
                <ActionButton icon={null} label="Confirm ✓" onClick={onConfirm} />
              )}
            </div>
          )}

          {/* Resend link for pending invites */}
          {variant === 'muted' && commitEntry?.choice === 'invite' && !isComplete && (
            <button
              type="button"
              onClick={onResendInvite}
              className="text-[10px] text-[#1E2D4D]/60 hover:text-[#1E2D4D] underline mt-1"
            >
              Resend invite
            </button>
          )}

          {/* Resume link for skipped items */}
          {isSkipped && (
            <button
              type="button"
              onClick={onResume}
              className="text-[10px] text-[#1E2D4D] hover:underline mt-1 font-medium"
            >
              Resume
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-[#1E2D4D] text-[#1E2D4D] bg-white hover:bg-[#1E2D4D] hover:text-[#FAF7F0] transition-all"
    >
      {icon}
      {label}
    </button>
  );
}
