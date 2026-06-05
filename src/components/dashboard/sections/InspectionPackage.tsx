import { useNavigate } from 'react-router-dom';
import { useDashboardLocation } from '../../../contexts/DashboardLocationContext';
import { useRole } from '../../../contexts/RoleContext';
import { useInspectionPackageSummary } from '../../../hooks/useInspectionPackageSummary';
import { InspectionDeliveryLog } from './InspectionDeliveryLog';
import type { DashboardRole } from '../../../constants/dashboardComposition';

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'unknown';
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours === 1) return '1h ago';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1d ago' : `${days}d ago`;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${pluralForm}`;
}

export function InspectionPackage() {
  const navigate = useNavigate();
  const { selectedLocationId } = useDashboardLocation();
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;
  const { locationCount, countyCount, evidenceItemCount, lastRefreshedAt, loading } = useInspectionPackageSummary({ locationIdFilter: selectedLocationId || undefined });

  if (role === 'facilities_manager' || role === 'chef' || role === 'kitchen_manager' || role === 'kitchen_staff') {
    return null;
  }

  const disabled = evidenceItemCount === 0;

  let title = 'Inspection package';
  if (role === 'executive') title = 'Inspection package · Portfolio';
  if (role === 'compliance_manager') title = 'Inspection package · Portfolio';

  let meta: string;
  if (disabled) {
    meta = 'Add documents to enable inspection package — 0 evidence items on record.';
  } else if (role === 'owner_operator') {
    meta = `Ready · last refreshed ${formatTimeAgo(lastRefreshedAt)} · ${plural(locationCount, 'location', 'locations')} · ${plural(countyCount, 'county', 'counties')} · ${plural(evidenceItemCount, 'evidence item', 'evidence items')}`;
  } else if (role === 'executive') {
    meta = `Ready · ${plural(locationCount, 'location', 'locations')} · ${plural(evidenceItemCount, 'evidence item', 'evidence items')}`;
  } else {
    meta = `Ready · ${plural(locationCount, 'location', 'locations')} · ${plural(evidenceItemCount, 'evidence item', 'evidence items')} · full chain-of-custody`;
  }

  return (
    <div className="insp-pkg">
      <div className="insp-head">
        <i className="ti ti-file-zip" />
        <div>
          <p className="insp-title">{title}</p>
          <p className="insp-meta">{loading ? 'Loading...' : meta}</p>
        </div>
        <div className="insp-actions">
          {/* TODO: Download path — likely client-side zip from documents bucket OR send-to-self via send-inspection-package edge fn. Defer to post-launch. */}
          <button
            type="button"
            className="insp-btn primary"
            disabled={disabled && !loading}
            onClick={() => navigate('/inspection-package/send')}
          >
            <i className="ti ti-send" />
            Send
          </button>
        </div>
      </div>
      <InspectionDeliveryLog />
    </div>
  );
}
