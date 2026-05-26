import { useState, useEffect } from 'react';
import {
  CreditCard, ExternalLink, Loader2, AlertTriangle, Lock,
  MapPin, Plus, Crown, TrendingUp, CheckCircle2, Clock,
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useRole } from '../../contexts/RoleContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDemo } from '../../contexts/DemoContext';
import { useLocations } from '../../hooks/api/useLocations';
import { useRiskFreeEligibility } from '../../hooks/api/useRiskFreeEligibility';
import { RiskFreeStatusModal } from '../../components/RiskFreeStatusModal';
import { EvidlyIcon } from '../../components/ui/EvidlyIcon';
import { PLANS, createCheckoutSession, createPortalSession } from '../../lib/stripe';
import { supabase } from '../../lib/supabase';
import { colors, typography } from '../../lib/designSystem';

type OrgPlanTier = 'trial' | 'essentials' | 'founder' | 'standard' | 'enterprise';

interface PricingConfig {
  essentials_monthly: number;
  essentials_annual: number;
  essentials_additional_monthly: number;
  essentials_additional_annual: number;
  founder_monthly: number;
  founder_annual: number;
  founder_additional_monthly: number;
  founder_additional_annual: number;
  standard_monthly: number;
  standard_annual: number;
  standard_additional_monthly: number;
  standard_additional_annual: number;
  trial_days: number;
  founder_lock_months: number;
  founder_seats_max: number;
}

const DEFAULT_PRICING: PricingConfig = {
  essentials_monthly: 69, essentials_annual: 690,
  essentials_additional_monthly: 39, essentials_additional_annual: 390,
  founder_monthly: 99, founder_annual: 1188,
  founder_additional_monthly: 49, founder_additional_annual: 588,
  standard_monthly: 199, standard_annual: 1990,
  standard_additional_monthly: 99, standard_additional_annual: 990,
  trial_days: 30, founder_lock_months: 36, founder_seats_max: 250,
};

interface OrgBillingData {
  planTier: OrgPlanTier;
  founderLockExpiresAt: string | null;
  billingCadence: 'monthly' | 'annual';
  seatsTaken: number;
  seatsMax: number;
  founderSeatNumber: number | null;
}

