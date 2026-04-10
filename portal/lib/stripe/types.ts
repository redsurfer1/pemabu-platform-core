/**
 * Normalized payment status for UI display.
 * Maps Stripe status strings to user-facing labels.
 * These are display types only — not financial records.
 */

export interface PaymentStatusDisplay {
  stripeStatus: string;
  displayLabel: string;
  displayColor: 'neutral' | 'pending' | 'success' | 'error';
  isActionable: boolean;
  actionLabel?: string;
}

export const STRIPE_STATUS_MAP: Record<string, PaymentStatusDisplay> = {
  requires_payment_method: {
    stripeStatus: 'requires_payment_method',
    displayLabel: 'Payment pending',
    displayColor: 'pending',
    isActionable: true,
    actionLabel: 'Complete payment',
  },
  requires_confirmation: {
    stripeStatus: 'requires_confirmation',
    displayLabel: 'Confirming payment',
    displayColor: 'pending',
    isActionable: false,
  },
  requires_capture: {
    stripeStatus: 'requires_capture',
    displayLabel: 'Payment held — awaiting milestone',
    displayColor: 'pending',
    isActionable: false,
  },
  succeeded: {
    stripeStatus: 'succeeded',
    displayLabel: 'Payment released',
    displayColor: 'success',
    isActionable: false,
  },
  canceled: {
    stripeStatus: 'canceled',
    displayLabel: 'Payment returned to buyer',
    displayColor: 'neutral',
    isActionable: false,
  },
  processing: {
    stripeStatus: 'processing',
    displayLabel: 'Processing',
    displayColor: 'pending',
    isActionable: false,
  },
};
