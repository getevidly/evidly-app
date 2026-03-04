import { useNavigate } from 'react-router-dom';
import { CARD_BG, CARD_BORDER, CARD_SHADOW, BODY_TEXT, MUTED, NAVY } from '../constants';

export interface RiskItem {
  id: string;
  title: string;
  location: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  dueDate: string;
  route: string;
}

interface Props {
  items: RiskItem[];
}

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEV_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b7280',
};
const SEV_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function TopRiskItemsWidget({ items }: Props) {
  const navigate = useNavigate();

  const sorted = [...items]
    .sort((a, b) => {
      const sevDiff = (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3);
      if (sevDiff !== 0) return sevDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 3);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        boxShadow: CARD_SHADOW,
      }}
    >
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
        <h3 className="text-sm font-semibold" style={{ color: BODY_TEXT }}>
          Top Open Risk Items
        </h3>
      </div>

      {sorted.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-xs" style={{ color: MUTED }}>No open risk items</p>
        </div>
      ) : (
        <div>
          {sorted.map((item) => {
            const dueDateDisplay = new Date(item.dueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            const isOverdue = new Date(item.dueDate) < new Date(new Date().toISOString().slice(0, 10));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.route)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50"
                style={{ borderBottom: '1px solid #F0F0F0' }}
              >
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: SEV_COLOR[item.severity],
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: BODY_TEXT }}>
                    {item.title}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                    {item.location} &middot; {SEV_LABEL[item.severity]} &middot; {item.category}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className="text-[11px] font-medium"
                    style={{ color: isOverdue ? '#dc2626' : MUTED }}
                  >
                    {isOverdue ? 'Overdue' : `Due ${dueDateDisplay}`}
                  </p>
                </div>
                <span className="text-xs font-semibold shrink-0" style={{ color: NAVY }}>
                  View &rarr;
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
