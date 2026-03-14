/**
 * VENDOR-SERVICES-BUILD-01 — Owner/Operator dashboard widgets
 *
 * Widget 1: Annual Vendor Spend — rollup of all vendor service costs
 * Widget 2: Services Due Soon — next 5 services within 30 days
 *
 * Visible to owner_operator only. Cost figures hidden from all other roles.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Calendar, ArrowRight, Wrench, Flame, Fan, Filter, Shield, ShieldAlert } from 'lucide-react';
import { NAVY, CARD_BORDER, CARD_SHADOW } from './shared/constants';
import { SERVICE_TYPES, type ServiceTypeCode } from '../../constants/serviceTypes';
import { useDemo } from '../../contexts/DemoContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

/** Vendor service record shape for the widget — matches Supabase location_service_schedules */
interface VendorServiceRecord {
  id: string;
  service_type: string;
  service_type_code: ServiceTypeCode | null;
  vendor_name: string;
  location_name: string;
  next_service_date: string;
  cost_per_visit?: number;
  cost_annual?: number;
  service_frequency?: string;
}

const SVC_ICON_MAP: Record<string, any> = { Flame, Fan, Filter, Shield, ShieldAlert, Wrench };

// ── Status pill colors ───────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  red:   { bg: '#fef2f2', text: '#dc2626' },
  amber: { bg: '#fffbeb', text: '#d97706' },
  gold:  { bg: '#fefce8', text: '#a16207' },
  green: { bg: '#f0fdf4', text: '#16a34a' },
  gray:  { bg: '#f3f4f6', text: '#6b7280' },
};

function getServiceStatus(nextDate: string): { label: string; color: string } {
  if (!nextDate) return { label: 'Not scheduled', color: 'gray' };
  const days = Math.ceil((new Date(nextDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'red' };
  if (days <= 14) return { label: `Due in ${days}d`, color: 'amber' };
  if (days <= 30) return { label: `Due in ${days}d`, color: 'gold' };
  return { label: `${days}d away`, color: 'green' };
}

// ══════════════════════════════════════════════════════════════
// WIDGET 1: Annual Vendor Spend
// ══════════════════════════════════════════════════════════════

interface AnnualSpendProps {
  totalAnnualSpend: number;
  serviceCount: number;
  locationCount: number;
}

export function AnnualVendorSpendWidget({
  totalAnnualSpend,
  serviceCount,
  locationCount,
}: AnnualSpendProps) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-lg overflow-hidden"
      style={{ border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #F0F0F0' }}
      >
        <div className="flex items-center gap-2">
          <DollarSign size={16} style={{ color: NAVY }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Annual Vendor Spend
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {serviceCount === 0 ? (
          /* Empty state */
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">
              No vendor services on file — add services to track spend.
            </p>
            <button
              type="button"
              onClick={() => navigate('/vendors')}
              className="mt-2 text-xs font-semibold transition-colors hover:opacity-80"
              style={{ color: NAVY }}
            >
              Add Vendor Services <ArrowRight size={12} className="inline ml-0.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold" style={{ color: NAVY }}>
              ${totalAnnualSpend.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {serviceCount} service{serviceCount !== 1 ? 's' : ''} across{' '}
              {locationCount} location{locationCount !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>

      {/* Footer CTA */}
      {serviceCount > 0 && (
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          className="w-full px-4 py-2.5 text-center text-xs font-semibold transition-colors hover:bg-gray-50"
          style={{ color: NAVY, borderTop: '1px solid #F0F0F0' }}
        >
          View All Vendors <ArrowRight size={12} className="inline ml-0.5" />
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// WIDGET 2: Services Due Soon
// ══════════════════════════════════════════════════════════════

interface ServicesDueProps {
  services?: VendorServiceRecord[];
}

export function ServicesDueSoonWidget({ services: externalServices }: ServicesDueProps) {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  const { profile } = useAuth();
  const [fetchedServices, setFetchedServices] = useState<VendorServiceRecord[]>([]);

  // Self-fetch from location_service_schedules when no external data provided
  useEffect(() => {
    if (isDemoMode || (externalServices && externalServices.length > 0)) return;
    if (!profile?.organization_id) return;

    supabase
      .from('location_service_schedules')
      .select('id, location_id, service_type_code, next_due_date, last_price, frequency, last_service_date, locations(name)')
      .order('next_due_date', { ascending: true })
      .limit(10)
      .then(({ data }) => {
        if (!data || data.length === 0) { setFetchedServices([]); return; }
        setFetchedServices(data.map((s: any) => ({
          id: s.id,
          service_type: SERVICE_TYPES[s.service_type_code as ServiceTypeCode]?.name || s.service_type_code,
          service_type_code: s.service_type_code,
          vendor_name: '',
          location_name: s.locations?.name || '',
          next_service_date: s.next_due_date,
          cost_per_visit: s.last_price || undefined,
        })));
      });
  }, [isDemoMode, profile?.organization_id, externalServices]);

  const services = (externalServices && externalServices.length > 0) ? externalServices : fetchedServices;

  // Filter to services due within 30 days (or overdue), sort by urgency, take 5
  const servicesDue = services
    .filter(s => s.next_service_date)
    .map(s => ({
      ...s,
      daysUntil: Math.ceil(
        (new Date(s.next_service_date).getTime() - Date.now()) / 86_400_000,
      ),
    }))
    .filter(s => s.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  return (
    <div
      className="bg-white rounded-lg overflow-hidden"
      style={{ border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #F0F0F0' }}
      >
        <div className="flex items-center gap-2">
          <Calendar size={16} style={{ color: NAVY }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Services Due Soon
          </h3>
          {servicesDue.length > 0 && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {servicesDue.length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {servicesDue.length === 0 ? (
        /* Empty state */
        <div className="px-4 py-4 text-center">
          <p className="text-sm text-gray-500">No upcoming services in the next 30 days. Records appear automatically when HoodOps completes work.</p>
          <button
            type="button"
            onClick={() => navigate('/vendors')}
            className="mt-2 text-xs font-semibold transition-colors hover:opacity-80"
            style={{ color: NAVY }}
          >
            View Vendor Schedule <ArrowRight size={12} className="inline ml-0.5" />
          </button>
        </div>
      ) : (
        <div>
          {servicesDue.map((s, i) => {
            const status = getServiceStatus(s.next_service_date);
            const colors = STATUS_COLORS[status.color] || STATUS_COLORS.gray;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate('/vendors')}
                className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
                style={{
                  borderBottom: i < servicesDue.length - 1 ? '1px solid #F0F0F0' : 'none',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {(() => {
                    const stCode = s.service_type_code as ServiceTypeCode;
                    const stDef = stCode ? SERVICE_TYPES[stCode] : null;
                    const IconComp = stDef ? (SVC_ICON_MAP[stDef.icon] || Wrench) : Wrench;
                    const iconColor = stDef ? stDef.color : '#9ca3af';
                    return <IconComp size={14} style={{ color: iconColor, flexShrink: 0 }} />;
                  })()}
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 truncate">
                      {s.service_type}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {s.vendor_name} · {s.location_name}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {status.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer CTA */}
      {servicesDue.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          className="w-full px-4 py-2.5 text-center text-xs font-semibold transition-colors hover:bg-gray-50"
          style={{ color: NAVY, borderTop: '1px solid #F0F0F0' }}
        >
          View Full Schedule <ArrowRight size={12} className="inline ml-0.5" />
        </button>
      )}
    </div>
  );
}
