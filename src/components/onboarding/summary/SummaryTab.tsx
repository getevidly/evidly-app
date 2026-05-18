import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { usePillarRequirements, type PillarRequirement } from '../../../hooks/onboarding/usePillarRequirements';
import { useOnboardingState } from '../../../hooks/onboarding/useOnboardingState';
import { REQUIREMENT_TO_SERVICE_CODE, ROLE_LABELS } from '../work/workConstants';
import { PillarHeader } from '../shared/PillarHeader';
import { EmptyStateMessage } from '../shared/EmptyStateMessage';
import { SummaryHeader } from './SummaryHeader';
import { SummaryFilterBar, type FilterId } from './SummaryFilterBar';
import { SummaryRow } from './SummaryRow';

type DetailStatus = 'done' | 'assigned' | 'skipped' | 'pending';

interface CommitEntry {
  requirement_code: string;
  choice: string;
  invite_role?: string;
  skip_reason?: string;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
}

interface DocDetail {
  createdAt: string;
  expiryDate: string | null;
}

interface VendorDetail {
  vendorName: string;
  frequency: string;
}

interface InviteDetail {
  email: string;
  full_name: string | null;
  status: string;
  role: string;
  created_at: string;
}

interface SummaryTabProps {
  onSwitchToResponsibilities?: () => void;
}

// ---------- Inner hook: batch-fetch operational detail ----------

function useSummaryDetail(orgId: string | undefined) {
  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [invites, setInvites] = useState<InviteDetail[]>([]);
  const [docDetail, setDocDetail] = useState<Record<string, DocDetail>>({});
  const [vendorDetail, setVendorDetail] = useState<Record<string, VendorDetail>>({});
  const [tempLogCount, setTempLogCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    async function fetchDetail() {
      setLoading(true);

      // 1. Org commits
      const { data: orgData } = await supabase
        .from('organizations')
        .select('onboarding_team_invited')
        .eq('id', orgId)
        .maybeSingle();
      if (cancelled) return;
      setCommits((orgData?.onboarding_team_invited as CommitEntry[]) || []);

      // 2. Compliance documents (for upload + haccp done detail)
      const { data: docs } = await supabase
        .from('compliance_documents')
        .select('category, created_at, expiry_date')
        .eq('organization_id', orgId);
      if (cancelled) return;
      const docMap: Record<string, DocDetail> = {};
      for (const d of (docs || [])) {
        if (d.category && !docMap[d.category]) {
          docMap[d.category] = { createdAt: d.created_at, expiryDate: d.expiry_date };
        }
      }
      setDocDetail(docMap);

      // 3. Vendor schedules (for identify_vendor done detail)
      const { data: schedules } = await supabase
        .from('location_service_schedules')
        .select('service_type_code, frequency, vendor_id, vendors(company_name)')
        .eq('organization_id', orgId)
        .not('vendor_id', 'is', null);
      if (cancelled) return;
      const vMap: Record<string, VendorDetail> = {};
      for (const s of (schedules || [])) {
        if (s.service_type_code && !vMap[s.service_type_code]) {
          const vName = (s.vendors as any)?.company_name || 'Vendor';
          vMap[s.service_type_code] = { vendorName: vName, frequency: s.frequency || '' };
        }
      }
      setVendorDetail(vMap);

      // 4. Temperature log count
      const { data: locs } = await supabase
        .from('locations')
        .select('id')
        .eq('organization_id', orgId);
      if (cancelled) return;
      const locIds = (locs || []).map((l: any) => l.id);
      let tCount = 0;
      if (locIds.length > 0) {
        const { count } = await supabase
          .from('temperature_logs')
          .select('id', { count: 'exact', head: true })
          .in('facility_id', locIds);
        if (cancelled) return;
        tCount = count ?? 0;
      }
      setTempLogCount(tCount);

      // 5. User invitations
      const { data: invData } = await supabase
        .from('user_invitations')
        .select('email, full_name, status, role, created_at')
        .eq('organization_id', orgId);
      if (cancelled) return;
      setInvites((invData || []) as InviteDetail[]);

      setLoading(false);
    }

    fetchDetail();
    return () => { cancelled = true; };
  }, [orgId]);

  return { commits, invites, docDetail, vendorDetail, tempLogCount, loading };
}

// ---------- Main component ----------

