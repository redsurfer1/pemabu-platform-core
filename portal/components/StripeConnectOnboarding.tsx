/**
 * Seller Connect onboarding — redirects to Stripe-hosted onboarding.
 * CLEAN MODEL: no bank or identity data handled by Pemabu UI beyond opaque account IDs stored server-side.
 */

'use client';

import { useState } from 'react';

interface Props {
  sellerId: string;
  isOnboardingComplete: boolean;
  payoutsEnabled: boolean;
}

export function StripeConnectOnboarding({
  sellerId,
  isOnboardingComplete,
  payoutsEnabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isOnboardingComplete && payoutsEnabled) {
    return (
      <div className="connect-status complete">
        <p>
          Payment account active. You can receive payment releases for completed milestones.
        </p>
      </div>
    );
  }

  const startOnboarding = async () => {
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId,
          returnUrl: `${origin}/seller/connect/complete`,
          refreshUrl: `${origin}/seller/connect/refresh?sellerId=${encodeURIComponent(sellerId)}`,
        }),
      });
      const data = (await response.json()) as { onboardingUrl?: string; error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Onboarding request failed');
        setLoading(false);
        return;
      }
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
        return;
      }
      setError('Missing onboarding URL');
    } catch {
      setError('Unable to start account setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="connect-onboarding">
      <h3>Set up your payment account</h3>
      <p>
        To receive payment when you complete a job, set up your payment account. You will be redirected to our
        payment partner (Stripe) to complete setup securely.
      </p>
      <p className="connect-note">Pemabu does not store your bank details. Stripe handles payment account setup.</p>
      {error ? <p className="connect-error">{error}</p> : null}
      <button type="button" onClick={() => void startOnboarding()} disabled={loading} className="btn-primary">
        {loading ? 'Redirecting to Stripe…' : 'Set up payment account'}
      </button>
    </div>
  );
}
