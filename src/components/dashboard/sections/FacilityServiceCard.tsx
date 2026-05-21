/**
 * FacilityServiceCard — C14
 *
 * Single facility service category card with schedule summary.
 */

import type { FacilityServiceCategory } from '../../../hooks/useFacilityServices';

interface FacilityServiceCardProps {
  category: FacilityServiceCategory;
}

const ICON_MAP: Record<string, string> = {
  Thermometer: 'ti-air-conditioning',
  Wrench: 'ti-tool',
  Zap: 'ti-plug',
  Snowflake: 'ti-snowflake',
  Bug: 'ti-bug',
  Droplets: 'ti-droplet',
  Flame: 'ti-flame',
  Fan: 'ti-propeller',
  Filter: 'ti-filter',
  Shield: 'ti-shield',
  ShieldAlert: 'ti-shield-check',
  BellRing: 'ti-bell',
  ArrowDownUp: 'ti-arrows-down-up',
  FireExtinguisher: 'ti-fire-extinguisher',
};

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch { return iso; }
}

export function FacilityServiceCard({ category }: FacilityServiceCardProps) {
  const iconCls = ICON_MAP[category.icon] || 'ti-tool';
  const scheds = category.schedules;

  let metaContent: JSX.Element;

  if (scheds.length === 0) {
    metaContent = (
      <p className="fs-meta">Not scheduled · configure in Settings</p>
    );
  } else if (scheds.length === 1) {
    const s = scheds[0];
    const dueCls = s.status_tone === 'ok' ? 'ok' : 'due';
    const dateText = s.next_due_date ? fmtDate(s.next_due_date) : 'TBD';
    metaContent = (
      <p className="fs-meta">
        {s.location_name} · {s.vendor_name}
        {s.frequency_label && ` · ${s.frequency_label}`}
        {' · Next: '}<span className={dueCls}>{dateText}</span>
      </p>
    );
  } else {
    // Multiple schedules — find earliest next_due_date
    const vendors = [...new Set(scheds.map(s => s.vendor_name))];
    const vendorText = vendors.length === 1 ? vendors[0] : 'multiple vendors';
    const withDates = scheds.filter(s => s.next_due_date);
    const earliest = withDates.length > 0
      ? withDates.reduce((a, b) => (a.next_due_date! < b.next_due_date! ? a : b))
      : null;
    const worstTone = scheds.some(s => s.status_tone === 'overdue') ? 'due'
      : scheds.some(s => s.status_tone === 'due') ? 'due' : 'ok';

    metaContent = (
      <p className="fs-meta">
        {scheds.length} sites · {vendorText}
        {earliest && <>{' · Next: '}<span className={worstTone}>{fmtDate(earliest.next_due_date!)}</span></>}
      </p>
    );
  }

  return (
    <div className="fs-card">
      <p className="fs-h">
        <i className={iconCls} />
        {category.name}
      </p>
      {metaContent}
    </div>
  );
}
