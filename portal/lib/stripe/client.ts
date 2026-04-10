/**
 * Stripe client utilities for Pemabu portal.
 *
 * CLEAN MODEL: This module never holds or moves funds.
 * It loads Stripe.js for confirming PaymentIntents client-side when the backend returns a client secret.
 * Stripe holds the funds.
 *
 * See: FLOMISMA_PLATFORM/docs/dual-entity-operating-boundary.md
 */

import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
