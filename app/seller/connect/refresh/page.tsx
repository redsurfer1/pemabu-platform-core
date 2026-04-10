'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function ConnectRefreshInner() {
  const searchParams = useSearchParams();
  const sellerId = searchParams.get('sellerId');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) {
      setError('Missing sellerId. Open Connect onboarding from your dashboard again.');
      return;
    }

    const origin = window.location.origin;
    void fetch('/api/stripe/connect/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellerId,
        returnUrl: `${origin}/seller/connect/complete`,
        refreshUrl: `${origin}/seller/connect/refresh?sellerId=${encodeURIComponent(sellerId)}`,
      }),
    })
      .then((r) => r.json() as Promise<{ onboardingUrl?: string; error?: string }>)
      .then((d) => {
        if (d.onboardingUrl) {
          window.location.href = d.onboardingUrl;
        } else {
          setError(d.error ?? 'Could not resume onboarding');
        }
      })
      .catch(() => setError('Could not resume onboarding'));
  }, [sellerId]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p>{error}</p>
      </div>
    );
  }

  return <p>Resuming account setup…</p>;
}

export default function ConnectRefreshPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <ConnectRefreshInner />
    </Suspense>
  );
}
