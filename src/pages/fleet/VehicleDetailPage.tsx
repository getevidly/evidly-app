/**
 * VehicleDetailPage — Vehicle detail with Overview, Maintenance, Insurance, Incidents tabs.
 * Route: /fleet/:id
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Wrench, Shield, AlertTriangle, Plus, MapPin, User, Calendar, Hash } from 'lucide-react';
import { useVehicle, useVehicleMaintenance, useVehicleIncidents } from '../../hooks/api/useVehicles';
import { useVehicleInsurance } from '../../hooks/api/useInsurance';
import { MaintenanceLogModal } from '../../components/fleet/MaintenanceLogModal';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '../../components/dashboard/shared/constants';

type Tab = 'overview' | 'maintenance' | 'insurance' | 'incidents';

const TABS: { value: Tab; label: string; icon: typeof Truck }[] = [
  { value: 'overview', label: 'Overview', icon: Truck },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench },
  { value: 'insurance', label: 'Insurance', icon: Shield },
  { value: 'incidents', label: 'Incidents', icon: AlertTriangle },
];

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: '#dcfce7', text: '#16a34a' },
  maintenance: { label: 'Maintenance', bg: '#fef3c7', text: '#d97706' },
  out_of_service: { label: 'Out of Service', bg: '#fee2e2', text: '#dc2626' },
  sold: { label: 'Sold', bg: '#e5e7eb', text: '#6b7280' },
};

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [showLogMaint, setShowLogMaint] = useState(false);

  const { data: vehicle, isLoading } = useVehicle(id);
  const { data: maintenance } = useVehicleMaintenance(id);
  const { data: incidents } = useVehicleIncidents(id);
  const { data: insurance } = useVehicleInsurance(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#1E2D4D]/8 rounded animate-pulse" />
        <div className="h-64 bg-[#1E2D4D]/8 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-20">
        <Truck className="w-12 h-12 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
        <p className="text-base font-semibold" style={{ color: NAVY }}>Vehicle not found</p>
        <button onClick={() => navigate('/fleet')} className="mt-4 text-sm underline" style={{ color: NAVY }}>
          Back to Fleet
        </button>
      </div>
    );
  }

  const badge = STATUS_BADGE[vehicle.status] || STATUS_BADGE.active;
  const maintenanceList = maintenance || [];
  const incidentList = incidents || [];
  const insuranceList = insurance || [];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button onClick={() => navigate('/fleet')} className="flex items-center gap-1 text-sm mb-3 hover:underline" style={{ color: TEXT_TERTIARY }}>
          <ArrowLeft className="w-4 h-4" /> Back to Fleet
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${NAVY}12` }}>
              <Truck className="w-6 h-6" style={{ color: NAVY }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>{vehicle.name}</h1>
              <p className="text-sm" style={{ color: TEXT_TERTIARY }}>
                {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'No details'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: badge.bg, color: badge.text }}>
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: CARD_BORDER }}>
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2"
            style={{
              borderColor: tab === t.value ? NAVY : 'transparent',
              color: tab === t.value ? NAVY : TEXT_TERTIARY,
            }}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard title="Vehicle Info">
            <InfoRow icon={Truck} label="Type" value={vehicle.vehicleType} />
            <InfoRow icon={Hash} label="VIN" value={vehicle.vin || '—'} />
            <InfoRow icon={MapPin} label="License Plate" value={vehicle.licensePlate ? `${vehicle.licensePlate} (${vehicle.licenseState || ''})` : '—'} />
            <InfoRow icon={Hash} label="Color" value={vehicle.color || '—'} />
          </InfoCard>

          <InfoCard title="Assignment">
            <InfoRow icon={User} label="Assigned To" value={vehicle.assignedEmployeeName || 'Unassigned'} />
            <InfoRow icon={Truck} label="Odometer" value={vehicle.currentOdometer ? `${vehicle.currentOdometer.toLocaleString()} mi` : '—'} />
          </InfoCard>

          <InfoCard title="Registration">
            <InfoRow icon={Calendar} label="Expiry" value={vehicle.registrationExpiry || '—'} />
            <InfoRow icon={Calendar} label="Last Inspection" value={vehicle.lastInspectionDate || '—'} />
            <InfoRow icon={Calendar} label="Next Inspection Due" value={vehicle.nextInspectionDue || '—'} />
          </InfoCard>

          <InfoCard title="Purchase Info">
            <InfoRow icon={Calendar} label="Purchase Date" value={vehicle.purchaseDate || '—'} />
            <InfoRow icon={Hash} label="Purchase Price" value={vehicle.purchasePrice ? `$${vehicle.purchasePrice.toLocaleString()}` : '—'} />
            <InfoRow icon={Truck} label="Purchase Odometer" value={vehicle.purchaseOdometer ? `${vehicle.purchaseOdometer.toLocaleString()} mi` : '—'} />
          </InfoCard>
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowLogMaint(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg"
              style={{ background: NAVY }}
            >
              <Plus className="w-4 h-4" /> Log Maintenance
            </button>
          </div>
          {maintenanceList.length === 0 ? (
            <EmptySection icon={Wrench} title="No maintenance records" subtitle="Log your first maintenance entry to start tracking." />
          ) : (
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: CARD_BORDER }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F4F6FA' }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: NAVY }}>Type</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: NAVY }}>Description</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: NAVY }}>Date</th>
                    <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: NAVY }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceList.map(m => (
                    <tr key={m.id} className="border-t" style={{ borderColor: CARD_BORDER, background: CARD_BG }}>
                      <td className="px-4 py-3 font-medium capitalize" style={{ color: NAVY }}>{m.maintenanceType.replace('_', ' ')}</td>
                      <td className="px-4 py-3" style={{ color: TEXT_TERTIARY }}>{m.description}</td>
                      <td className="px-4 py-3 hidden sm:table-cell" style={{ color: TEXT_TERTIARY }}>{m.serviceDate}</td>
                      <td className="px-4 py-3 hidden md:table-cell" style={{ color: NAVY }}>${m.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'insurance' && (
        <div className="space-y-4">
          {insuranceList.length === 0 ? (
            <EmptySection icon={Shield} title="No insurance policies" subtitle="Add insurance policies for this vehicle." />
          ) : (
            <div className="grid gap-4">
              {insuranceList.map(p => (
                <div key={p.id} className="rounded-xl p-4 border" style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold capitalize" style={{ color: NAVY }}>{p.policyType.replace('_', ' ')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-50 text-green-700' : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/50'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: TEXT_TERTIARY }}>{p.insuranceCompany} — {p.policyNumber}</p>
                  <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>Expires: {p.expiryDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => alert('Report Incident — coming soon')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg"
              style={{ background: NAVY }}
            >
              <Plus className="w-4 h-4" /> Report Incident
            </button>
          </div>
          {incidentList.length === 0 ? (
            <EmptySection icon={AlertTriangle} title="No incidents reported" subtitle="Incidents will appear here when reported." />
          ) : (
            <div className="grid gap-4">
              {incidentList.map(inc => (
                <div key={inc.id} className="rounded-xl p-4 border" style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold capitalize" style={{ color: NAVY }}>{inc.incidentType}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#fef3c7', color: '#d97706' }}>
                      {inc.status}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: TEXT_TERTIARY }}>{inc.description}</p>
                  <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>{inc.incidentDate}{inc.location ? ` — ${inc.location}` : ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showLogMaint && <MaintenanceLogModal vehicleId={id!} onClose={() => setShowLogMaint(false)} />}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: NAVY }}>{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: TEXT_TERTIARY }} />
      <span style={{ color: TEXT_TERTIARY }}>{label}:</span>
      <span className="font-medium" style={{ color: NAVY }}>{value}</span>
    </div>
  );
}

function EmptySection({ icon: Icon, title, subtitle }: { icon: typeof Truck; title: string; subtitle: string }) {
  return (
    <div className="text-center py-12 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <Icon className="w-10 h-10 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
      <p className="text-sm font-semibold" style={{ color: NAVY }}>{title}</p>
      <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>{subtitle}</p>
    </div>
  );
}
