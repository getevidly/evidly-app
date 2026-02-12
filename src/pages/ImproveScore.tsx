import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Shield,
  Flame,
  UtensilsCrossed,
  FileCheck,
  Settings2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Send,
  Calendar,
  Upload,
  ClipboardCheck,
  RefreshCw,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { locations } from '../data/demoData';
import {
  calculateInsuranceRiskScore,
  calculateOrgInsuranceRiskScore,
  getInsuranceRiskTier,
  type InsuranceActionItem,
  type InsuranceRiskResult,
} from '../lib/insuranceRiskScore';

const F: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const CATEGORY_ICONS: Record<string, typeof Flame> = {
  'Fire Risk': Flame,
  'Food Safety': UtensilsCrossed,
  'Documentation & Compliance': FileCheck,
  'Operational Risk': Settings2,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Fire Risk': '#ef4444',
  'Food Safety': '#3b82f6',
  'Documentation & Compliance': '#8b5cf6',
  'Operational Risk': '#06b6d4',
};

const QUICK_ACTION_ICONS: Record<string, typeof Send> = {
  remind_vendor: Send,
  schedule_inspection: Calendar,
  upload_document: Upload,
  complete_checklist: ClipboardCheck,
  renew_permit: RefreshCw,
};

const QUICK_ACTION_LABELS: Record<string, string> = {
  remind_vendor: 'Reminder sent',
  schedule_inspection: 'Inspection scheduled',
  upload_document: 'Ready to upload',
  complete_checklist: 'Opening checklist',
  renew_permit: 'Renewal initiated',
};

