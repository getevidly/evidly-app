import { useState } from 'react';
import { CheckCircle2, Crown, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { EvidlyIcon } from './ui/EvidlyIcon';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { PLANS, createCheckoutSession, createPortalSession, type Plan } from '../lib/stripe';
import { useRiskFreeEligibility } from '../hooks/api/useRiskFreeEligibility';
import { RiskFreeStatusModal } from './RiskFreeStatusModal';

export function BillingPanel() {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showRiskFreeModal, setShowRiskFreeModal] = useState(false);
  const { data: riskFreeEligibility } = useRiskFreeEligibility();

  // Read current plan from profile — no 'free' or 'trial' state exists
  const currentPlan = (profile as any)?.plan || 'founder_single';
  const isSubscribed = currentPlan !== 'free' && currentPlan !== 'none';

  const handleSubscribe = async (plan: Plan) => {
    if (isDemoMode) {
      toast.info('Stripe checkout available in production');
      return;
    }

    if (!plan.priceId) {
      toast.info('Contact sales@getevidly.com for Enterprise pricing');
      return;
    }

    setLoading(plan.id);
    try {
      const { url } = await createCheckoutSession(plan.priceId, plan.id);
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Failed to start checkout. Please try again');
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (isDemoMode) {
      toast.info('Billing portal available in production');
      return;
    }

    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Portal error:', err);
      toast.error('Failed to open billing portal. Please try again');
    } finally {
      setPortalLoading(false);
    }
  };

  const getButtonLabel = (plan: Plan) => {
    if (plan.id === currentPlan) return 'Current Plan';
    if (plan.id === 'enterprise') return 'Contact Sales';
    return 'Subscribe';
  };

  const isCurrentPlan = (plan: Plan) => plan.id === currentPlan;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[#1E2D4D]">Billing & Subscription</h3>
        <p className="text-sm text-[#1E2D4D]/70 mt-1">
          Manage your subscription plan and billing details.
        </p>
      </div>

      {/* Current plan banner */}
      <div className="bg-gradient-to-r from-[#1E2D4D] to-[#2c5f7f] rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/50">Current Plan</p>
            <h4 className="text-lg font-semibold tracking-tight mt-0.5">
              {isSubscribed
                ? (PLANS.find((p) => p.id === currentPlan)?.name || 'Founder') + ' — Rate Locked'
                : 'No Active Subscription'}
            </h4>
            {isSubscribed && (
              <p className="text-xs text-white/60 mt-1">Founder pricing locked for 36 months from your signup date</p>
            )}
          </div>
          {isSubscribed && (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage Subscription
            </button>
          )}
        </div>
      </div>

      {/* Risk-Free Guarantee Info */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
        <div className="flex items-start gap-3">
          <EvidlyIcon size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm" style={{ color: '#1E2D4D' }}>45-Day Money-Back Guarantee</p>
            <p className="text-xs mt-0.5" style={{ color: '#3a6d8a' }}>
              Try EvidLY for 45 days. If it doesn't deliver, get a full refund of your subscription fees — no questions asked.
            </p>
            {riskFreeEligibility && (
              <button
                type="button"
                onClick={() => setShowRiskFreeModal(true)}
                className="mt-2 text-xs font-semibold hover:underline transition-colors"
                style={{ color: '#1E2D4D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Check My Risk-Free Status &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation forfeiture warning */}
      {isSubscribed && (
        <div className="rounded-xl p-4 border border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-amber-900">Founder Pricing Forfeiture</p>
              <p className="text-xs mt-0.5 text-amber-800">
                Canceling your subscription permanently forfeits your locked Founder rate. Re-subscribing after cancellation will be at the then-current Standard pricing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = isCurrentPlan(plan);
          const isPopular = plan.id === 'founder_single';
          const isEnterprise = plan.id === 'enterprise';
          const isLoading = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-5 transition-all ${
                isCurrent
                  ? 'border-[#1E2D4D] bg-[#eef4f8]'
                  : 'border-[#1E2D4D]/10 bg-white hover:border-[#1E2D4D]/15'
              }`}
            >
              {/* Most Popular badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#A08C5A] text-white shadow-sm">
                    <Crown className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className={isPopular ? 'mt-2' : ''}>
                <h4 className="text-lg font-bold text-[#1E2D4D]">{plan.name}</h4>
                <p className="text-xs text-[#1E2D4D]/50">{plan.subtitle}</p>
                <div className="mt-2 mb-4">
                  <span className="text-2xl font-bold tracking-tight text-[#1E2D4D]">{plan.priceLabel}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[#1E2D4D]/80">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action button */}
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrent || isLoading}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-[#1E2D4D]/5 text-[#1E2D4D]/50 cursor-default'
                      : isEnterprise
                        ? 'border-2 border-[#1E2D4D] text-[#1E2D4D] hover:bg-[#1E2D4D] hover:text-white'
                        : 'bg-[#1E2D4D] text-white hover:bg-[#162340]'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {getButtonLabel(plan)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manage billing link for active subscribers */}
      {isSubscribed && (
        <div className="border border-[#1E2D4D]/10 rounded-xl p-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-[#1E2D4D]">Need to update payment method or cancel?</h4>
            <p className="text-xs text-[#1E2D4D]/50 mt-0.5">
              Manage invoices, payment methods, and cancellation through the Stripe billing portal. Cancellation takes effect at the end of your current billing cycle.
            </p>
          </div>
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="px-4 py-2 text-sm font-medium text-[#1E2D4D] hover:text-[#141E33] hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Open Billing Portal
          </button>
        </div>
      )}

      <RiskFreeStatusModal
        isOpen={showRiskFreeModal}
        onClose={() => setShowRiskFreeModal(false)}
        eligibility={riskFreeEligibility}
      />
    </div>
  );
}
