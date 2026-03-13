/**
 * ServiceComplianceList — HOODOPS-SERVICES-01
 *
 * Shows all 5 service types with compliance status per location.
 * KEC is parent row; FPM/GFX/RGC are indented children; FS is standalone.
 */
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flame, Fan, Filter, Shield, ShieldAlert, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import { useRole } from '../../contexts/RoleContext';
import {
  SERVICE_TYPES,
  SERVICE_TYPE_CODES,
  KEC_CHILDREN,
  getServiceStatus,
  formatFrequency,
  STATUS_LABELS,
  STATUS_COLORS,
  projectAnnualCost,
} from '../../constants/serviceTypes';
import { DEMO_SERVICE_SCHEDULES } from '../../data/vendorServicesDemoData';

const ICON_MAP = { Flame, Fan, Filter, Shield, ShieldAlert };
const CAN_LOG = ['owner_operator', 'compliance_manager', 'facilities_manager'];

export function ServiceComplianceList({ onLogService }) {
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();
  const [searchParams] = useSearchParams();
  const locationFilter = searchParams.get('location');
  const [kecExpanded, setKecExpanded] = useState(true);

  const schedules = useMemo(() => {
    if (!isDemoMode) return []; // production: would query location_service_schedules
    let data = DEMO_SERVICE_SCHEDULES;
    if (locationFilter) {
      const locMap = { downtown: 'demo-loc-downtown', airport: 'demo-loc-airport', university: 'demo-loc-university' };
      const locId = locMap[locationFilter];
      if (locId) data = data.filter(s => s.location_id === locId);
    }
    return data;
  }, [isDemoMode, locationFilter]);

  // Group by service type
  const byType = useMemo(() => {
    const map = {};
    for (const code of SERVICE_TYPE_CODES) {
      map[code] = schedules.filter(s => s.service_type_code === code);
    }
    return map;
  }, [schedules]);

  function renderRow(code, indent = false) {
    const st = SERVICE_TYPES[code];
    const items = byType[code] || [];
    const Icon = ICON_MAP[st.icon] || Shield;

    // Aggregate status: worst across locations
    let worstStatus = 'not_tracked';
    for (const item of items) {
      const s = getServiceStatus(item.next_due_date);
      if (s === 'overdue') { worstStatus = 'overdue'; break; }
      if (s === 'due_soon' && worstStatus !== 'overdue') worstStatus = 'due_soon';
      if (s === 'current' && worstStatus === 'not_tracked') worstStatus = 'current';
    }
    const statusColor = STATUS_COLORS[worstStatus];
    const totalAnnual = items.reduce((sum, i) => sum + projectAnnualCost(i.price, i.frequency), 0);

    return (
      <div
        key={code}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border, #D1D9E6)',
          marginLeft: indent ? 32 : 0,
          gap: 12,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: st.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: 16, height: 16, color: st.color }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #0B1628)' }}>
            {st.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary, #6B7F96)' }}>
            {st.nfpaCitation} · {items.length > 0 ? `${items.length} location${items.length > 1 ? 's' : ''}` : 'Not tracked'}
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 12,
          background: statusColor.bg, fontSize: 11, fontWeight: 600, color: statusColor.text,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor.dot }} />
          {STATUS_LABELS[worstStatus]}
        </div>

        {/* Annual cost */}
        {items.length > 0 && (
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #3D5068)', minWidth: 70, textAlign: 'right' }}>
            ${totalAnnual.toLocaleString()}/yr
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--border, #D1D9E6)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--border, #D1D9E6)',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #0B1628)' }}>
            Service Compliance
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary, #6B7F96)', marginTop: 2 }}>
            NFPA 96 required vendor services
          </div>
        </div>
        {CAN_LOG.includes(userRole) && onLogService && (
          <button
            onClick={onLogService}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 8,
              background: '#1e4d6b', border: 'none',
              fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer',
            }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Log Service
          </button>
        )}
      </div>

      {/* KEC parent row */}
      <button
        onClick={() => setKecExpanded(!kecExpanded)}
        style={{
          display: 'flex', alignItems: 'center', width: '100%',
          padding: '12px 16px', border: 'none', background: 'none',
          borderBottom: '1px solid var(--border, #D1D9E6)',
          cursor: 'pointer', gap: 12, textAlign: 'left',
        }}
      >
        {kecExpanded ? <ChevronDown style={{ width: 14, height: 14, color: '#6B7F96' }} /> : <ChevronRight style={{ width: 14, height: 14, color: '#6B7F96' }} />}
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: SERVICE_TYPES.KEC.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Flame style={{ width: 16, height: 16, color: SERVICE_TYPES.KEC.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #0B1628)' }}>
            Kitchen Exhaust Cleaning (KEC)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary, #6B7F96)' }}>
            NFPA 96-2024 Table 12.4 · Parent service with 3 sub-services
          </div>
        </div>
        {(() => {
          const kecItems = byType['KEC'] || [];
          let ws = 'not_tracked';
          for (const i of kecItems) {
            const s = getServiceStatus(i.next_due_date);
            if (s === 'overdue') { ws = 'overdue'; break; }
            if (s === 'due_soon') ws = 'due_soon';
            if (s === 'current' && ws === 'not_tracked') ws = 'current';
          }
          const sc = STATUS_COLORS[ws];
          return (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 12,
              background: sc.bg, fontSize: 11, fontWeight: 600, color: sc.text,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
              {STATUS_LABELS[ws]}
            </div>
          );
        })()}
      </button>

      {/* KEC children */}
      {kecExpanded && KEC_CHILDREN.map(code => renderRow(code, true))}

      {/* FS standalone */}
      {renderRow('FS', false)}

      {/* Empty state */}
      {schedules.length === 0 && (
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary, #6B7F96)', marginBottom: 8 }}>
            No service schedules configured for this location.
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary, #6B7F96)' }}>
            Add services manually or connect your HoodOps account to auto-sync.
          </div>
        </div>
      )}
    </div>
  );
}
