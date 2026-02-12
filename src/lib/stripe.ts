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
  price: string;
  priceId: string | null;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'founder',
    name: "Founder's Edition",
    price: '$99/mo',
    priceId: import.meta.env.VITE_STRIPE_FOUNDER_PRICE_ID || 'price_founder_monthly',
    features: [
      'Up to 3 locations',
      'All compliance features',
      'AI Advisor',
      'Priority support',
      'Locked-in pricing forever',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$149/mo',
    priceId: 'price_professional_monthly',
    features: [
      'Up to 10 locations',
      "Everything in Founder's",
      'White-label reports',
      'API access',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceId: null,
    features: [
      'Unlimited locations',
      'SSO/SCIM',
      'Dedicated CSM',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
];

export async function createCheckoutSession(priceId: string) {
  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: { priceId },
  });
  if (error) throw error;
  return data as { url: string };
}

export async function createPortalSession() {
  const { data, error } = await supabase.functions.invoke('stripe-customer-portal');
  if (error) throw error;
  return data as { url: string };
}
