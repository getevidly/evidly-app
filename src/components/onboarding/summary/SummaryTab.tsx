import { useState, useEffect } from 'react';
import { usePillarRequirements, type PillarRequirement } from '../../../hooks/onboarding/usePillarRequirements';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { PillarHeader } from '../shared/PillarHeader';
import { EmptyStateMessage } from '../shared/EmptyStateMessage';
import { StatusIcon } from '../shared/StatusIcon';

const ROLE_LABELS: Record<string, string> = {
  compliance_manager: 'Compliance Officer',
  facilities_manager: 'Facilities Manager',
  kitchen_manager: 'Kitchen Manager',
  chef: 'Chef',
  executive: 'Executive',
  owner_operator: 'Owner/Operator',
  kitchen_staff: 'Kitchen Staff',
};

interface CommitEntry {
  requirement_code: string;
  choice: string;
  invite_role?: string;
  skip_reason?: string;
}

/**
 * Summary tab — live read-only mirror of committed responsibilities.
 * Shows current state for all 12 rows: Me / Invited [Role] / Skipped + reason / Pending decision.
 */
export function SummaryTab() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { foodSafety, fireSafety, requirements, loading: reqLoading, stateCode } = usePillarRequirements();

  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from('organizations')
        .select('onboarding_team_invited, onboarding_skipped_items')
        .eq('id', orgId)
        .maybeSingle();

      if (cancelled) return;

      setCommits((data?.onboarding_team_invited as CommitEntry[]) || []);
      setSkipped((data?.onboarding_skipped_items as string[]) || []);
      setLoading(false);
    }

    fetch();
    // Re-fetch when tab becomes visible (parent re-renders on tab switch)
    return () => { cancelled = true; };
  }, [orgId]);

  if (reqLoading || loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin" /></div>;
  }

  if (requirements.length === 0) {
    return <EmptyStateMessage stateName={stateCode || undefined} />;
  }

  const getCommitState = (code: string): { label: string; state: 'done' | 'skipped' | 'pending' } => {
    if (skipped.includes(code)) {
      const entry = commits.find(c => c.requirement_code === code);
      const reason = entry?.skip_reason;
      return { label: reason ? `Skipped — ${reason}` : 'Skipped', state: 'skipped' };
    }
    const entry = commits.find(c => c.requirement_code === code);
    if (!entry) return { label: 'Pending decision', state: 'pending' };
    if (entry.choice === 'me') return { label: 'Me', state: 'done' };
    if (entry.choice === 'invite') {
      const roleLabel = entry.invite_role ? (ROLE_LABELS[entry.invite_role] || entry.invite_role) : 'team member';
      return { label: `Invited ${roleLabel}`, state: 'done' };
    }
    if (entry.choice === 'skip') {
      const reason = entry.skip_reason;
      return { label: reason ? `Skipped — ${reason}` : 'Skipped', state: 'skipped' };
    }
    return { label: 'Pending decision', state: 'pending' };
  };

  const foodCommittedCount = foodSafety.filter(r => {
    const s = getCommitState(r.requirement_code);
    return s.state !== 'pending';
  }).length;

  const fireCommittedCount = fireSafety.filter(r => {
    const s = getCommitState(r.requirement_code);
    return s.state !== 'pending';
  }).length;

  return (
    <div className="overflow-y-auto">
      <SummaryPillarSection
        pillar="food_safety"
        requirements={foodSafety}
        committedCount={foodCommittedCount}
        getCommitState={getCommitState}
      />
      <SummaryPillarSection
        pillar="fire_safety"
        requirements={fireSafety}
        committedCount={fireCommittedCount}
        getCommitState={getCommitState}
      />
    </div>
  );
}

function SummaryPillarSection({
  pillar,
  requirements,
  committedCount,
  getCommitState,
}: {
  pillar: 'food_safety' | 'fire_safety';
  requirements: PillarRequirement[];
  committedCount: number;
  getCommitState: (code: string) => { label: string; state: 'done' | 'skipped' | 'pending' };
}) {
  return (
    <div className="mb-2">
      <div className="px-4">
        <PillarHeader pillar={pillar} completedCount={committedCount} totalCount={requirements.length} />
      </div>
      <div className="border-t border-[#E2DDD4]/50">
        {requirements.map(req => {
          const commit = getCommitState(req.requirement_code);
          return <SummaryRow key={req.id} requirement={req} commitLabel={commit.label} commitState={commit.state} />;
        })}
      </div>
    </div>
  );
}

function SummaryRow({
  requirement,
  commitLabel,
  commitState,
}: {
  requirement: PillarRequirement;
  commitLabel: string;
  commitState: 'done' | 'skipped' | 'pending';
}) {
  return (
    <div className="px-4 py-3 border-b border-[#E2DDD4]/50 flex items-center gap-3">
      <StatusIcon state={commitState} size={16} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#1E2D4D]">{requirement.label}</span>
          {requirement.citation && (
            <span className="text-[10px] text-[#8A93A6] font-mono">{requirement.citation}</span>
          )}
        </div>
      </div>
      <span className={`text-xs whitespace-nowrap ${
        commitState === 'done' ? 'text-[#1E2D4D] font-medium'
        : commitState === 'skipped' ? 'text-amber-600'
        : 'text-[#8A93A6]'
      }`}>
        {commitLabel}
      </span>
    </div>
  );
}
