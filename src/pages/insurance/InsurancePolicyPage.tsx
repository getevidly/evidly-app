/**
 * InsurancePolicyPage — Full policy detail with coverage, agent, documents.
 * Route: /insurance/:id
 */
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Phone, Mail, User, Calendar, DollarSign } from 'lucide-react';
import { useInsurancePolicy } from '../../hooks/api/useInsurance';
import { NAVY, CARD_BG, CARD_BORDER, CARD_SHADOW, TEXT_TERTIARY } from '../../components/dashboard/shared/constants';

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

export function InsurancePolicyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: policy, isLoading } = useInsurancePolicy(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#1E2D4D]/8 rounded animate-pulse" />
        <div className="h-64 bg-[#1E2D4D]/8 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-20">
        <Shield className="w-12 h-12 mx-auto mb-3" style={{ color: TEXT_TERTIARY }} />
        <p className="text-base font-semibold" style={{ color: NAVY }}>Policy not found</p>
        <button onClick={() => navigate('/insurance')} className="mt-4 text-sm underline" style={{ color: NAVY }}>
          Back to Insurance
        </button>
      </div>
    );
  }

  const p = policy as any;

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/insurance')} className="flex items-center gap-1 text-sm mb-3 hover:underline" style={{ color: TEXT_TERTIARY }}>
          <ArrowLeft className="w-4 h-4" /> Back to Insurance
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${NAVY}12` }}>
            <Shield className="w-6 h-6" style={{ color: NAVY }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>
              {POLICY_TYPE_LABELS[p.policyType] || p.policyType}
            </h1>
            <p className="text-sm" style={{ color: TEXT_TERTIARY }}>{p.insuranceCompany} — {p.policyNumber}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-50 text-green-700' : 'bg-[#1E2D4D]/5 text-[#1E2D4D]/50'}`}>
            {p.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Coverage */}
        <InfoCard title="Coverage Details">
          <InfoRow icon={DollarSign} label="Coverage Amount" value={p.coverageAmount ? `$${Number(p.coverageAmount).toLocaleString()}` : '—'} />
          {p.aggregateLimit && <InfoRow icon={DollarSign} label="Aggregate Limit" value={`$${Number(p.aggregateLimit).toLocaleString()}`} />}
          <InfoRow icon={DollarSign} label="Deductible" value={p.deductible ? `$${Number(p.deductible).toLocaleString()}` : '—'} />
          {p.experienceModRate && <InfoRow icon={DollarSign} label="EMR" value={String(p.experienceModRate)} />}
        </InfoCard>

        {/* Dates & Premium */}
        <InfoCard title="Dates & Premium">
          <InfoRow icon={Calendar} label="Effective" value={p.effectiveDate} />
          <InfoRow icon={Calendar} label="Expiry" value={p.expiryDate} />
          <InfoRow icon={DollarSign} label="Premium" value={p.premiumAmount ? `$${Number(p.premiumAmount).toLocaleString()}` : '—'} />
          <InfoRow icon={Calendar} label="Payment" value={p.paymentFrequency?.replace('_', ' ') || '—'} />
        </InfoCard>

        {/* Agent */}
        <InfoCard title="Agent / Broker">
          <InfoRow icon={User} label="Name" value={p.agentName || '—'} />
          {p.agentCompany && <InfoRow icon={User} label="Company" value={p.agentCompany} />}
          <InfoRow icon={Phone} label="Phone" value={p.agentPhone || '—'} />
          <InfoRow icon={Mail} label="Email" value={p.agentEmail || '—'} />
        </InfoCard>

        {/* Documents */}
        <InfoCard title="Documents">
          <DocLink label="Policy Document" url={p.policyDocumentUrl} />
          <DocLink label="Certificate of Insurance" url={p.certificateOfInsuranceUrl || p.insuranceCardUrl} />
        </InfoCard>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: NAVY }}>{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Shield; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: TEXT_TERTIARY }} />
      <span style={{ color: TEXT_TERTIARY }}>{label}:</span>
      <span className="font-medium" style={{ color: NAVY }}>{value}</span>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: TEXT_TERTIARY }} />
      <span style={{ color: TEXT_TERTIARY }}>{label}:</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium underline" style={{ color: NAVY }}>View</a>
      ) : (
        <span className="font-medium" style={{ color: NAVY }}>—</span>
      )}
    </div>
  );
}