export function SummaryTab({ onSwitchToResponsibilities }: SummaryTabProps) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const navigate = useNavigate();

  const { foodSafety: fsState, fireSafety: firState, loading: stateLoading, unskipItem, refreshState } = useOnboardingState();
  const { foodSafety: fsReqs, fireSafety: firReqs, requirements, loading: reqLoading, stateCode } = usePillarRequirements();
  const { commits, invites, docDetail, vendorDetail, tempLogCount, loading: detailLoading } = useSummaryDetail(orgId);

  const [activeFilter, setActiveFilter] = useState<FilterId>('all');

  // Build enriched rows
  const allRows = useMemo(() => {
    if (requirements.length === 0) return [];
    const stateItems = [...fsState.items, ...firState.items];

    return requirements.map(req => {
      const stateItem = stateItems.find(si => si.requirement.requirement_code === req.requirement_code);
      const onbStatus = stateItem?.status || 'pending';
      const commit = commits.find(c => c.requirement_code === req.requirement_code);

      // Detail status (4 categories)
      let detailStatus: DetailStatus;
      if (onbStatus === 'done') detailStatus = 'done';
      else if (onbStatus === 'skipped') detailStatus = 'skipped';
      else if (commit?.choice === 'invite') detailStatus = 'assigned';
      else detailStatus = 'pending';

      // Owner text
      let ownerText = 'Not yet assigned';
      let ownerAmber = true;
      if (commit?.choice === 'me') {
        const name = commit.assigned_to_name || profile?.full_name || 'Me';
        ownerText = `${name} (Me)`;
        ownerAmber = false;
      } else if (commit?.choice === 'invite') {
        if (commit.assigned_to_user_id && commit.assigned_to_name) {
          const roleLabel = commit.invite_role ? (ROLE_LABELS[commit.invite_role] || commit.invite_role) : '';
          ownerText = `${commit.assigned_to_name}${roleLabel ? ` (${roleLabel})` : ''}`;
          ownerAmber = false;
        } else if (commit.assigned_to_name) {
          ownerText = `${commit.assigned_to_name} (invited)`;
        } else {
          const inv = invites.find(i => i.role === commit.invite_role);
          if (inv && inv.status === 'accepted') {
            const roleLabel = commit.invite_role ? (ROLE_LABELS[commit.invite_role] || commit.invite_role) : '';
            ownerText = `${inv.full_name || inv.email}${roleLabel ? ` (${roleLabel})` : ''}`;
            ownerAmber = false;
          } else {
            ownerText = 'Invite pending';
          }
        }
      } else if (commit?.choice === 'skip' || onbStatus === 'skipped') {
        ownerText = '\u2014';
        ownerAmber = false;
      }

      // Detail text
      let detailText = '';
      if (detailStatus === 'done') {
        if (req.action_type === 'upload') {
          const doc = docDetail[req.requirement_code];
          const uploaded = doc?.createdAt ? formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true }) : '';
          const expires = doc?.expiryDate ? format(new Date(doc.expiryDate), 'MMM d, yyyy') : '';
          detailText = `Done${uploaded ? ` \u00b7 Uploaded ${uploaded}` : ''}${expires ? ` \u00b7 Expires ${expires}` : ''}`;
        } else if (req.action_type === 'identify_vendor') {
          const svcCode = REQUIREMENT_TO_SERVICE_CODE[req.requirement_code];
          const vendor = svcCode ? vendorDetail[svcCode] : null;
          detailText = `Done${vendor ? ` \u00b7 ${vendor.vendorName} \u00b7 ${vendor.frequency}` : ''}`;
        } else if (req.action_type === 'confirm') {
          detailText = 'Confirmed';
        } else if (req.action_type === 'route_out') {
          if (req.requirement_code === 'temperature_logs') {
            detailText = `Done \u00b7 Logging active \u00b7 ${tempLogCount} entries`;
          } else {
            detailText = 'Done \u00b7 Plan uploaded';
          }
        } else {
          detailText = 'Done';
        }
      } else if (detailStatus === 'assigned') {
        if (commit?.assigned_to_user_id && commit?.assigned_to_name) {
          detailText = `${commit.assigned_to_name} joined \u00b7 in progress`;
        } else if (commit?.assigned_to_name) {
          detailText = `${commit.assigned_to_name} invited \u00b7 awaiting acceptance`;
        } else {
          const inv = invites.find(i => i.role === commit?.invite_role);
          if (inv && inv.status === 'accepted') {
            detailText = `${inv.full_name || inv.email} joined \u00b7 in progress`;
          } else if (inv) {
            const ago = formatDistanceToNow(new Date(inv.created_at), { addSuffix: true });
            detailText = `Invited ${ago} \u00b7 awaiting acceptance`;
          } else {
            detailText = 'Invited \u00b7 awaiting acceptance';
          }
        }
      } else if (detailStatus === 'skipped') {
        const reason = commit?.skip_reason;
        detailText = reason ? `Skipped \u00b7 ${reason}` : 'Skipped';
      } else {
        const roleLabel = req.typical_role ? (ROLE_LABELS[req.typical_role] || req.typical_role) : '';
        detailText = `Awaiting decision${roleLabel ? ` \u00b7 ${roleLabel} typically handles` : ''}`;
      }

      // Action label + handler
      let actionLabel: string | null = null;
      let onAction: (() => void) | undefined;

      if (detailStatus === 'done') {
        if (req.action_type === 'upload' || (req.action_type === 'route_out' && req.requirement_code === 'haccp_plan')) {
          actionLabel = 'View';
          onAction = () => navigate('/documents');
        } else if (req.action_type === 'identify_vendor') {
          actionLabel = 'View';
          onAction = () => navigate('/vendors');
        } else if (req.action_type === 'route_out' && req.requirement_code === 'temperature_logs') {
          actionLabel = 'View';
          onAction = () => navigate('/temp-logs');
        }
      } else if (detailStatus === 'assigned') {
        const inv = invites.find(i => i.role === commit?.invite_role);
        if (inv && inv.status === 'accepted') {
          actionLabel = 'Open';
          onAction = () => navigate('/onboarding');
        } else {
          actionLabel = undefined;
          onAction = undefined;
        }
      } else if (detailStatus === 'skipped') {
        actionLabel = 'Resume';
        onAction = () => { unskipItem(req.requirement_code).then(() => refreshState()); };
      } else if (detailStatus === 'pending' && onSwitchToResponsibilities) {
        actionLabel = 'Decide';
        onAction = onSwitchToResponsibilities;
      }

      return {
        requirement: req,
        detailStatus,
        ownerText,
        ownerAmber,
        detailText,
        actionLabel,
        onAction,
        isPending: detailStatus === 'pending',
      };
    });
  }, [requirements, fsState, firState, commits, invites, docDetail, vendorDetail, tempLogCount, profile, navigate, unskipItem, refreshState, onSwitchToResponsibilities]);

  // Filter counts
  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { all: 0, done: 0, assigned: 0, skipped: 0, pending: 0 };
    for (const r of allRows) {
      c.all++;
      c[r.detailStatus]++;
    }
    return c;
  }, [allRows]);

  // Filtered rows per pillar
  const filterRows = (reqs: PillarRequirement[]) => {
    const codes = new Set(reqs.map(r => r.requirement_code));
    return allRows
      .filter(r => codes.has(r.requirement.requirement_code))
      .filter(r => activeFilter === 'all' || r.detailStatus === activeFilter);
  };

  const filteredFood = filterRows(fsReqs);
  const filteredFire = filterRows(firReqs);

  const foodDone = allRows.filter(r => r.requirement.pillar === 'food_safety' && r.detailStatus === 'done').length;
  const fireDone = allRows.filter(r => r.requirement.pillar === 'fire_safety' && r.detailStatus === 'done').length;

  if (reqLoading || stateLoading || detailLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-[#1E2D4D]/30 border-t-[#1E2D4D] rounded-full animate-spin" />
      </div>
    );
  }

  if (requirements.length === 0) {
    return <EmptyStateMessage stateName={stateCode || undefined} />;
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <SummaryHeader
        stateCode={stateCode}
        totalCount={allRows.length}
        counts={{ done: counts.done, assigned: counts.assigned, skipped: counts.skipped, pending: counts.pending }}
      />
      <SummaryFilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={counts} />

      {filteredFood.length > 0 && (
        <div className="mb-2">
          <div className="px-4">
            <PillarHeader pillar="food_safety" completedCount={foodDone} totalCount={fsReqs.length} />
          </div>
          <div className="border-t border-[#E2DDD4]/50">
            {filteredFood.map(row => (
              <SummaryRow
                key={row.requirement.id}
                requirement={row.requirement}
                ownerText={row.ownerText}
                ownerAmber={row.ownerAmber}
                detailText={row.detailText}
                detailStatus={row.detailStatus}
                actionLabel={row.actionLabel}
                onAction={row.onAction}
                isPending={row.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {filteredFire.length > 0 && (
        <div className="mb-2">
          <div className="px-4">
            <PillarHeader pillar="fire_safety" completedCount={fireDone} totalCount={firReqs.length} />
          </div>
          <div className="border-t border-[#E2DDD4]/50">
            {filteredFire.map(row => (
              <SummaryRow
                key={row.requirement.id}
                requirement={row.requirement}
                ownerText={row.ownerText}
                ownerAmber={row.ownerAmber}
                detailText={row.detailText}
                detailStatus={row.detailStatus}
                actionLabel={row.actionLabel}
                onAction={row.onAction}
                isPending={row.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
