/**
 * Server-side Stripe utilities.
 * Import only in server components and API routes — never in client components.
 *
 * CLEAN MODEL: Used to verify webhooks and read payment status. Stripe holds funds; this code does not.
 */

import Stripe from 'stripe';

let client: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (client) {
    return client;
  }
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  client = new Stripe(secret, {
    // Pinned to match `stripe@16` TypeScript definitions; upgrade `stripe` to adopt newer API dates.
    apiVersion: '2024-06-20',
    typescript: true,
  });
  return client;
}
