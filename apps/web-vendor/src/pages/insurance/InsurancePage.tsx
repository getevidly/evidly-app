/**
 * InsurancePage — Insurance overview with company policies, vehicle insurance, roadside assistance.
 * Route: /insurance
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { useCompanyInsurance, useVehicleInsurance, useRoadsideAssistance } from '../../hooks/api/useInsurance';
import { InsurancePolicyModal } from '../../components/insurance/InsurancePolicyModal';
import { RoadsideAssistanceCard } from '../../components/insurance/RoadsideAssistanceCard';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '@shared/components/dashboard/shared/constants';

type Section = 'company' | 'vehicle' | 'roadside';

const SECTION_TABS: { value: Section; label: string }[] = [
  { value: 'company', label: 'Company Insurance' },
  { value: 'vehicle', label: 'Vehicle Insurance' },
  { value: 'roadside', label: 'Roadside Assistance' },
];

const POLICY_TYPE_LABELS: Record<string, string> = {
  general_liability: 'General Liability',
  workers_comp: "Workers' Comp",
  professional_liability: 'Professional Liability',
  property: 'Property',
  cyber: 'Cyber',
  umbrella: 'Umbrella',
  liability: 'Liability',
  collision: 'Collision',
  comprehensive: 'Comprehensive',
  commercial_auto: 'Commercial Auto',
};

export function InsurancePage() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('company');
  const [showAddPolicy, setShowAddPolicy] = useState(false);

  const { data: companyPolicies, isLoading: loadingCompany } = useCompanyInsurance();
  const { data: vehiclePolicies, isLoading: loadingVehicle } = useVehicleInsurance();
  const { data: roadside, isLoading: loadingRoadside } = useRoadsideAssistance();

  const company = companyPolicies || [];
  const vehicle = vehiclePolicies || [];
  const roadsideList = roadside || [];
  const allPolicies = [...company, ...vehicle];
  const isLoading = loadingCompany || loadingVehicle || loadingRoadside;

  const stats = useMemo(() => ({
    active: allPolicies.filter(p => p.isActive).length,
    expiringSoon: allPolicies.filter(p => {
      const diff = new Date(p.expiryDate).getTime() - Date.now();
      return diff > 0 && diff < 30 * 86400000;
    }).length,
    totalPremium: allPolicies.reduce((sum, p) => sum + (p.premiumAmount || 0), 0),
  }), [allPolicies]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" style={{ color: NAVY }} />
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Insurance</h1>
          </div>
          <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>Manage policies, coverage, and roadside assistance.</p>
        </div>
        <button
          onClick={() => setShowAddPolicy(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg"
          style={{ background: NAVY }}
        >
          <Plus className="w-4 h-4" /> Add Policy
        </button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg p-4 animate-pulse" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <div className="h-3 w-20 bg-gray-200 rounded mb-2 mx-auto" />
              <div className="h-6 w-10 bg-gray-200 rounded mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Shield} label="Active Policies" value={stats.active} color={NAVY} />
          <StatCard icon={Clock} label="Expiring in 30 Days" value={stats.expiringSoon} color="#dc2626" />
          <StatCard icon={DollarSign} label="Total Annual Premium" value={`$${stats.totalPremium.toLocaleString()}`} color="#16a34a" />
        </div>
      )}

      {/* Section tabs */}
      <div className="flex border-b" style={{ borderColor: CARD_BORDER }}>
        {SECTION_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setSection(t.value)}
            className="px-4 py-2.5 text-sm font-medium transition-colors border-b-2"
            style={{
              borderColor: section === t.value ? NAVY : 'transparent',
              color: section === t.value ? NAVY : TEXT_TERTIARY,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {section === 'company' && (
        <PolicyList
          policies={company}
          isLoading={loadingCompany}
          emptyTitle="No company insurance policies"
          emptySubtitle="Add general liability, workers' comp, or other company policies."
          onAdd={() => setShowAddPolicy(true)}
          onSelect={(id) => navigate(`/insurance/${id}`)}
        />
      )}

      {section === 'vehicle' && (
        <PolicyList
          policies={vehicle}
          isLoading={loadingVehicle}
          emptyTitle="No vehicle insurance policies"
          emptySubtitle="Add liability, collision, or comprehensive coverage for your vehicles."
          onAdd={() => setShowAddPolicy(true)}
          onSelect={(id) => navigate(`/insurance/${id}`)}
        />
      )}

      {section === 'roadside' && (
        <div className="space-y-4">
          {loadingRoadside ? (
            <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ) : roadsideList.length === 0 ? (
            <div className="text-center py-12 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
              <p className="text-sm font-semibold" style={{ color: NAVY }}>No roadside assistance on file</p>
              <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>Add roadside assistance provider information.</p>
            </div>
          ) : (
            roadsideList.map(r => <RoadsideAssistanceCard key={r.id} data={r} />)
          )}
        </div>
      )}

      {showAddPolicy && <InsurancePolicyModal onClose={() => setShowAddPolicy(false)} />}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function PolicyList({
  policies,
  isLoading,
  emptyTitle,
  emptySubtitle,
  onAdd,
  onSelect,
}: {
  policies: { id: string; policyType: string; insuranceCompany: string; policyNumber: string; expiryDate: string; isActive: boolean; premiumAmount: number | null }[];
  isLoading: boolean;
  emptyTitle: string;
  emptySubtitle: string;
  onAdd: () => void;
  onSelect: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
        <p className="text-sm font-semibold" style={{ color: NAVY }}>{emptyTitle}</p>
        <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>{emptySubtitle}</p>
        <button onClick={onAdd} className="mt-4 px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: NAVY }}>
          Add Policy
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {policies.map(p => {
        const isExpiringSoon = (() => {
          const diff = new Date(p.expiryDate).getTime() - Date.now();
          return diff > 0 && diff < 30 * 86400000;
        })();
        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="rounded-xl p-4 border cursor-pointer hover:shadow-md transition-shadow"
            style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: NAVY }}>
                {POLICY_TYPE_LABELS[p.policyType] || p.policyType}
              </span>
              <div className="flex items-center gap-2">
                {isExpiringSoon && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">Expiring Soon</span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <p className="text-sm" style={{ color: TEXT_TERTIARY }}>{p.insuranceCompany} — {p.policyNumber}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs" style={{ color: TEXT_TERTIARY }}>Expires: {p.expiryDate}</p>
              {p.premiumAmount && <p className="text-xs font-medium" style={{ color: NAVY }}>${p.premiumAmount.toLocaleString()}/yr</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Shield; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: `${color}12` }}>
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <p className="text-xs" style={{ color: TEXT_TERTIARY }}>{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: NAVY }}>{value}</p>
    </div>
  );
}
