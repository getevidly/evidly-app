import { useState } from 'react';
import { CreditCard, Download, AlertTriangle, Users, Briefcase, HardDrive, FileText, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import { useBillingInfo, useInvoices, type PlanTier } from '../../hooks/api/useSettings';
import {
  CARD_BG, CARD_BORDER, CARD_SHADOW, PANEL_BG, BODY_TEXT, MUTED, TEXT_TERTIARY, NAVY, FONT,
} from '../../components/dashboard/shared/constants';

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 12,
  boxShadow: CARD_SHADOW,
  padding: 24,
  marginBottom: 20,
};

const PLAN_FEATURES: Record<PlanTier, { name: string; price: number; features: string[] }> = {
  starter: {
    name: 'Starter',
    price: 49,
    features: ['Up to 5 employees', 'Basic reporting', 'Email support', '1 GB storage'],
  },
  professional: {
    name: 'Professional',
    price: 149,
    features: ['Up to 25 employees', 'Advanced reporting', 'Priority support', '10 GB storage', 'Integrations'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 399,
    features: ['Unlimited employees', 'Custom reporting', 'Dedicated support', 'Unlimited storage', 'All integrations', 'API access'],
  },
};

export function BillingPage() {
  const { userRole } = useRole();
  const { data: billing, isLoading: billingLoading } = useBillingInfo();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Owner-only guard
  if (userRole !== 'owner_operator' && userRole !== 'platform_admin') {
    return <Navigate to="/settings/company" replace />;
  }

  const isLoading = billingLoading || invoicesLoading;

  if (isLoading) {
    return (
      <div style={{ ...FONT }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ ...cardStyle, height: 140 }}>
            <div style={{ background: PANEL_BG, borderRadius: 8, height: 20, width: 180, marginBottom: 16 }} />
            <div style={{ background: PANEL_BG, borderRadius: 8, height: 14, width: '50%' }} />
          </div>
        ))}
      </div>
    );
  }

  const plan = billing ? PLAN_FEATURES[billing.planTier] : null;

  return (
    <div style={{ ...FONT }}>
      {/* Current Plan */}
      <div style={cardStyle}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: '0 0 16px' }}>
          <CreditCard size={18} color={NAVY} /> Current Plan
        </h2>
        {plan && billing ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: BODY_TEXT }}>{plan.name}</span>
              <span style={{ fontSize: 16, color: MUTED }}>${plan.price}/month</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
              {plan.features.map(f => (
                <li key={f} style={{ fontSize: 13, color: MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => alert('Plan change coming soon')}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: `1px solid ${CARD_BORDER}`,
                background: '#fff',
                color: NAVY,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Change Plan
            </button>
          </div>
        ) : (
          <div style={{
            background: PANEL_BG,
            border: `1px dashed ${CARD_BORDER}`,
            borderRadius: 10,
            padding: '32px 20px',
            textAlign: 'center',
          }}>
            <CreditCard size={32} style={{ color: TEXT_TERTIARY, margin: '0 auto 8px' }} />
            <p style={{ color: MUTED, fontSize: 14, margin: '0 0 12px' }}>
              No billing information available.
            </p>
            <button
              onClick={() => alert('Contact support to set up billing')}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                background: NAVY,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Set Up Billing
            </button>
          </div>
        )}
      </div>

      {/* Usage */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: '0 0 16px' }}>Usage</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {[
            { icon: Users, label: 'Active Employees', current: billing?.usage.employees.current ?? 0, limit: billing?.usage.employees.limit ?? 0 },
            { icon: Briefcase, label: 'Jobs This Month', current: billing?.usage.jobs.current ?? 0, limit: billing?.usage.jobs.limit ?? 0 },
            { icon: HardDrive, label: 'Storage Used', current: billing?.usage.storageGb.current ?? 0, limit: billing?.usage.storageGb.limit ?? 0, suffix: 'GB' },
          ].map(item => (
            <div
              key={item.label}
              style={{
                background: PANEL_BG,
                borderRadius: 10,
                padding: 16,
                textAlign: 'center',
              }}
            >
              <item.icon size={20} style={{ color: NAVY, marginBottom: 6 }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: BODY_TEXT }}>
                {item.current}{item.suffix ? ` ${item.suffix}` : ''}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                {item.limit > 0 ? `of ${item.limit}${item.suffix ? ` ${item.suffix}` : ''} included` : item.label}
              </div>
              <div style={{ fontSize: 12, color: TEXT_TERTIARY, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: '0 0 16px' }}>Payment Method</h2>
        {billing?.paymentMethod ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CreditCard size={24} color={MUTED} />
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: BODY_TEXT }}>
                  •••• •••• •••• {billing.paymentMethod.last4}
                </span>
                <div style={{ fontSize: 12, color: MUTED }}>
                  Expires {billing.paymentMethod.expiresAt}
                </div>
              </div>
            </div>
            <button
              onClick={() => alert('Update payment method coming soon')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: `1px solid ${CARD_BORDER}`,
                background: '#fff',
                color: BODY_TEXT,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Update
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: MUTED, fontSize: 13, margin: '0 0 10px' }}>No payment method on file.</p>
            <button
              onClick={() => alert('Add payment method coming soon')}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                background: NAVY,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add Payment Method
            </button>
          </div>
        )}
      </div>

      {/* Billing History */}
      <div style={cardStyle}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: BODY_TEXT, margin: '0 0 16px' }}>
          <FileText size={18} color={NAVY} /> Billing History
        </h2>
        {invoices && invoices.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: PANEL_BG, borderBottom: `2px solid ${CARD_BORDER}` }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Amount</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: BODY_TEXT }}>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
                    <td style={{ padding: '10px 14px', color: BODY_TEXT }}>{inv.date}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: BODY_TEXT }}>
                      ${inv.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        background: inv.status === 'paid' ? '#dcfce7' : inv.status === 'pending' ? '#fef9c3' : '#fef2f2',
                        color: inv.status === 'paid' ? '#15803d' : inv.status === 'pending' ? '#a16207' : '#dc2626',
                      }}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => alert('Download invoice PDF')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        title="Download PDF"
                      >
                        <Download size={16} color={NAVY} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <FileText size={28} style={{ color: TEXT_TERTIARY, margin: '0 auto 8px' }} />
            <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>No invoices yet.</p>
          </div>
        )}
      </div>

      {/* Cancel Subscription */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${CARD_BORDER}` }}>
        {showCancelConfirm ? (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#991b1b', margin: '0 0 8px' }}>
                Are you sure you want to cancel your subscription?
              </p>
              <p style={{ fontSize: 13, color: '#991b1b', margin: '0 0 12px' }}>
                You will lose access to all features at the end of your current billing period.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { alert('Subscription cancelled (demo)'); setShowCancelConfirm(false); }}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Yes, Cancel
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${CARD_BORDER}`, background: '#fff', color: BODY_TEXT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCancelConfirm(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            Cancel Subscription
          </button>
        )}
      </div>
    </div>
  );
}
