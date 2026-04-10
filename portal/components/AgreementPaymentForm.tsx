/**
 * Buyer payment form — Stripe Elements (hosted fields). CLEAN MODEL: card data stays in Stripe iframe.
 */

'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { getStripe } from '@/portal/lib/stripe/client';
import { STRIPE_STATUS_MAP } from '@/portal/lib/stripe/types';

interface Props {
  agreementId: string;
  displayAmountCents: number;
  currency: string;
  buyerId: string;
  sellerId: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

function PaymentFormInner({
  onSuccess,
  onError,
}: Pick<Props, 'onSuccess' | 'onError'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/agreements/payment-complete`,
      },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message ?? 'Payment failed');
      setLoading(false);
    } else {
      onSuccess();
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <PaymentElement />
      <p className="payment-notice">
        Payment held securely by Stripe until your service is confirmed complete. Funds are not released to the
        provider until milestones are confirmed in the product workflow.
      </p>
      <button type="submit" disabled={!stripe || loading} className="btn-primary">
        {loading ? 'Processing…' : 'Fund agreement'}
      </button>
    </form>
  );
}

export function AgreementPaymentForm(props: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const stripePromise = useMemo(() => getStripe(), []);

  const initializePayment = async () => {
    setInitializing(true);
    setInitError(null);
    try {
      const response = await fetch('/api/stripe/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: props.agreementId,
          displayAmountCents: props.displayAmountCents,
          currency: props.currency,
          buyerId: props.buyerId,
          sellerId: props.sellerId,
        }),
      });
      const data = (await response.json()) as {
        clientSecret?: string;
        code?: string;
        error?: string;
      };

      if (data.code === 'SELLER_NOT_ONBOARDED') {
        setInitError(
          'The seller has not set up their payment account yet. Payment will be available once they complete setup.',
        );
        return;
      }

      if (!response.ok) {
        setInitError(data.error ?? 'Unable to initialize payment');
        return;
      }

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      }
    } catch {
      setInitError('Unable to initialize payment. Please try again.');
    } finally {
      setInitializing(false);
    }
  };

  if (initError) {
    return <p className="payment-error">{initError}</p>;
  }

  if (!clientSecret) {
    return (
      <button type="button" onClick={() => void initializePayment()} disabled={initializing} className="btn-primary">
        {initializing ? 'Preparing payment…' : 'Fund this agreement'}
      </button>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentFormInner onSuccess={props.onSuccess} onError={props.onError} />
    </Elements>
  );
}
