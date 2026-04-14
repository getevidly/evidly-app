import { useState } from 'react';
import { ArrowLeft, Plug, BookOpen, CreditCard, MessageSquare, Mail, Users, Shield, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIntegrations } from '../../hooks/api/useSettings';
import { IntegrationDetailModal, type IntegrationCardDef } from '../../components/settings/IntegrationDetailModal';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, TEXT_TERTIARY, NAVY, FONT,
} from '../../components/dashboard/shared/constants';

const INTEGRATION_DEFS: Omit<IntegrationCardDef, 'connected'>[] = [
  {
    slug: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Sync invoices, expenses, and payroll data with your accounting system.',
    category: 'Accounting',
    icon: BookOpen,
  },
  {
    slug: 'stripe',
    name: 'Stripe',
    description: 'Accept payments, manage subscriptions, and process invoices.',
    category: 'Payments',
    icon: CreditCard,
  },
  {
    slug: 'twilio',
    name: 'Twilio',
    description: 'Send SMS notifications, alerts, and appointment reminders.',
    category: 'Communication',
    icon: MessageSquare,
  },
  {
    slug: 'sendgrid',
    name: 'SendGrid',
    description: 'Send transactional and marketing emails to your team and customers.',
    category: 'Communication',
    icon: Mail,
  },
  {
    slug: 'hubspot',
    name: 'HubSpot',
    description: 'Sync leads, contacts, and deals with your CRM pipeline.',
    category: 'CRM',
    icon: Users,
  },
  {
    slug: 'evidly',
    name: 'EvidLY',
    description: 'Connect compliance data, inspection results, and certification tracking.',
    category: 'Compliance',
    icon: Shield,
  },
];

export function IntegrationsPage() {
  const navigate = useNavigate();
  const { data: serverIntegrations } = useIntegrations();

  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationCardDef | null>(null);

  const getConnectionStatus = (slug: string): boolean => {
    if (!serverIntegrations) return false;
    const found = serverIntegrations.find(i => i.slug === slug);
    return found?.status === 'connected';
  };

  return (
    <div style={{ ...FONT }}>
      {/* Back link */}
      <button
        onClick={() => navigate('/settings/company')}
        className="flex items-center gap-1.5 bg-none border-none text-slate_ui text-[13px] cursor-pointer p-0 mb-4"
      >
        <ArrowLeft size={16} /> Back to Settings
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2.5 text-[22px] font-bold text-navy-deeper mb-1 mt-0">
          <Plug size={22} color={NAVY} /> Integrations
        </h1>
        <p className="text-navy-mid text-sm m-0">
          Connect HoodOps with your favorite tools and services.
        </p>
      </div>

      {/* Integration grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
        {INTEGRATION_DEFS.map(def => {
          const connected = getConnectionStatus(def.slug);
          return (
            <div
              key={def.slug}
              onClick={() => setSelectedIntegration({ ...def, connected })}
              className={`bg-white rounded-xl shadow-[0_1px_3px_rgba(11,22,40,.06),0_1px_2px_rgba(11,22,40,.04)] p-5 cursor-pointer transition-[border-color,box-shadow] duration-150 border ${connected ? 'border-green-200' : 'border-border_ui-cool'} hover:border-navy-muted hover:shadow-[0_2px_8px_rgba(30,77,107,0.12)]`}
            >
              {/* Top: icon + status */}
              <div className="flex justify-between items-start mb-3.5">
                <div className="w-11 h-11 rounded-[10px] bg-[#EEF1F7] flex items-center justify-center">
                  <def.icon size={22} color={NAVY} />
                </div>
                {connected ? (
                  <div className="flex items-center gap-1 px-2.5 py-[3px] rounded-[10px] bg-green-50">
                    <CheckCircle2 size={14} color="#16a34a" />
                    <span className="text-[11px] font-bold text-green-700">Connected</span>
                  </div>
                ) : (
                  <span className="text-[11px] font-semibold text-slate_ui px-2.5 py-[3px] rounded-[10px] bg-[#EEF1F7]">
                    Not Connected
                  </span>
                )}
              </div>

              {/* Name + category */}
              <div className="mb-1.5">
                <span className="text-[15px] font-bold text-navy-deeper">{def.name}</span>
                <span className="ml-2 text-[11px] text-slate_ui font-semibold">{def.category}</span>
              </div>

              {/* Description */}
              <p className="text-navy-mid text-[13px] mt-0 mb-3.5 leading-normal">
                {def.description}
              </p>

              {/* Action */}
              <button
                className={`py-1.5 px-3.5 rounded-md text-[13px] font-semibold cursor-pointer ${connected ? 'border border-border_ui-cool bg-white text-navy-deeper' : 'border border-navy-muted bg-navy-muted text-white'}`}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedIntegration({ ...def, connected });
                }}
              >
                {connected ? 'Configure' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>

      <IntegrationDetailModal
        isOpen={!!selectedIntegration}
        onClose={() => setSelectedIntegration(null)}
        integration={selectedIntegration}
      />
    </div>
  );
}