function PriorityBadge({ priority }: { priority: InsuranceActionItem['priority'] }) {
  const styles: Record<string, { bg: string; text: string; border: string; label: string }> = {
    critical: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Overdue' },
    high: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', label: 'Urgent' },
    medium: { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Due Soon' },
    low: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Recommended' },
  };
  const s = styles[priority];
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function ScoreMiniBar({ score }: { score: number }) {
  const tier = getInsuranceRiskTier(score);
  return (
    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.max(3, score)}%`, backgroundColor: tier.color }} />
    </div>
  );
}

export function ImproveScore() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const locationParam = params.get('location') || 'all';

  const [completedActions, setCompletedActions] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const riskResult: InsuranceRiskResult = locationParam === 'all'
    ? calculateOrgInsuranceRiskScore()
    : calculateInsuranceRiskScore(locationParam);

  const tierInfo = getInsuranceRiskTier(riskResult.overall);

  // Filter action items
  let filteredItems = riskResult.actionItems;
  if (filter !== 'all') {
    filteredItems = filteredItems.filter(i => i.priority === filter);
  }
  if (categoryFilter !== 'all') {
    filteredItems = filteredItems.filter(i => i.category === categoryFilter);
  }

  // Calculate potential score improvement
  const totalPotentialGain = riskResult.actionItems.reduce((s, i) => s + i.potentialGain, 0);
  const completedGain = riskResult.actionItems
    .filter((_, idx) => completedActions.has(idx))
    .reduce((s, i) => s + i.potentialGain, 0);
  const projectedScore = Math.min(100, riskResult.overall + completedGain);
  const projectedTier = getInsuranceRiskTier(projectedScore);

  // Group by category for summary
  const categoryGroups = riskResult.categories.map(cat => ({
    name: cat.name,
    items: riskResult.actionItems.filter(i => i.category === cat.name),
    totalGain: riskResult.actionItems.filter(i => i.category === cat.name).reduce((s, i) => s + i.potentialGain, 0),
  }));

  const handleQuickAction = (idx: number, item: InsuranceActionItem) => {
    const msg = item.quickActionType ? QUICK_ACTION_LABELS[item.quickActionType] || 'Action completed' : 'Action completed';
    toast.success(`${msg} — ${item.title}`);
    setCompletedActions(prev => new Set(prev).add(idx));
  };

  const handleLocationChange = (locId: string) => {
    navigate(`/improve-score?location=${locId}`, { replace: true });
  };

  return (
    <div className="max-w-5xl mx-auto" style={F}>
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Insurance Risk', href: `/insurance-risk?location=${locationParam}` },
        { label: 'Improve My Score' },
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/insurance-risk?location=${locationParam}`)} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Improve My Score</h1>
            <p className="text-sm text-gray-500">Prioritized actions ranked by impact on your insurance risk score</p>
          </div>
        </div>
      </div>

      {/* Location Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap overflow-x-auto">
        <button
          onClick={() => handleLocationChange('all')}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px]"
          style={locationParam === 'all' ? { backgroundColor: '#1e4d6b', color: 'white' } : { backgroundColor: '#f3f4f6', color: '#374151' }}
        >
          All Locations
        </button>
        {locations.map(loc => (
          <button
            key={loc.urlId}
            onClick={() => handleLocationChange(loc.urlId)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px]"
            style={locationParam === loc.urlId ? { backgroundColor: '#1e4d6b', color: 'white' } : { backgroundColor: '#f3f4f6', color: '#374151' }}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Score Projection Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Current Score */}
          <div className="text-center">
            <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Current Score</div>
            <div className="w-20 h-20 rounded-full flex items-center justify-center border-[3px] mx-auto" style={{ borderColor: tierInfo.color, backgroundColor: tierInfo.bg }}>
              <div className="text-2xl font-bold" style={{ color: tierInfo.color }}>{riskResult.overall}</div>
            </div>
            <div className="text-[10px] font-bold mt-1.5 px-2 py-0.5 rounded-full inline-block" style={{ backgroundColor: tierInfo.bg, color: tierInfo.color, border: `1px solid ${tierInfo.color}` }}>
              {riskResult.tier}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center gap-2">
            <ArrowRight className="h-6 w-6 text-gray-300" />
          </div>

          {/* Projected Score */}
          <div className="text-center">
            <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-1">
              {completedGain > 0 ? 'Projected Score' : 'If All Addressed'}
            </div>
            <div className="w-20 h-20 rounded-full flex items-center justify-center border-[3px] mx-auto" style={{ borderColor: projectedTier.color, backgroundColor: projectedTier.bg }}>
              <div className="text-2xl font-bold" style={{ color: projectedTier.color }}>
                {completedGain > 0 ? projectedScore : Math.min(100, riskResult.overall + totalPotentialGain)}
              </div>
            </div>
            <div className="text-[10px] font-bold mt-1.5 px-2 py-0.5 rounded-full inline-block" style={{ backgroundColor: projectedTier.bg, color: projectedTier.color, border: `1px solid ${projectedTier.color}` }}>
              {completedGain > 0 ? projectedTier.tier : getInsuranceRiskTier(Math.min(100, riskResult.overall + totalPotentialGain)).tier}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex-1 ml-0 sm:ml-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <div className="text-lg font-bold text-green-600">+{totalPotentialGain}</div>
                <div className="text-[10px] text-gray-400">Total Points Available</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <div className="text-lg font-bold text-gray-900">{riskResult.actionItems.length}</div>
                <div className="text-[10px] text-gray-400">Actions to Address</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <div className="text-lg font-bold" style={{ color: '#d4af37' }}>{completedActions.size}</div>
                <div className="text-[10px] text-gray-400">Addressed This Session</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Impact Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {categoryGroups.map(group => {
          const Icon = CATEGORY_ICONS[group.name] || Shield;
          const color = CATEGORY_COLORS[group.name] || '#6b7280';
          return (
            <div
              key={group.name}
              onClick={() => setCategoryFilter(categoryFilter === group.name ? 'all' : group.name)}
              className="bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-colors hover:bg-gray-50"
              style={{ borderColor: categoryFilter === group.name ? color : '#e5e7eb' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" style={{ color }} />
                <span className="text-xs font-semibold text-gray-900 truncate">{group.name.replace(' & Compliance', '').replace(' Risk', '')}</span>
              </div>
              <div className="text-sm font-bold text-green-600">+{group.totalGain} pts</div>
              <div className="text-[10px] text-gray-400">{group.items.length} action{group.items.length !== 1 ? 's' : ''}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Filter:</span>
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map(f => {
          const labels: Record<string, string> = { all: 'All', critical: 'Overdue', high: 'Urgent', medium: 'Due Soon', low: 'Recommended' };
          const counts: Record<string, number> = {
            all: riskResult.actionItems.length,
            critical: riskResult.actionItems.filter(i => i.priority === 'critical').length,
            high: riskResult.actionItems.filter(i => i.priority === 'high').length,
            medium: riskResult.actionItems.filter(i => i.priority === 'medium').length,
            low: riskResult.actionItems.filter(i => i.priority === 'low').length,
          };
          if (f !== 'all' && counts[f] === 0) return null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={filter === f ? { backgroundColor: '#1e4d6b', color: 'white' } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}
            >
              {labels[f]} ({counts[f]})
            </button>
          );
        })}
        {categoryFilter !== 'all' && (
          <button onClick={() => setCategoryFilter('all')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
            Clear category filter
          </button>
        )}
      </div>

      {/* Action Items List */}
      <div className="space-y-3 mb-6">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-900">No actions match this filter</p>
            <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or selecting a different location</p>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const globalIdx = riskResult.actionItems.indexOf(item);
            const isCompleted = completedActions.has(globalIdx);
            const Icon = CATEGORY_ICONS[item.category] || Shield;
            const catColor = CATEGORY_COLORS[item.category] || '#6b7280';
            const QuickIcon = item.quickActionType ? QUICK_ACTION_ICONS[item.quickActionType] : undefined;

            return (
              <div
                key={idx}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-opacity ${isCompleted ? 'opacity-50' : ''}`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Priority + Category */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0 pt-0.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: catColor + '15' }}>
                        <Icon className="h-4 w-4" style={{ color: catColor }} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                        <PriorityBadge priority={item.priority} />
                        {isCompleted && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">ADDRESSED</span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 mb-2">{item.action}</p>

                      <div className="flex items-center gap-4 text-[11px] text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="font-semibold text-green-600">+{item.potentialGain} points</span> potential gain
                        </span>
                        {item.currentScore !== undefined && (
                          <span className="flex items-center gap-1">
                            <span>Current: {item.currentScore}/100</span>
                            <ScoreMiniBar score={item.currentScore} />
                          </span>
                        )}
                        {item.reference && (
                          <span className="text-gray-300">Ref: {item.reference}</span>
                        )}
                      </div>
                    </div>

                    {/* Point Impact */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-green-600">+{item.potentialGain}</div>
                      <div className="text-[10px] text-gray-400">points</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!isCompleted && (
                    <div className="flex items-center gap-2 mt-3 ml-0 sm:ml-12 flex-wrap">
                      {item.quickAction && QuickIcon && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleQuickAction(globalIdx, item); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 transition-colors hover:opacity-90 min-h-[44px]"
                          style={{ backgroundColor: '#1e4d6b' }}
                        >
                          <QuickIcon className="h-3.5 w-3.5" />
                          {item.quickAction}
                        </button>
                      )}
                      <button
                        onClick={() => navigate(item.actionLink)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center gap-1.5 transition-colors min-h-[44px]"
                      >
                        Go to {item.actionLink.replace('/', '').replace('-', ' ')} <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom CTA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5" style={{ color: '#d4af37' }} />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {completedActions.size > 0
                  ? `${completedActions.size} action${completedActions.size !== 1 ? 's' : ''} addressed — projected score: ${projectedScore}`
                  : 'Complete all actions to maximize your insurance risk score'}
              </p>
              <p className="text-xs text-gray-500">
                Addressing these items is designed to strengthen your position for insurance carrier conversations
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/insurance-risk?location=${locationParam}`)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 min-h-[44px]"
            style={{ backgroundColor: '#1e4d6b' }}
          >
            Back to Risk Score <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
