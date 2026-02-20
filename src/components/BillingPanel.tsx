import { useState } from 'react';
import { CheckCircle2, Crown, ExternalLink, Loader2, Gift, Clock } from 'lucide-react';
import { EvidlyIcon } from './ui/EvidlyIcon';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { PLANS, createCheckoutSession, createPortalSession, type Plan } from '../lib/stripe';

export function BillingPanel() {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Read current plan from profile or default to 'free'
  const currentPlan = (profile as any)?.plan || 'free';

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
      const { url } = await createCheckoutSession(plan.priceId);
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

  // Demo trial state — simulates a user on day 12 of their 30-day trial
  const demoTrialActive = isDemoMode;
  const demoTrialDaysLeft = 18;
  const demoGuaranteeDaysLeft = 33;
  const demoTrialEndDate = new Date(Date.now() + demoTrialDaysLeft * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getButtonLabel = (plan: Plan) => {
    if (plan.id === currentPlan) return 'Current Plan';
    if (plan.id === 'enterprise') return 'Contact Sales';
    return 'Start Free Trial';
  };

  const isCurrentPlan = (plan: Plan) => plan.id === currentPlan;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900">Billing & Subscription</h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage your subscription plan and billing details.
        </p>
      </div>

      {/* Current plan banner */}
      <div className="bg-gradient-to-r from-[#1e4d6b] to-[#2c5f7f] rounded-lg p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-200">Current Plan</p>
            <h4 className="text-lg font-semibold mt-0.5">
              {currentPlan === 'free'
                ? 'Free Trial'
                : PLANS.find((p) => p.id === currentPlan)?.name || currentPlan}
            </h4>
          </div>
          {currentPlan !== 'free' && (
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

      {/* Trial Status Banner */}
      {demoTrialActive && (
        <div className="rounded-lg border-2 border-[#16a34a] bg-[#f0fdf4] p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#16a34a] flex items-center justify-center flex-shrink-0">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-[#166534]">Free Trial Active</h4>
              <p className="text-sm text-[#166534] mt-1">
                You have <strong>{demoTrialDaysLeft} days remaining</strong> in your free trial (ends {demoTrialEndDate}).
                Full access to all features — no charge until your trial ends.
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-sm text-[#166534]">
                  <Clock className="h-4 w-4" />
                  <span>{demoTrialDaysLeft} days left in trial</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[#166534]">
                  <EvidlyIcon size={16} />
                  <span>{demoGuaranteeDaysLeft} days left on money-back guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 45-Day Guarantee Info */}
      <div className="rounded-lg p-4" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
        <div className="flex items-center gap-3">
          <EvidlyIcon size={20} className="flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm" style={{ color: '#1e4d6b' }}>45-Day Money-Back Guarantee</p>
            <p className="text-xs mt-0.5" style={{ color: '#3a6d8a' }}>
              Not satisfied within 45 days of your first payment? Get a full refund — no questions asked.
            </p>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = isCurrentPlan(plan);
          const isPopular = plan.id === 'founder';
          const isEnterprise = plan.id === 'enterprise';
          const isLoading = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border-2 p-5 transition-all ${
                isCurrent
                  ? 'border-[#1e4d6b] bg-[#eef4f8]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Most Popular badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#d4af37] text-white shadow-sm">
                    <Crown className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className={isPopular ? 'mt-2' : ''}>
                <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                <div className="mt-2 mb-4">
                  <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
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
                      ? 'bg-gray-100 text-gray-500 cursor-default'
                      : isEnterprise
                        ? 'border-2 border-[#1e4d6b] text-[#1e4d6b] hover:bg-[#1e4d6b] hover:text-white'
                        : 'bg-[#1e4d6b] text-white hover:bg-[#163a52]'
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
      {currentPlan !== 'free' && (
        <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Need to update payment method or cancel?</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage invoices, payment methods, and cancellation through the Stripe billing portal.
            </p>
          </div>
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="px-4 py-2 text-sm font-medium text-[#1e4d6b] hover:text-[#163a52] hover:underline flex items-center gap-1 disabled:opacity-50"
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
    </div>
  );
}
