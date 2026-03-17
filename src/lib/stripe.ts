import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn('Missing VITE_STRIPE_PUBLISHABLE_KEY. Stripe will not load.');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

export interface Plan {
  id: string;
  name: string;
  subtitle: string;
  price: number | null;
  additionalLocationPrice?: number;
  priceLabel: string;
  description: string;
  locationRange: string;
  priceId: string | null;
  features: string[];
}

export const FOUNDER_PRICING_DEADLINE = new Date('2026-07-04T23:59:59-07:00');

export const PLANS: Plan[] = [
  {
    id: 'founder_single',
    name: 'Founder',
    subtitle: 'Single Location',
    price: 99,
    priceLabel: '$99/mo',
    description: 'One location. Full platform access. Locked for life.',
    locationRange: '1 location',
    priceId: import.meta.env.VITE_STRIPE_FOUNDER_SINGLE_PRICE_ID || 'price_founder_single',
    features: [
      'Full dual-pillar compliance intelligence',
      'Jurisdiction Intelligence Engine (62 CA jurisdictions)',
      'AI-powered HACCP plan generation',
      'Real-time regulatory alerts',
      'Self-inspection & mock inspection tools',
      'Temperature logging with AI anomaly detection',
      'Document management & vendor tracking',
      'Team management with role-based access',
    ],
  },
  {
    id: 'founder_multi',
    name: 'Founder',
    subtitle: '2\u201310 Locations',
    price: 99,
    additionalLocationPrice: 49,
    priceLabel: '$99/mo + $49/mo per additional location',
    description: 'Multi-location operations. Same powerful platform across every kitchen.',
    locationRange: '2\u201310 locations',
    priceId: import.meta.env.VITE_STRIPE_FOUNDER_MULTI_PRICE_ID || 'price_founder_multi',
    features: [
      'Everything in Founder Single',
      'Portfolio-wide risk dashboard',
      'Cross-location benchmarking',
      'Executive summary reports',
      'Centralized vendor management',
    ],
  },
  {
    id: 'enterprise',
    name: 'Custom',
    subtitle: '11+ Locations',
    price: null,
    priceLabel: 'Contact Us',
    description: 'Enterprise-scale operations with dedicated onboarding and support.',
    locationRange: '11+ locations',
    priceId: null,
    features: [
      'Everything in Founder Multi',
      'Dedicated onboarding specialist',
      'Custom integrations',
      'Priority support',
      'Custom reporting',
    ],
  },
];

export async function createCheckoutSession(priceId: string, tier?: string, locationCount?: number) {
  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: { priceId, tier, locationCount },
  });
  if (error) throw error;
  return data as { url: string };
}

export async function createPortalSession() {
  const { data, error } = await supabase.functions.invoke('stripe-customer-portal');
  if (error) throw error;
  return data as { url: string };
}
