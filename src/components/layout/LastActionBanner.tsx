import { useLastAction, formatRelativeTime } from '../../hooks/useLastAction';

export function LastActionBanner() {
  const { action, loading } = useLastAction();

  // Reserve the strip while the query is in flight so the banner does not
  // shove the breadcrumb bar and the whole scroller down when it resolves.
  if (loading) return <div className="last-action-reserve" aria-hidden="true" />;
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
