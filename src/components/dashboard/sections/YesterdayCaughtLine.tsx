import { useRole } from '../../../contexts/RoleContext';
import { useYesterdayCatches } from '../../../hooks/useYesterdayCatches';
import type { DashboardRole } from '../../../constants/dashboardComposition';
import type { DriftCatch } from '../../../hooks/useYesterdayCatches';

function formatSavings(usd: number): string {
  return (usd).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function buildSummary(catches: DriftCatch[]): string {
  if (catches.length === 1) {
    const c = catches[0];
    const pillarLabel = c.pillar === 'food_safety' ? 'food safety' : 'fire safety';
    return `1 ${pillarLabel} drift at ${c.location_name}`;
  }
  const locationNames = new Set(catches.map(c => c.location_name));
  return `${catches.length} drifts across ${locationNames.size} location${locationNames.size === 1 ? '' : 's'}`;
}

export function YesterdayCaughtLine() {
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;
  const { catches, loading } = useYesterdayCatches();

  if (loading) return null;
  if (role === 'kitchen_manager' || role === 'kitchen_staff') return null;

  let filtered = catches;
  if (role === 'facilities_manager') {
    filtered = catches.filter(c => c.pillar === 'fire_safety');
  } else if (role === 'chef') {
    filtered = catches.filter(c => c.pillar === 'food_safety');
  }

  if (filtered.length === 0) return null;

  const summary = buildSummary(filtered);
  const filteredSavings = filtered.reduce((s, c) => s + c.estimated_savings_cents, 0) / 100;

  let copy: string;
  switch (role) {
    case 'owner_operator':
      copy = `Yesterday EvidLY caught: ${summary} — corrective action dispatched, est. ${formatSavings(filteredSavings)} product saved.`;
      break;
    case 'executive':
      copy = `Yesterday EvidLY caught: ${summary} · ${formatSavings(filteredSavings)} saved.`;
      break;
    case 'compliance_manager':
      copy = `Yesterday EvidLY caught: ${summary}.`;
      break;
    case 'facilities_manager':
      copy = `Yesterday EvidLY caught: ${summary}.`;
      break;
    case 'chef':
      copy = `Yesterday EvidLY caught: ${summary}.`;
      break;
    default:
      return null;
  }

  return (
    <div className="caught-line">
      <i className="ti ti-eye-check" />
      <span dangerouslySetInnerHTML={{ __html: copy.replace(/Yesterday EvidLY caught:/, '<strong>Yesterday EvidLY caught:</strong>') }} />
    </div>
  );
}
