'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getStripe } from '@/portal/lib/stripe/client';
import { STRIPE_STATUS_MAP } from '@/portal/lib/stripe/types';

function PaymentCompleteInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>('checking');

  useEffect(() => {
    const clientSecret = searchParams.get('payment_intent_client_secret');
    if (!clientSecret) {
      setStatus('unknown');
      return;
    }

    void getStripe().then((stripe) => {
      if (!stripe) {
        setStatus('unknown');
        return;
      }
      void stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
        setStatus(paymentIntent?.status ?? 'unknown');
      });
    });
  }, [searchParams]);

  const displayStatus = STRIPE_STATUS_MAP[status];

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <h1>Payment status</h1>
      <p>{displayStatus?.displayLabel ?? (status === 'checking' ? 'Checking payment status…' : status)}</p>
      {status === 'requires_capture' ? (
        <p>
          Your payment is held securely. It will be released to the service provider when your milestone is confirmed
          complete.
        </p>
      ) : null}
      <p>
        <Link href="/dashboard">Back to dashboard</Link>
      </p>
    </div>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <PaymentCompleteInner />
    </Suspense>
  );
}
