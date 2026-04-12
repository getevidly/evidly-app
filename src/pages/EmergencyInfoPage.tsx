/**
 * EmergencyInfoPage — Mobile-optimized emergency contacts, roadside assistance, insurance, and vehicle info.
 * Route: /emergency
 */
import { Phone, Shield, Users, Truck, AlertTriangle, ExternalLink } from 'lucide-react';
import { useEmergencyInfo } from '../hooks/api/useInsurance';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '../components/dashboard/shared/constants';

export function EmergencyInfoPage() {
  const { data: info, isLoading } = useEmergencyInfo();

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-[#1E2D4D]/8 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const roadside = info?.roadsideAssistance || [];
  const autoInsurance = info?.autoInsurance || [];
  const contacts = info?.companyContacts || [];
  const vehicle = info?.assignedVehicle || null;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#dc262612' }}>
          <AlertTriangle className="w-7 h-7" style={{ color: '#dc2626' }} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Emergency Info</h1>
        <p className="text-sm mt-1" style={{ color: TEXT_TERTIARY }}>Critical contacts and policy info — tap to call</p>
      </div>

      {/* Roadside Assistance */}
      <SectionCard
        icon={Shield}
        iconColor="#dc2626"
        title="Roadside Assistance"
        empty={roadside.length === 0}
        emptyText="No roadside assistance on file"
      >
        {roadside.map(r => (
          <div key={r.id} className="mb-3 last:mb-0">
            <p className="text-sm font-semibold" style={{ color: NAVY }}>{r.providerName}</p>
            <BigPhoneLink phone={r.phoneNumber} />
            {r.membershipNumber && (
              <p className="text-xs mt-1" style={{ color: TEXT_TERTIARY }}>Membership: {r.membershipNumber}</p>
            )}
            {r.appName && (
              <p className="text-xs mt-0.5" style={{ color: TEXT_TERTIARY }}>App: {r.appName}</p>
            )}
          </div>
        ))}
      </SectionCard>

      {/* Insurance Info */}
      <SectionCard
        icon={Shield}
        iconColor={NAVY}
        title="Insurance Info"
        empty={autoInsurance.length === 0}
        emptyText="No auto insurance on file"
      >
        {autoInsurance.map(p => (
          <div key={p.id} className="mb-3 last:mb-0">
            <p className="text-sm font-semibold capitalize" style={{ color: NAVY }}>{p.policyType.replace('_', ' ')}</p>
            <p className="text-sm" style={{ color: TEXT_TERTIARY }}>{p.insuranceCompany}</p>
            <p className="text-sm font-mono" style={{ color: NAVY }}>Policy: {p.policyNumber}</p>
            {p.agentPhone && <BigPhoneLink phone={p.agentPhone} label="Claims/Agent" />}
          </div>
        ))}
      </SectionCard>

      {/* Company Contacts */}
      <SectionCard
        icon={Users}
        iconColor="#16a34a"
        title="Company Contacts"
        empty={contacts.length === 0}
        emptyText="No company contacts on file"
      >
        {contacts.map((c, i) => (
          <div key={i} className="mb-3 last:mb-0">
            <p className="text-xs uppercase font-semibold tracking-wide" style={{ color: TEXT_TERTIARY }}>{c.role}</p>
            <p className="text-sm font-medium" style={{ color: NAVY }}>{c.name}</p>
            <BigPhoneLink phone={c.phone} />
          </div>
        ))}
      </SectionCard>

      {/* Assigned Vehicle */}
      <SectionCard
        icon={Truck}
        iconColor="#d97706"
        title="Your Vehicle"
        empty={!vehicle}
        emptyText="No vehicle assigned"
      >
        {vehicle && (
          <>
            <p className="text-sm font-semibold" style={{ color: NAVY }}>{vehicle.name}</p>
            {vehicle.vin && <InfoLine label="VIN" value={vehicle.vin} />}
            {vehicle.licensePlate && <InfoLine label="Plate" value={vehicle.licensePlate} />}
            {vehicle.registrationExpiry && <InfoLine label="Reg. Expires" value={vehicle.registrationExpiry} />}
          </>
        )}
      </SectionCard>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  iconColor,
  title,
  empty,
  emptyText,
  children,
}: {
  icon: typeof Shield;
  iconColor: string;
  title: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
        <h2 className="text-base font-bold" style={{ color: NAVY }}>{title}</h2>
      </div>
      {empty ? (
        <p className="text-sm text-center py-4" style={{ color: TEXT_TERTIARY }}>{emptyText}</p>
      ) : (
        children
      )}
    </div>
  );
}

function BigPhoneLink({ phone, label }: { phone: string; label?: string }) {
  return (
    <a
      href={`tel:${phone}`}
      className="flex items-center gap-2 mt-1.5 p-2.5 rounded-lg transition-colors"
      style={{ background: `${NAVY}08`, border: `1px solid ${CARD_BORDER}` }}
    >
      <Phone className="w-4 h-4" style={{ color: NAVY }} />
      <span className="text-base font-bold" style={{ color: NAVY }}>{phone}</span>
      {label && <span className="text-xs ml-1" style={{ color: TEXT_TERTIARY }}>({label})</span>}
      <ExternalLink className="w-3.5 h-3.5 ml-auto" style={{ color: TEXT_TERTIARY }} />
    </a>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm mt-1">
      <span style={{ color: TEXT_TERTIARY }}>{label}</span>
      <span className="font-mono font-medium" style={{ color: NAVY }}>{value}</span>
    </div>
  );
}
