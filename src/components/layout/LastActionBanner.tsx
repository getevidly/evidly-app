import { useLastAction, formatRelativeTime } from '../../hooks/useLastAction';

export function LastActionBanner() {
  const action = useLastAction();

  if (!action) return null;

  const locationSuffix = action.location_name ? ` (${action.location_name})` : '';

  return (
    <div className="last-action">
      <i className="ti ti-circle-check-filled" />
      <strong>Last action logged:</strong>
      <span>
        {action.user} — {action.detail}
        {locationSuffix}
      </span>
      <span className="last-action-ago">{formatRelativeTime(action.timestamp)}</span>
    </div>
  );
}