export function BillingPage() {
  const { userRole } = useRole();
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();
  const { data: locations } = useLocations();
  const { data: riskFreeEligibility } = useRiskFreeEligibility();

  const [billingData, setBillingData] = useState<OrgBillingData | null>(null);
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [cadence, setCadence] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showRiskFreeModal, setShowRiskFreeModal] = useState(false);

  const organizationId = profile?.organization_id ?? null;
  const locationCount = (locations ?? []).length;

  // Mark billing as seen for NEW badge dismissal
  useEffect(() => {
    try { localStorage.setItem('admin_billing_seen', '1'); } catch {}
  }, []);

  // Fetch org billing data + seat counts + pricing config
  useEffect(() => {
    if (!organizationId) { setLoading(false); return; }

    (async () => {
      const [orgRes, takenRes, maxRes, pricingRes] = await Promise.all([
        supabase.from('organizations').select('plan_tier, founder_locked_at, founder_lock_expires_at, billing_cadence, created_at').eq('id', organizationId).maybeSingle(),
        supabase.rpc('fn_founder_seats_taken'),
        supabase.rpc('fn_founder_seats_max'),
        supabase.from('pricing_config').select('*').eq('id', 1).maybeSingle(),
      ]);

      // Retry org query without billing_cadence if column doesn't exist yet
      let org = orgRes.data;
      if (!org && orgRes.error) {
        const retry = await supabase.from('organizations')
          .select('plan_tier, founder_locked_at, founder_lock_expires_at, created_at')
          .eq('id', organizationId).maybeSingle();
        org = retry.data;
      }

      const tier = (org?.plan_tier || 'trial') as OrgPlanTier;
      const seatsTaken = (takenRes.data as number) || 0;
      const seatsMax = (maxRes.data as number) || 250;
      const orgCadence = ((org as any)?.billing_cadence || 'monthly') as 'monthly' | 'annual';

      // Load pricing config if available
      if (pricingRes.data) {
        const raw = pricingRes.data as any;
        setPricing({
          essentials_monthly: Number(raw.essentials_monthly) || DEFAULT_PRICING.essentials_monthly,
          essentials_annual: Number(raw.essentials_annual) || DEFAULT_PRICING.essentials_annual,
          essentials_additional_monthly: Number(raw.essentials_additional_monthly) || DEFAULT_PRICING.essentials_additional_monthly,
          essentials_additional_annual: Number(raw.essentials_additional_annual) || DEFAULT_PRICING.essentials_additional_annual,
          founder_monthly: Number(raw.founder_monthly) || DEFAULT_PRICING.founder_monthly,
          founder_annual: Number(raw.founder_annual) || DEFAULT_PRICING.founder_annual,
          founder_additional_monthly: Number(raw.founder_additional_monthly) || DEFAULT_PRICING.founder_additional_monthly,
          founder_additional_annual: Number(raw.founder_additional_annual) || DEFAULT_PRICING.founder_additional_annual,
          standard_monthly: Number(raw.standard_monthly) || DEFAULT_PRICING.standard_monthly,
          standard_annual: Number(raw.standard_annual) || DEFAULT_PRICING.standard_annual,
          standard_additional_monthly: Number(raw.standard_additional_monthly) || DEFAULT_PRICING.standard_additional_monthly,
          standard_additional_annual: Number(raw.standard_additional_annual) || DEFAULT_PRICING.standard_additional_annual,
          trial_days: Number(raw.trial_days) || DEFAULT_PRICING.trial_days,
          founder_lock_months: Number(raw.founder_lock_months) || DEFAULT_PRICING.founder_lock_months,
          founder_seats_max: Number(raw.founder_seats_max) || DEFAULT_PRICING.founder_seats_max,
        });
      }
      setCadence(orgCadence);

      // Determine seat number for founder orgs
      let founderSeatNumber: number | null = null;
      if (tier === 'founder' || org?.founder_locked_at) {
        const { count } = await supabase
          .from('organizations')
          .select('id', { count: 'exact', head: true })
          .eq('plan_tier', 'founder')
          .lte('created_at', org?.created_at || new Date().toISOString());
        founderSeatNumber = count ?? seatsTaken;
      }

      setBillingData({
        planTier: tier,
        founderLockExpiresAt: org?.founder_lock_expires_at || null,
        billingCadence: orgCadence,
        seatsTaken,
        seatsMax,
        founderSeatNumber,
      });
      setLoading(false);
    })();
  }, [organizationId]);

  if (userRole !== 'owner_operator' && userRole !== 'platform_admin') {
    return <Navigate to="/settings/company" replace />;
  }

  if (loading || !billingData) {
    return (
      <div className="space-y-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border rounded-xl p-6 animate-pulse" style={{ borderColor: colors.border }}>
            <div className="rounded-lg h-5 w-44 mb-4" style={{ backgroundColor: colors.cream }} />
            <div className="rounded-lg h-3.5 w-1/2" style={{ backgroundColor: colors.cream }} />
          </div>
        ))}
      </div>
    );
  }

  const { planTier, founderLockExpiresAt, seatsTaken, seatsMax, founderSeatNumber } = billingData;

  const founderExpiryLabel = founderLockExpiresAt
    ? new Date(founderLockExpiresAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  // Determine which view to render — Founder and Standard are distinct tier names
  const isFounderView = planTier === 'founder';
  const isPostWindowView = planTier === 'standard';
  const isEssentialsView = planTier === 'essentials';
  const isTrialView = planTier === 'trial';
  const isEnterpriseView = planTier === 'enterprise';
  const founderWindowOpen = seatsTaken < seatsMax;

  const handleCheckout = async (priceId: string, planId: string) => {
    if (isDemoMode) { toast.info('Stripe checkout available in production'); return; }
    if (!priceId) { toast.info('Contact sales@getevidly.com for Enterprise pricing'); return; }
    setCheckoutLoading(planId);
    try {
      const { url } = await createCheckoutSession(priceId, planId);
      if (url) window.location.href = url;
    } catch { toast.error('Failed to start checkout. Please try again'); }
    finally { setCheckoutLoading(null); }
  };

  const handlePortal = async () => {
    if (isDemoMode) { toast.info('Billing portal available in production'); return; }
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      if (url) window.location.href = url;
    } catch { toast.error('Failed to open billing portal. Please try again'); }
    finally { setPortalLoading(false); }
  };

  // Cadence change for paid subscribers: update display + prompt to confirm via Stripe portal
  const handleCadenceChange = (newCadence: 'monthly' | 'annual') => {
    setCadence(newCadence);
    if (!isTrialView) {
      toast('To change billing cadence, update your subscription in the billing portal.', {
        action: { label: 'Open Portal', onClick: handlePortal },
      });
    }
  };

  const spotsRemaining = Math.max(0, seatsMax - seatsTaken);
  const isMonthly = cadence === 'monthly';

  // Price helpers keyed on cadence
  const founderBase = isMonthly ? pricing.founder_monthly : pricing.founder_annual;
  const founderAddl = isMonthly ? pricing.founder_additional_monthly : pricing.founder_additional_annual;
  const essentialsBase = isMonthly ? pricing.essentials_monthly : pricing.essentials_annual;
  const essentialsAddl = isMonthly ? pricing.essentials_additional_monthly : pricing.essentials_additional_annual;
  const standardBase = isMonthly ? pricing.standard_monthly : pricing.standard_annual;
  const standardAddl = isMonthly ? pricing.standard_additional_monthly : pricing.standard_additional_annual;
  const cadenceSuffix = isMonthly ? '/mo' : '/yr';

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: colors.navy, fontFamily: typography.family.body }}>
          Billing &amp; Subscription
        </h1>
        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
          Manage your plan, locations, and payment details.
        </p>
      </div>

      {/* ─── FOUNDER VIEW ──────────────────────────────────────── */}
      {isFounderView && (
        <>
          {/* Plan card */}
          <div className="rounded-xl p-5" style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, #2c5f7f 100%)` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Current Plan</p>
                <h3 className="text-lg font-bold mt-0.5" style={{ color: colors.white }}>Founder</h3>
                {founderExpiryLabel && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded text-[10px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: 'rgba(160,140,90,0.3)', color: '#D4C88A' }}>
                    <Lock className="h-2.5 w-2.5" /> Founder Locked <span style={{ textTransform: 'none' }}>through {founderExpiryLabel}</span>
                  </span>
                )}
                {founderSeatNumber != null && founderSeatNumber > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Seat #{founderSeatNumber} of {seatsMax}
                  </p>
                )}
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Founder pricing is locked for 36 months from your signup date.{founderExpiryLabel ? ` After ${founderExpiryLabel}, you'll transition to Standard pricing at the then-current rate.` : ''}
                </p>
              </div>
              <PortalButton loading={portalLoading} onClick={handlePortal} />
            </div>
          </div>

          {/* Monthly / Annual toggle */}
          <CadenceToggle cadence={cadence} onChange={handleCadenceChange} />

          {/* Pricing breakdown */}
          <PricingBreakdown
            base={`$${founderBase}`} baseLabel="Base subscription" baseSuffix={cadenceSuffix} baseDetail="First location included"
            addl={`$${founderAddl}`} addlSuffix={`${cadenceSuffix} each`} addlDetail={locationCount > 1 ? `${locationCount - 1} additional` : 'None yet'}
            total={founderBase + Math.max(0, locationCount - 1) * founderAddl}
            locationCount={locationCount}
            cadenceSuffix={cadenceSuffix}
          />

          {/* Location summary */}
          <LocationSummaryCard locationCount={locationCount} tierLabel="Founder"
            onAddLocation={() => navigate('/org-hierarchy')} />

          {/* Risk-free guarantee */}
          <RiskFreeCard riskFreeEligibility={riskFreeEligibility} onCheckStatus={() => setShowRiskFreeModal(true)} />

          {/* Founder forfeiture warning */}
          <div className="rounded-xl p-4" style={{ border: `1px solid ${colors.warningSoft}`, backgroundColor: '#FFFBEB' }}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: colors.warning }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: '#92400E' }}>Founder Pricing Forfeiture</p>
                <p className="text-xs mt-0.5" style={{ color: '#A16207' }}>
                  Canceling your subscription permanently forfeits your locked Founder rate. Re-subscribing after cancellation will be at the then-current Standard pricing.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── ESSENTIALS VIEW ───────────────────────────────────── */}
      {isEssentialsView && (
        <>
          {/* Upgrade alert */}
          <FounderUpgradeAlert seatsTaken={seatsTaken} seatsMax={seatsMax} spotsRemaining={spotsRemaining}
            onUpgrade={() => handleCheckout(PLANS[0]?.priceId || '', 'founder_single')} />

          {/* Plan card */}
          <div className="rounded-xl p-5" style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, #2c5f7f 100%)` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Current Plan</p>
                <h3 className="text-lg font-bold mt-0.5" style={{ color: colors.white }}>Essentials</h3>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Everything you need to log temps, complete checklists, and produce inspection-ready records — built for a single location.
                </p>
              </div>
              <PortalButton loading={portalLoading} onClick={handlePortal} />
            </div>
          </div>

          {/* Monthly / Annual toggle */}
          <CadenceToggle cadence={cadence} onChange={handleCadenceChange} />

          {/* Pricing breakdown */}
          <PricingBreakdown
            base={`$${essentialsBase}`} baseLabel="Base subscription" baseSuffix={cadenceSuffix} baseDetail="First location included"
            addl={`$${essentialsAddl}`} addlSuffix={`${cadenceSuffix} each`} addlDetail={locationCount > 1 ? `${locationCount - 1} additional` : 'None yet'}
            total={essentialsBase + Math.max(0, locationCount - 1) * essentialsAddl}
            locationCount={locationCount}
            cadenceSuffix={cadenceSuffix}
          />

          <LocationSummaryCard locationCount={locationCount} maxLocations={3} tierLabel="Essentials"
            onAddLocation={() => navigate('/org-hierarchy')} />
        </>
      )}

      {/* ─── TRIAL VIEW ────────────────────────────────────────── */}
      {isTrialView && (
        <>
          {/* Trial banner */}
          <div className="rounded-xl p-5 text-center" style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, #2c5f7f 100%)` }}>
            <h2 className="text-lg font-bold mb-1" style={{ color: colors.white, fontFamily: typography.family.body }}>
              You're on the {pricing.trial_days}-day free trial
            </h2>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Explore EvidLY with full access. Choose a plan to continue after your trial ends.
            </p>
          </div>

          {/* Upgrade alert (only during Founder window) */}
          {spotsRemaining > 0 && (
            <FounderUpgradeAlert seatsTaken={seatsTaken} seatsMax={seatsMax} spotsRemaining={spotsRemaining}
              onUpgrade={() => handleCheckout(PLANS[0]?.priceId || '', 'founder_single')} />
          )}

          <LocationSummaryCard locationCount={locationCount} maxLocations={1} tierLabel="Trial"
            capacityDetail="of 1 location during trial"
            onAddLocation={() => navigate('/org-hierarchy')} />

          <RiskFreeCard riskFreeEligibility={riskFreeEligibility} onCheckStatus={() => setShowRiskFreeModal(true)} />

          {/* Monthly / Annual toggle */}
          <CadenceToggle cadence={cadence} onChange={setCadence} />

          {/* Trial-expired state (Prompt B): when trial_expired_at IS NOT NULL and no paid subscription exists,
              user has access only to Documents and Calendar (both read-only). These surfaces populate ONLY when
              CPP is the customer's Hood Cleaning vendor — records come from the HoodOps → EvidLY webhook.
              Non-CPP customers see empty state. */}

          {/* Plan cards for upgrade — dual-state based on Founder window */}
          <div>
            <h3 className="text-sm font-bold mb-3" style={{ color: colors.navy }}>Choose a plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PlanCard
                name="Essentials" subtitle="Single location" priceLabel={`$${essentialsBase}${cadenceSuffix}`}
                priceDetail={`+ $${essentialsAddl}${cadenceSuffix} per additional`}
                features={['Core operational workflows', 'Temperature logging', 'Checklist management', 'Document storage']}
                onSelect={() => handleCheckout(PLANS[0]?.priceId || '', 'essentials')}
                buttonLabel="Start 30-day trial" loading={checkoutLoading === 'essentials'}
                trialBadgeDays={pricing.trial_days}
                annualBadge={!founderWindowOpen && !isMonthly ? '2 months free' : undefined}
              />
              {founderWindowOpen ? (
                /* During Founder window — Founder card */
                <PlanCard
                  name="Founder" subtitle="36-month locked rate"
                  priceLabel={`$${founderBase}${cadenceSuffix}`}
                  priceDetail={`+ $${founderAddl}${cadenceSuffix} per additional`}
                  features={['All Essentials features', 'Food Safety Advisor + Fire Safety Advisor', 'Jurisdiction Intelligence', 'HACCP plan generation', `Price locked for ${pricing.founder_lock_months} months`]}
                  onSelect={() => handleCheckout(PLANS[0]?.priceId || '', 'founder_single')}
                  buttonLabel="Lock Founder Rate" loading={checkoutLoading === 'founder_single'}
                  highlighted goldBorder
                  highlightLabel={`${seatsTaken} OF ${seatsMax} TAKEN`}
                  trialBadgeDays={pricing.trial_days}
                />
              ) : (
                /* After Founder window — Standard card */
                <PlanCard
                  name="Standard" subtitle="Multi-location"
                  priceLabel={`$${standardBase}${cadenceSuffix}`}
                  priceDetail={`+ $${standardAddl}${cadenceSuffix} per additional`}
                  features={['All Essentials features', 'Food Safety Advisor + Fire Safety Advisor', 'Jurisdiction Intelligence', 'HACCP plan generation']}
                  onSelect={() => handleCheckout(PLANS[0]?.priceId || '', 'standard')}
                  buttonLabel="Start 30-day trial" loading={checkoutLoading === 'standard'}
                  highlighted
                  trialBadgeDays={pricing.trial_days}
                  annualBadge={!isMonthly ? `Save $${pricing.standard_monthly * 12 - pricing.standard_annual}/yr` : undefined}
                />
              )}
              <PlanCard
                name="Enterprise" subtitle="11+ locations" priceLabel="Custom" priceDetail="Contact sales"
                features={['Everything in Standard', 'Dedicated onboarding', 'Custom integrations', 'Priority support']}
                onSelect={() => toast.info('Contact sales@getevidly.com for Enterprise pricing')}
                buttonLabel="Contact Sales" loading={false}
                isEnterprise
                trialBadgeDays={pricing.trial_days}
              />
            </div>
          </div>
        </>
      )}

      {/* ─── POST-WINDOW (STANDARD) VIEW ───────────────────────── */}
      {isPostWindowView && (
        <>
          <div className="rounded-xl p-5" style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, #2c5f7f 100%)` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Current Plan</p>
                <h3 className="text-lg font-bold mt-0.5" style={{ color: colors.white }}>Standard</h3>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Full kitchen leader workflow with jurisdiction intelligence across all your locations.
                </p>
              </div>
              <PortalButton loading={portalLoading} onClick={handlePortal} />
            </div>
          </div>

          {/* Monthly / Annual toggle */}
          <CadenceToggle cadence={cadence} onChange={handleCadenceChange} />

          <PricingBreakdown
            base={`$${standardBase}`} baseLabel="Base subscription" baseSuffix={cadenceSuffix} baseDetail="First location included"
            addl={`$${standardAddl}`} addlSuffix={`${cadenceSuffix} each`} addlDetail={locationCount > 1 ? `${locationCount - 1} additional` : 'None yet'}
            total={standardBase + Math.max(0, locationCount - 1) * standardAddl}
            locationCount={locationCount}
            cadenceSuffix={cadenceSuffix}
          />

          <LocationSummaryCard locationCount={locationCount} tierLabel="Standard"
            onAddLocation={() => navigate('/org-hierarchy')} />
        </>
      )}

      {/* ─── ENTERPRISE VIEW ───────────────────────────────────── */}
      {isEnterpriseView && (
        <>
          <div className="rounded-xl p-5" style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, #2c5f7f 100%)` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Current Plan</p>
                <h3 className="text-lg font-bold mt-0.5" style={{ color: colors.white }}>Enterprise</h3>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Custom pricing with dedicated support for your organization.
                </p>
              </div>
              <PortalButton loading={portalLoading} onClick={handlePortal} />
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}` }}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
              <div className="rounded-lg p-3.5 text-center" style={{ backgroundColor: colors.cream }}>
                <MapPin className="h-5 w-5 mx-auto mb-1.5" style={{ color: colors.navy }} />
                <div className="text-xl font-extrabold" style={{ color: colors.navy }}>{locationCount}</div>
                <div className="text-xs mt-0.5" style={{ color: colors.textMuted }}>Active locations</div>
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: colors.textMuted }}>
              Contact your account representative to add locations or adjust your plan.
            </p>
          </div>
        </>
      )}

      {/* Stripe portal link — active subscribers */}
      {(isFounderView || isPostWindowView || isEnterpriseView || isEssentialsView) && (
        <div className="rounded-xl p-4 flex items-center justify-between" style={{ border: `1px solid ${colors.border}`, backgroundColor: colors.white }}>
          <div>
            <h4 className="text-sm font-semibold" style={{ color: colors.navy }}>Invoices &amp; Payment Methods</h4>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              View invoices, update payment method, or manage your subscription through the Stripe billing portal.
            </p>
          </div>
          <button type="button" onClick={handlePortal} disabled={portalLoading}
            className="px-4 py-2 text-sm font-medium flex items-center gap-1.5 rounded-lg transition-colors hover:underline disabled:opacity-50"
            style={{ color: colors.navy }}>
            {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Open Billing Portal
          </button>
        </div>
      )}

      <RiskFreeStatusModal isOpen={showRiskFreeModal} onClose={() => setShowRiskFreeModal(false)} eligibility={riskFreeEligibility} />
    </div>
  );
}

/* ─── Shared Components ──────────────────────────────────────── */

function PortalButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
      style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: colors.white }}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
      Manage
    </button>
  );
}

function PricingBreakdown({ base, baseLabel, baseSuffix, baseDetail, addl, addlSuffix, addlDetail, total, locationCount, cadenceSuffix }: {
  base: string; baseLabel: string; baseSuffix: string; baseDetail: string;
  addl: string; addlSuffix: string; addlDetail: string;
  total: number; locationCount: number; cadenceSuffix?: string;
}) {
  const suffix = cadenceSuffix || '/mo';
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}` }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: colors.navy }}>
        <CreditCard className="h-4 w-4 inline-block mr-1.5 -mt-0.5" /> Pricing
      </h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        <PricingCard label={baseLabel} value={base} suffix={baseSuffix} detail={baseDetail} />
        <PricingCard label="Additional locations" value={addl} suffix={addlSuffix} detail={addlDetail} />
        <PricingCard label={`Estimated ${suffix === '/yr' ? 'annual' : 'monthly'}`} value={`$${total}`} suffix={suffix}
          detail={`${locationCount} location${locationCount !== 1 ? 's' : ''}`} highlight />
      </div>
    </div>
  );
}

