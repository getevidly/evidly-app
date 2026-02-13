import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  FileBarChart,
  Eye,
  ArrowRight,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  copilotInsights,
  locations,
  type CopilotInsight,
  type CopilotSeverity,
  type CopilotInsightType,
} from '../data/demoData';

const severityConfig: Record<CopilotSeverity, { dot: string; bg: string; border: string; label: string }> = {
  critical: { dot: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Critical' },
  warning: { dot: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Warning' },
  info: { dot: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Info' },
};

const typeIcons: Record<CopilotInsightType, typeof AlertTriangle> = {
  alert: AlertTriangle,
  prediction: TrendingUp,
  pattern: Eye,
  recommendation: Lightbulb,
  summary: FileBarChart,
};

interface CopilotCardProps {
  locationId: string; // 'all' | urlId
}

export function CopilotCard({ locationId }: CopilotCardProps) {
  const navigate = useNavigate();

  const topInsights = useMemo(() => {
    let filtered = copilotInsights.filter(i => i.status !== 'dismissed');
    if (locationId !== 'all') {
      const loc = locations.find(l => l.urlId === locationId);
      if (loc) filtered = filtered.filter(i => i.locationId === loc.id);
    }
    // Sort: critical first, then warning, then info; within same severity by date desc
    const severityOrder: Record<CopilotSeverity, number> = { critical: 0, warning: 1, info: 2 };
    filtered.sort((a, b) => {
      const so = severityOrder[a.severity] - severityOrder[b.severity];
      if (so !== 0) return so;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return filtered.slice(0, 3);
  }, [locationId]);

  const newCount = useMemo(() => {
    return copilotInsights.filter(i => i.status === 'new').length;
  }, []);

  function handleAction(insight: CopilotInsight) {
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
            toast('Draft copied to clipboard', { icon: <Mail className="h-4 w-4" /> });
          });
        }
        break;
      }
      case 'weekly_summary':
      case 'view_report':
        navigate('/scoring-breakdown');
        break;
      case 'suggest_checklist':
        navigate('/checklists');
        break;
      default:
        toast.info('Action recorded');
    }
  }

  if (topInsights.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fdf8e8' }}>
            <Bot className="h-5 w-5" style={{ color: '#d4af37' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Compliance Copilot</h3>
            <p className="text-xs text-gray-500">Proactive insights from AI analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {newCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: '#fdf8e8', color: '#d4af37' }}>
              {newCount} new
            </span>
          )}
          <button
            onClick={() => navigate('/copilot')}
            className="text-sm font-medium flex items-center gap-1 hover:underline"
            style={{ color: '#1e4d6b' }}
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {topInsights.map(insight => {
          const sev = severityConfig[insight.severity];
          const TypeIcon = typeIcons[insight.insightType];

          return (
            <div
              key={insight.id}
              className="flex items-start gap-3 p-3 rounded-lg transition-colors"
              style={{ border: `1px solid ${sev.border}`, backgroundColor: sev.bg }}
            >
              <TypeIcon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: sev.dot }} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-900 break-words">{insight.title}</span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{ backgroundColor: sev.bg, color: sev.dot, border: `1px solid ${sev.border}` }}
                  >
                    {sev.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{insight.message}</p>
                {insight.actionType && insight.actionLabel && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAction(insight); }}
                    className="flex items-center gap-1 text-xs font-semibold transition-colors"
                    style={{ color: '#1e4d6b' }}
                  >
                    <ChevronRight className="h-3 w-3" />
                    {insight.actionLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
