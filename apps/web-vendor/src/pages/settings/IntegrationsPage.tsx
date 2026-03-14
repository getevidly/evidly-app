import { useState } from 'react';
import { ArrowLeft, Plug, BookOpen, CreditCard, MessageSquare, Mail, Users, Shield, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIntegrations } from '../../hooks/api/useSettings';
import { IntegrationDetailModal, type IntegrationCardDef } from '../../components/settings/IntegrationDetailModal';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, TEXT_TERTIARY, NAVY, FONT,
} from '@shared/components/dashboard/shared/constants';

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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: TEXT_TERTIARY,
          fontSize: 13,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={16} /> Back to Settings
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 700, color: BODY_TEXT, margin: '0 0 4px' }}>
          <Plug size={22} color={NAVY} /> Integrations
        </h1>
        <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>
          Connect HoodOps with your favorite tools and services.
        </p>
      </div>

      {/* Integration grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {INTEGRATION_DEFS.map(def => {
          const connected = getConnectionStatus(def.slug);
          return (
            <div
              key={def.slug}
              onClick={() => setSelectedIntegration({ ...def, connected })}
              style={{
                background: CARD_BG,
                border: `1px solid ${connected ? '#bbf7d0' : CARD_BORDER}`,
                borderRadius: 12,
                boxShadow: CARD_SHADOW,
                padding: 20,
                cursor: 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = NAVY;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 8px rgba(30,77,107,0.12)`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = connected ? '#bbf7d0' : CARD_BORDER;
                (e.currentTarget as HTMLDivElement).style.boxShadow = CARD_SHADOW;
              }}
            >
              {/* Top: icon + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: PANEL_BG,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <def.icon size={22} color={NAVY} />
                </div>
                {connected ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 10, background: '#f0fdf4' }}>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>Connected</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_TERTIARY, padding: '3px 10px', borderRadius: 10, background: PANEL_BG }}>
                    Not Connected
                  </span>
                )}
              </div>

              {/* Name + category */}
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: BODY_TEXT }}>{def.name}</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: TEXT_TERTIARY, fontWeight: 600 }}>{def.category}</span>
              </div>

              {/* Description */}
              <p style={{ color: MUTED, fontSize: 13, margin: '0 0 14px', lineHeight: 1.5 }}>
                {def.description}
              </p>

              {/* Action */}
              <button
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: `1px solid ${connected ? CARD_BORDER : NAVY}`,
                  background: connected ? '#fff' : NAVY,
                  color: connected ? BODY_TEXT : '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
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
