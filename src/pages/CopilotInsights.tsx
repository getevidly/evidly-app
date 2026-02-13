import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bot,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  FileBarChart,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  Bell,
  Thermometer,
  CheckSquare,
  Cog,
  Truck,
  ShieldAlert,
  Sparkles,
  Mail,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  copilotInsights,
  locations,
  type CopilotInsight,
  type CopilotSeverity,
  type CopilotStatus,
  type CopilotInsightType,
} from '../data/demoData';

// ── Helpers ───────────────────────────────────────────────

type FilterTab = 'all' | 'critical' | 'warning' | 'info' | 'acted' | 'dismissed';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(insights: CopilotInsight[]): { label: string; items: CopilotInsight[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: CopilotInsight[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Earlier', items: [] },
  ];

  for (const item of insights) {
    const d = new Date(item.createdAt);
    if (d >= today) groups[0].items.push(item);
    else if (d >= yesterday) groups[1].items.push(item);
    else if (d >= weekAgo) groups[2].items.push(item);
    else groups[3].items.push(item);
  }

  return groups.filter(g => g.items.length > 0);
}

const severityConfig: Record<CopilotSeverity, { dot: string; bg: string; border: string; label: string; badgeBg: string }> = {
  critical: { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Critical', badgeBg: '#fef2f2' },
  warning: { dot: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Warning', badgeBg: '#fffbeb' },
  info: { dot: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Info', badgeBg: '#eff6ff' },
};

const typeIcons: Record<CopilotInsightType, typeof AlertTriangle> = {
  alert: AlertTriangle,
  prediction: TrendingUp,
  pattern: Eye,
  recommendation: Lightbulb,
  summary: FileBarChart,
};

const sourceIcons: Record<string, typeof Thermometer> = {
  temperature: Thermometer,
  checklist: CheckSquare,
  equipment: Cog,
  vendor: Truck,
  incident: ShieldAlert,
  compliance: ClipboardList,
};

// ── Main Component ────────────────────────────────────────

export function CopilotInsights() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationParam = searchParams.get('location') || 'all';

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [insightStatuses, setInsightStatuses] = useState<Record<string, CopilotStatus>>({});

  // Merge local status overrides with demo data
  const insights = useMemo(() => {
    return copilotInsights.map(i => ({
      ...i,
      status: insightStatuses[i.id] || i.status,
    }));
  }, [insightStatuses]);

  // Filter by location
  const locationFiltered = useMemo(() => {
    if (locationParam === 'all') return insights;
    const loc = locations.find(l => l.urlId === locationParam);
    if (!loc) return insights;
    return insights.filter(i => i.locationId === loc.id);
  }, [insights, locationParam]);

  // Filter by tab
  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'critical': return locationFiltered.filter(i => i.severity === 'critical' && i.status !== 'dismissed');
      case 'warning': return locationFiltered.filter(i => i.severity === 'warning' && i.status !== 'dismissed');
      case 'info': return locationFiltered.filter(i => i.severity === 'info' && i.status !== 'dismissed');
      case 'acted': return locationFiltered.filter(i => i.status === 'acted');
      case 'dismissed': return locationFiltered.filter(i => i.status === 'dismissed');
      default: return locationFiltered.filter(i => i.status !== 'dismissed');
    }
  }, [locationFiltered, activeTab]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  // Counts for tabs
  const counts = useMemo(() => ({
    all: locationFiltered.filter(i => i.status !== 'dismissed').length,
    critical: locationFiltered.filter(i => i.severity === 'critical' && i.status !== 'dismissed').length,
    warning: locationFiltered.filter(i => i.severity === 'warning' && i.status !== 'dismissed').length,
    info: locationFiltered.filter(i => i.severity === 'info' && i.status !== 'dismissed').length,
    acted: locationFiltered.filter(i => i.status === 'acted').length,
    dismissed: locationFiltered.filter(i => i.status === 'dismissed').length,
  }), [locationFiltered]);

  function handleAction(insight: CopilotInsight) {
    setInsightStatuses(prev => ({ ...prev, [insight.id]: 'acted' }));

    switch (insight.actionType) {
      case 'auto_incident':
        toast.success('Incident draft created from copilot insight');
        navigate('/incidents');
        break;
      case 'notify_vendor': {
        const draft = (insight.actionData?.draftMessage as string) || '';
        toast.success('Vendor message drafted');
        if (draft) {
          navigator.clipboard?.writeText(draft).then(() => {
            toast('Draft message copied to clipboard', { icon: <Mail className="h-4 w-4" /> });
          });
        }
        break;
      }
      case 'suggest_checklist':
        toast.success('Checklist suggestion noted');
        navigate('/checklists');
        break;
      case 'weekly_summary':
      case 'view_report':
        toast.success('Opening report');
        navigate('/scoring-breakdown');
        break;
      case 'draft_action':
        toast.success('Corrective action plan drafted');
        navigate('/incidents');
        break;
      default:
        toast.info('Action recorded');
    }
  }

  function handleDismiss(insightId: string) {
    setInsightStatuses(prev => ({ ...prev, [insightId]: 'dismissed' }));
    toast('Insight dismissed', { icon: <XCircle className="h-4 w-4 text-gray-400" /> });
  }

  function handleMarkViewed(insightId: string) {
    setInsightStatuses(prev => ({ ...prev, [insightId]: 'viewed' }));
  }

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'critical', label: 'Critical', count: counts.critical },
    { key: 'warning', label: 'Warnings', count: counts.warning },
    { key: 'info', label: 'Info', count: counts.info },
    { key: 'acted', label: 'Acted', count: counts.acted },
    { key: 'dismissed', label: 'Dismissed', count: counts.dismissed },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fdf8e8' }}>
            <Bot className="h-5 w-5" style={{ color: '#d4af37' }} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Compliance Copilot</h1>
            <p className="text-sm text-gray-500">Proactive insights from AI analysis of your compliance data</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/settings?tab=notifications')}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
        >
          <Bell className="h-4 w-4" />
          Notification Settings
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={activeTab === tab.key ? { backgroundColor: '#1e4d6b' } : undefined}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Insights List */}
      {grouped.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No insights in this category</p>
          <p className="text-gray-400 text-sm mt-1">The copilot will surface insights as it analyzes your data</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">{group.label}</h3>
              <div className="space-y-3">
                {group.items.map(insight => {
                  const sev = severityConfig[insight.severity];
                  const TypeIcon = typeIcons[insight.insightType];
                  const SourceIcon = sourceIcons[insight.sourceModule] || ShieldAlert;
                  const isNew = insight.status === 'new';

                  return (
                    <div
                      key={insight.id}
                      className="rounded-xl border p-4 transition-all hover:shadow-sm"
                      style={{ borderColor: sev.border, backgroundColor: isNew ? sev.bg : '#ffffff' }}
                      onMouseEnter={() => isNew && handleMarkViewed(insight.id)}
                    >
                      {/* Top row */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          <TypeIcon className="h-4.5 w-4.5" style={{ color: sev.dot }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">{insight.title}</span>
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
                              style={{ backgroundColor: sev.badgeBg, color: sev.dot, border: `1px solid ${sev.border}` }}
                            >
                              {sev.label}
                            </span>
                            {isNew && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-600 border border-blue-200 flex-shrink-0">
                                NEW
                              </span>
                            )}
                          </div>

                          {/* Source + Location + Time */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
                            <span className="flex items-center gap-1">
                              <SourceIcon className="h-3 w-3" />
                              {insight.sourceModule.charAt(0).toUpperCase() + insight.sourceModule.slice(1)}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span>{insight.locationName}</span>
                            <span className="text-gray-300">|</span>
                            <span>{formatRelativeTime(insight.createdAt)}</span>
                          </div>

                          {/* Message */}
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">{insight.message}</p>

                          {/* Actions */}
                          <div className="flex flex-wrap items-center gap-2">
                            {insight.actionType && insight.actionLabel && insight.status !== 'acted' && insight.status !== 'dismissed' && (
                              <button
                                onClick={() => handleAction(insight)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                                style={{ backgroundColor: '#1e4d6b' }}
                                onMouseOver={e => (e.currentTarget.style.backgroundColor = '#163a52')}
                                onMouseOut={e => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
                              >
                                <ChevronRight className="h-3 w-3" />
                                {insight.actionLabel}
                              </button>
                            )}
                            {insight.status === 'acted' && (
                              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Acted
                              </span>
                            )}
                            {insight.status === 'dismissed' && (
                              <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                                <XCircle className="h-3.5 w-3.5" />
                                Dismissed
                              </span>
                            )}
                            {insight.status !== 'acted' && insight.status !== 'dismissed' && (
                              <button
                                onClick={() => handleDismiss(insight.id)}
                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
