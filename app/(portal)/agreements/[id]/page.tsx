/**
 * Agreement detail — buyer funding (Stripe Elements) or seller read-only status.
 * Amount: `Contract.escrowAmount` from DB only (display cents for Stripe API).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { AgreementPaymentForm } from '@/portal/components/AgreementPaymentForm';
import { STRIPE_STATUS_MAP } from '@/portal/lib/stripe/types';

interface MilestoneRow {
  id: string;
  title: string;
  isVerified: boolean;
  releaseDate: string | null;
  amount: string;
}

interface ContractPayload {
  id: string;
  status: string;
  employerId: string;
  employeeId: string;
  escrowAmount: string;
  provider_status: string | null;
  stripe_payment_intent_id: string | null;
  milestones: MilestoneRow[];
}

function escrowToCents(escrowAmount: string): number {
  const n = Number(escrowAmount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

function paymentLabel(providerStatus: string | null | undefined): string {
  const key = providerStatus ?? '';
  return STRIPE_STATUS_MAP[key]?.displayLabel ?? (providerStatus ? providerStatus.replace(/_/g, ' ') : 'Not funded');
}

export default function AgreementDetailPage() {
  const params = useParams();
  const { user, isAuthenticated } = useAuth();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params?.id[0] : '';

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractPayload | null>(null);
  const [role, setRole] = useState<'buyer' | 'seller' | null>(null);

  const loadAgreement = useCallback(async () => {
    if (!user?.id || !id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agreements/${id}?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
      const data = (await res.json()) as { contract?: ContractPayload; role?: 'buyer' | 'seller'; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to load agreement');
      }

      setContract(data.contract ?? null);
      setRole(data.role ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load agreement');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !id) {
      setLoading(false);
      return;
    }
    void loadAgreement();
  }, [id, isAuthenticated, user?.id, loadAgreement]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50">
        <Navigation />
        <main className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-neutral-400">Sign in to view this agreement.</p>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50">
        <Navigation />
        <main className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-neutral-500">Loading agreement…</p>
        </main>
      </div>
    );
  }

  if (error || !contract || !role) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50">
        <Navigation />
        <main className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-red-400">{error ?? 'Agreement not found'}</p>
          <Link href="/agreements" className="text-blue-400 text-sm mt-4 inline-block">
            Back to agreements
          </Link>
        </main>
      </div>
    );
  }

  const displayAmountCents = escrowToCents(contract.escrowAmount);
  const buyer = role === 'buyer';
  const active = contract.status === 'ACTIVE';

  const funded =
    contract.provider_status === 'requires_capture' ||
    contract.provider_status === 'hold_ready' ||
    contract.provider_status === 'succeeded' ||
    contract.provider_status === 'released';

  // First-time funding: no PaymentIntent on the agreement yet. If the buyer refreshed mid-flow after
  // create-intent, the record may already have a PaymentIntent — resume flow is a follow-up (server client-secret recovery).
  const showFundForm = buyer && active && !funded && !contract.stripe_payment_intent_id;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <Navigation />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <Link href="/agreements" className="text-sm text-blue-400 hover:text-blue-300">
            ← My agreements
          </Link>
          <h1 className="text-2xl font-bold mt-4">Agreement</h1>
          <p className="text-xs text-neutral-500 mt-2 font-mono">{contract.id}</p>
          <p className="text-sm text-neutral-400 mt-2">
            Your role: <span className="text-neutral-200">{role}</span> · State:{' '}
            <span className="text-neutral-200">{contract.status}</span>
          </p>
        </div>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <h2 className="text-lg font-semibold mb-2">Payment</h2>
          {buyer ? (
            <>
              {showFundForm && user?.id ? (
                <AgreementPaymentForm
                  agreementId={contract.id}
                  displayAmountCents={displayAmountCents}
                  currency="usd"
                  buyerId={user.id}
                  sellerId={contract.employeeId}
                  onSuccess={() => void loadAgreement()}
                  onError={(msg) => setError(msg)}
                />
              ) : (
                <p className="text-neutral-300">{paymentLabel(contract.provider_status)}</p>
              )}
            </>
          ) : (
            <p className="text-neutral-300">
              {paymentLabel(contract.provider_status)} — read-only for seller until milestones are confirmed in product workflow.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <h2 className="text-lg font-semibold mb-4">Milestones</h2>
          {contract.milestones.length === 0 ? (
            <p className="text-neutral-500 text-sm">No milestones recorded.</p>
          ) : (
            <ul className="space-y-3">
              {contract.milestones.map((m) => (
                <li key={m.id} className="border-b border-neutral-800 pb-3 last:border-0">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Verified: {m.isVerified ? 'yes' : 'no'}
                    {m.releaseDate ? ` · Release: ${m.releaseDate}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
