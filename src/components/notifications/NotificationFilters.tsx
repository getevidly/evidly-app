/**
 * NotificationFilters — Category tab bar for the notification panel.
 */

import { NOTIFICATION_CATEGORIES, type UnifiedNotification } from './notificationConstants';
import type { NotificationCategory } from '../../constants/statusColors';

export type FilterValue = 'all' | NotificationCategory;

interface NotificationFiltersProps {
  filter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
  notifications: UnifiedNotification[];
}

export function NotificationFilters({ filter, onFilterChange, notifications }: NotificationFiltersProps) {
  const allCount = notifications.length;

  return (
    <div className="flex border-b border-gray-100 px-2 overflow-x-auto" style={{ backgroundColor: '#faf8f3' }}>
      <button
        onClick={() => onFilterChange('all')}
        className="px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap"
        style={{
          color: filter === 'all' ? '#1e4d6b' : '#6b7280',
          borderBottom: filter === 'all' ? '2px solid #1e4d6b' : '2px solid transparent',
        }}
      >
        All ({allCount})
      </button>

      {NOTIFICATION_CATEGORIES.map(cat => {
        const count = notifications.filter(n => n.category === cat.key).length;
        if (count === 0) return null;
        return (
          <button
            key={cat.key}
            onClick={() => onFilterChange(cat.key)}
            className="px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap"
            style={{
              color: filter === cat.key ? cat.color : '#6b7280',
              borderBottom: filter === cat.key ? `2px solid ${cat.color}` : '2px solid transparent',
            }}
          >
            {cat.label} ({count})
          </button>
        );
      })}
    </div>
  );
}
