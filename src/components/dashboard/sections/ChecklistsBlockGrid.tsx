/**
 * ChecklistsBlockGrid — C11
 *
 * 3-card cadence grid (daily / weekly / monthly) for
 * chef, kitchen_manager (readonly=false) and kitchen_staff (readonly=true).
 */

import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { useChecklistStatus } from '../../../hooks/useChecklistStatus';
import { ChecklistCard } from './ChecklistCard';

interface ChecklistsBlockGridProps {
  readonly: boolean;
}

export function ChecklistsBlockGrid({ readonly }: ChecklistsBlockGridProps) {
  const { selectedLocationId } = useDashboardLocation();
  const { dailyItems, weeklyItems, monthlyItems, loading, completeInstance } = useChecklistStatus({ locationIdFilter: selectedLocationId || undefined });

  if (loading) {
    return (
      <div className="cl-grid">
        {['daily', 'weekly', 'monthly'].map(c => (
          <div key={c} className="cl-card">
            <div className="cl-h">
              <span className="cl-h-label">{c.charAt(0).toUpperCase() + c.slice(1)}</span>
            </div>
            <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cl-grid">
      <ChecklistCard cadence="daily" items={dailyItems} readonly={readonly} onComplete={completeInstance} />
      <ChecklistCard cadence="weekly" items={weeklyItems} readonly={readonly} onComplete={completeInstance} />
      <ChecklistCard cadence="monthly" items={monthlyItems} readonly={readonly} onComplete={completeInstance} />
    </div>
  );
}
