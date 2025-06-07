import Stripe from 'stripe';
import { loadStripe, Stripe as StripeJS } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
});

// Client-side Stripe instance
let stripePromise: Promise<StripeJS | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Stripe configuration
export const STRIPE_CONFIG = {
  currency: 'usd' as const,
  payment_method_types: ['card'] as const,
  plan: {
    name: 'Professional Plan',
    price: 4900, // $49.00 in cents
    priceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL!,
    features: [
      'Unlimited AI call answering',
      'Customizable greeting and questions',
      'Instant email summaries',
      'Advanced analytics',
      'Priority support',
      'Custom integrations'
    ]
  }
};

export type StripePlan = 'professional'; 