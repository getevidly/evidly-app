import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { CARD_BG, CARD_BORDER, BODY_TEXT, NAVY } from '../constants';

export interface RiskItem {
  id: string;
  title: string;
  location: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  dueDate: string;
  route: string;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEVERITY_STYLE: Record<string, { dot: string; bg: string; text: string }> = {
  critical: { dot: '#dc2626', bg: '#fef2f2', text: '#991b1b' },
  high: { dot: '#ea580c', bg: '#fff7ed', text: '#9a3412' },
  medium: { dot: '#d97706', bg: '#fffbeb', text: '#92400e' },
  low: { dot: '#6b7280', bg: '#f3f4f6', text: '#374151' },
};

interface Props {
  items: RiskItem[];
}

export function TopRiskItemsWidget({ items }: Props) {
  const navigate = useNavigate();

  const sorted = [...items]
    .sort((a, b) => {
      const sevDiff = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
      if (sevDiff !== 0) return sevDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 3);

  const formatDueDate = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Due today';
    return `${diff}d left`;
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>Top Risk Items</h3>
        <span className="text-xs font-medium" style={{ color: '#6B7F96' }}>{items.length} open</span>
      </div>
      {sorted.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-500">No open risk items</p>
        </div>
      ) : (
        <div>
          {sorted.map(item => {
            const style = SEVERITY_STYLE[item.severity] ?? SEVERITY_STYLE.low;
            const isCritical = item.severity === 'critical';
            const dueLabel = formatDueDate(item.dueDate);
            const isOverdue = dueLabel.includes('overdue');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                style={{ borderBottom: `1px solid #F0F0F0` }}
              >
                {isCritical
                  ? <AlertTriangle size={16} style={{ color: style.dot }} className="shrink-0" />
                  : <AlertCircle size={16} style={{ color: style.dot }} className="shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.location} &middot; {item.category}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: style.bg, color: style.text }}
                  >
                    {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
                  </span>
                  <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                    {dueLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {items.length > 3 && (
        <button
          type="button"
          onClick={() => navigate('/corrective-actions')}
          className="w-full px-4 py-3 text-center text-xs font-semibold transition-colors hover:bg-gray-50"
          style={{ color: NAVY }}
        >
          View all {items.length} items &rarr;
        </button>
      )}
    </div>
  );
}
