import { useState } from 'react';
import { CreditCard, Download, AlertTriangle, Users, Building2, HardDrive, FileText } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../contexts/RoleContext';
import { useBillingInfo, useInvoices, type PlanTier } from '../../hooks/api/useSettings';
import Button from '../../components/ui/Button';

const PLAN_INFO: Record<PlanTier, { name: string; price: string; perLocation: string; features: string[] }> = {
  founder: {
    name: 'Founder',
    price: '$99/mo',
    perLocation: '+ $49/mo per additional location (up to 9)',
    features: ['All compliance features', 'Unlimited staff', 'AI insights', 'Price locked for life'],
  },
  standard: {
    name: 'Standard',
    price: '$299/mo',
    perLocation: '+ $149/mo per additional location (up to 9)',
    features: ['All compliance features', 'Unlimited staff', 'AI insights', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    perLocation: '10+ locations',
    features: ['All compliance features', 'Custom integrations', 'Dedicated support', 'API access', 'SSO / SAML'],
  },
};

export function BillingPage() {
  const { userRole } = useRole();
  const { data: billing, isLoading: billingLoading } = useBillingInfo();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (userRole !== 'owner_operator' && userRole !== 'platform_admin') {
    return <Navigate to="/settings/company" replace />;
  }

  const isLoading = billingLoading || invoicesLoading;

  if (isLoading) {
    return (
      <div className="space-y-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-navy/10 rounded-xl p-6 animate-pulse">
            <div className="bg-navy/5 rounded-lg h-5 w-44 mb-4" />
            <div className="bg-navy/5 rounded-lg h-3.5 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const plan = billing ? PLAN_INFO[billing.planTier] : null;

  return (
    <div className="space-y-5">
      {/* Current Plan */}
      <div className="bg-white border border-navy/10 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-navy mb-4">
          <CreditCard className="h-[18px] w-[18px] text-navy" /> Current Plan
        </h2>
        {plan && billing ? (
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-extrabold text-navy">{plan.name}</span>
              <span className="text-base text-navy/50">{plan.price}</span>
            </div>
            <p className="text-xs text-navy/40 mb-4">{plan.perLocation}</p>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-1.5 mb-4">
              {plan.features.map(f => (
                <li key={f} className="text-[13px] text-navy/60 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
            <Button variant="secondary" size="sm">Change Plan</Button>
          </div>
        ) : (
          <div className="bg-navy/[0.03] border border-dashed border-navy/15 rounded-xl py-8 px-5 text-center">
            <CreditCard className="h-8 w-8 text-navy/20 mx-auto mb-2" />
            <p className="text-sm text-navy/50 mb-3">No billing information available.</p>
            <Button variant="primary" size="sm">Set Up Billing</Button>
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="bg-white border border-navy/10 rounded-xl p-6">
        <h2 className="text-base font-bold text-navy mb-4">Usage</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3.5">
          {[
            { icon: Users, label: 'Active Staff', current: billing?.usage.employees.current ?? 0, limit: billing?.usage.employees.limit ?? 0 },
            { icon: Building2, label: 'Locations', current: billing?.usage.jobs.current ?? 0, limit: billing?.usage.jobs.limit ?? 0 },
            { icon: HardDrive, label: 'Storage Used', current: billing?.usage.storageGb.current ?? 0, limit: billing?.usage.storageGb.limit ?? 0, suffix: 'GB' },
          ].map(item => (
            <div key={item.label} className="bg-navy/[0.03] rounded-xl p-4 text-center">
              <item.icon className="h-5 w-5 text-navy mx-auto mb-1.5" />
              <div className="text-xl font-extrabold text-navy">
                {item.current}{item.suffix ? ` ${item.suffix}` : ''}
              </div>
              <div className="text-xs text-navy/40 mt-0.5">
                {item.limit > 0 ? `of ${item.limit}${item.suffix ? ` ${item.suffix}` : ''} included` : item.label}
              </div>
              <div className="text-xs text-navy/30 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white border border-navy/10 rounded-xl p-6">
        <h2 className="text-base font-bold text-navy mb-4">Payment Method</h2>
        {billing?.paymentMethod ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-navy/40" />
              <div>
                <span className="text-sm font-semibold text-navy">
                  •••• •••• •••• {billing.paymentMethod.last4}
                </span>
                <div className="text-xs text-navy/40">
                  Expires {billing.paymentMethod.expiresAt}
                </div>
              </div>
            </div>
            <Button variant="secondary" size="sm">Update</Button>
          </div>
        ) : (
          <div className="text-center py-5">
            <p className="text-[13px] text-navy/50 mb-2.5">No payment method on file.</p>
            <Button variant="primary" size="sm">Add Payment Method</Button>
          </div>
        )}
      </div>

      {/* Billing History */}
      <div className="bg-white border border-navy/10 rounded-xl p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-navy mb-4">
          <FileText className="h-[18px] w-[18px] text-navy" /> Billing History
        </h2>
        {invoices && invoices.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-navy/10">
            <table className="w-full text-[13px]">
              <thead className="bg-cream border-b border-navy/10">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-navy/40">Date</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-navy/40">Amount</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-navy/40">Status</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-navy/40">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-cream transition-colors">
                    <td className="px-4 py-3 text-navy">{inv.date}</td>
                    <td className="px-4 py-3 text-right font-semibold text-navy">
                      ${inv.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        inv.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : inv.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                      }`}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        className="p-1 text-navy/40 hover:text-navy transition-colors"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6">
            <FileText className="h-7 w-7 text-navy/20 mx-auto mb-2" />
            <p className="text-[13px] text-navy/50">No invoices yet.</p>
          </div>
        )}
      </div>

      {/* Cancel Subscription */}
      <div className="mt-8 pt-5 border-t border-navy/10">
        {showCancelConfirm ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900 mb-2">
                Are you sure you want to cancel your subscription?
              </p>
              <p className="text-[13px] text-red-800 mb-3">
                You will lose access to all features at the end of your current billing period.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setShowCancelConfirm(false); }}
                >
                  Yes, Cancel
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Keep Subscription
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="text-[13px] font-semibold text-red-600 hover:text-red-700 underline transition-colors"
          >
            Cancel Subscription
          </button>
        )}
      </div>
    </div>
  );
}