function PricingCard({ label, value, suffix, detail, highlight }: {
  label: string; value: string; suffix: string; detail: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-lg p-3.5 text-center" style={{
      backgroundColor: highlight ? colors.cream : `${colors.navy}05`,
      border: highlight ? `1px solid ${colors.border}` : undefined,
    }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.textMuted }}>{label}</div>
      <div className="flex items-baseline justify-center gap-0.5">
        <span className="text-xl font-extrabold" style={{ color: colors.navy }}>{value}</span>
        <span className="text-xs" style={{ color: colors.textMuted }}>{suffix}</span>
      </div>
      <div className="text-[11px] mt-1" style={{ color: colors.textSecondary }}>{detail}</div>
    </div>
  );
}

function LocationSummaryCard({ locationCount, maxLocations, tierLabel, capacityDetail, onAddLocation }: {
  locationCount: number; maxLocations?: number; tierLabel: string; capacityDetail?: string; onAddLocation: () => void;
}) {
  const atLimit = maxLocations != null && locationCount >= maxLocations;
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}` }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: colors.navy }}>
        <MapPin className="h-4 w-4 inline-block mr-1.5 -mt-0.5" /> Locations
      </h3>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xl font-extrabold" style={{ color: colors.navy }}>{locationCount}</span>
          <span className="text-xs ml-1.5" style={{ color: colors.textMuted }}>
            {capacityDetail || (maxLocations != null ? `of ${maxLocations} locations` : `location${locationCount !== 1 ? 's' : ''}`)}
          </span>
          {atLimit && (
            <p className="text-xs mt-1" style={{ color: colors.warning }}>
              Location limit reached. Contact sales for Enterprise pricing.
            </p>
          )}
        </div>
        {!atLimit && (
          <button type="button" onClick={onAddLocation}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            style={{ backgroundColor: colors.navy, color: colors.cream }}>
            <Plus className="h-3.5 w-3.5" /> Add Location
          </button>
        )}
      </div>
    </div>
  );
}

function RiskFreeCard({ riskFreeEligibility, onCheckStatus }: { riskFreeEligibility: any; onCheckStatus: () => void }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#eef4f8', border: '1px solid #b8d4e8' }}>
      <div className="flex items-start gap-3">
        <EvidlyIcon size={20} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm" style={{ color: colors.navy }}>45-Day Money-Back Guarantee</p>
          <p className="text-xs mt-0.5" style={{ color: '#3a6d8a' }}>
            Try EvidLY for 45 days. If it doesn't deliver, get a full refund of your subscription fees — no questions asked.
          </p>
          {riskFreeEligibility && (
            <button type="button" onClick={onCheckStatus}
              className="mt-2 text-xs font-semibold hover:underline transition-colors"
              style={{ color: colors.navy, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Check My Risk-Free Status &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FounderUpgradeAlert({ seatsTaken, seatsMax, spotsRemaining, onUpgrade }: {
  seatsTaken: number; seatsMax: number; spotsRemaining: number; onUpgrade: () => void;
}) {
  if (spotsRemaining <= 0) {
    return (
      <div className="rounded-xl p-4" style={{ border: `1px solid ${colors.border}`, backgroundColor: colors.cream }}>
        <div className="flex items-start gap-3">
          <Crown className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: colors.textMuted }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: colors.navy }}>Founder window closed</p>
            <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
              All {seatsMax} Founder seats have been claimed. New subscriptions start at Standard pricing ($199/mo).
            </p>
          </div>
        </div>
      </div>
    );
  }

  const urgencyColor = spotsRemaining <= 25 ? colors.danger : spotsRemaining <= 75 ? colors.warning : colors.gold;

  return (
    <div className="rounded-xl p-4" style={{
      background: 'linear-gradient(135deg, rgba(160,140,90,0.08) 0%, rgba(160,140,90,0.03) 100%)',
      border: '1px solid rgba(160,140,90,0.2)',
    }}>
      <div className="flex items-start gap-3">
        <TrendingUp className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: urgencyColor }} />
        <div className="flex-1">
          <p className="font-bold text-sm" style={{ color: colors.navy }}>
            {spotsRemaining} Founder {spotsRemaining === 1 ? 'seat' : 'seats'} remaining
          </p>
          <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
            Lock in $99/mo for 36 months — {seatsTaken} of {seatsMax} seats claimed. Once filled, new subscriptions start at $199/mo.
          </p>
          <button type="button" onClick={onUpgrade}
            className="mt-2.5 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            style={{ backgroundColor: colors.navy, color: colors.cream }}>
            <Lock className="h-3 w-3" /> Lock Founder Rate
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ name, subtitle, priceLabel, priceDetail, features, onSelect, buttonLabel, loading, highlighted, goldBorder, isEnterprise, highlightLabel, trialBadgeDays, annualBadge }: {
  name: string; subtitle: string; priceLabel: string; priceDetail: string;
  features: string[]; onSelect: () => void; buttonLabel: string; loading: boolean;
  highlighted?: boolean; goldBorder?: boolean; isEnterprise?: boolean;
  highlightLabel?: string; trialBadgeDays?: number; annualBadge?: string;
}) {
  return (
    <div className="relative rounded-xl p-5 transition-all" style={{
      border: highlighted ? `2px solid ${goldBorder ? colors.gold : colors.navy}` : `1px solid ${colors.border}`,
      backgroundColor: colors.white,
    }}>
      {/* Trial badge — shown on all cards only in Trial view */}
      {trialBadgeDays != null && (
        <div className="absolute -top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
            style={{ backgroundColor: colors.info, color: colors.white }}>
            <Clock className="h-2.5 w-2.5" /> {trialBadgeDays}-Day Trial
          </span>
        </div>
      )}
      {highlighted && highlightLabel && (
        <div className={`absolute -top-3 ${trialBadgeDays != null ? 'left-3' : 'left-1/2 -translate-x-1/2'}`}>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm"
            style={{ backgroundColor: colors.gold, color: colors.white }}>
            <Crown className="h-3 w-3" /> {highlightLabel}
          </span>
        </div>
      )}
      <div className={highlighted || trialBadgeDays != null ? 'mt-2' : ''}>
        <h4 className="text-lg font-bold" style={{ color: colors.navy }}>{name}</h4>
        <p className="text-xs" style={{ color: colors.textMuted }}>{subtitle}</p>
        <div className="mt-2 mb-1 flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-bold tracking-tight" style={{ color: colors.navy }}>{priceLabel}</span>
          {annualBadge && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: colors.successSoft, color: colors.success }}>
              {annualBadge}
            </span>
          )}
        </div>
        <p className="text-[11px] mb-4" style={{ color: colors.textMuted }}>{priceDetail}</p>
        <ul className="space-y-2 mb-5">
          {features.map(f => (
            <li key={f} className="flex items-start gap-2 text-sm" style={{ color: `${colors.navy}CC` }}>
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: colors.success }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onSelect} disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          style={isEnterprise
            ? { border: `2px solid ${colors.navy}`, color: colors.navy, backgroundColor: 'transparent' }
            : { backgroundColor: colors.navy, color: colors.white }
          }>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

function CadenceToggle({ cadence, onChange }: { cadence: 'monthly' | 'annual'; onChange: (c: 'monthly' | 'annual') => void }) {
  return (
    <div className="rounded-xl p-3 flex items-center justify-center gap-2" style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}` }}>
      <span className="text-xs font-semibold" style={{ color: colors.textSecondary }}>Billing:</span>
      <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
        <button type="button" onClick={() => onChange('monthly')}
          className="px-4 py-1.5 text-xs font-semibold transition-colors"
          style={{
            backgroundColor: cadence === 'monthly' ? colors.navy : 'transparent',
            color: cadence === 'monthly' ? colors.white : colors.textSecondary,
          }}>
          Monthly
        </button>
        <button type="button" onClick={() => onChange('annual')}
          className="px-4 py-1.5 text-xs font-semibold transition-colors"
          style={{
            backgroundColor: cadence === 'annual' ? colors.navy : 'transparent',
            color: cadence === 'annual' ? colors.white : colors.textSecondary,
          }}>
          Annual
        </button>
      </div>
    </div>
  );
}
