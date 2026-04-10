/**
 * Vercel cron: daily dispatcher for revenue automation.
 * CLEAN MODEL: scheduling only; payments remain on Stripe elsewhere.
 * See: docs/dual-entity-operating-boundary.md
 */

import { NextResponse } from 'next/server';
import {
  conciergeOperatorDigest,
  expireStaleConciergeBriefs,
} from '@/portal/lib/concierge/conciergeJobs';
import {
  detectChurnSignal,
  retryBorderlineReviews,
  sendCreditExpiryReminders,
  sendEnthusiastPrivateSessionNudge,
  sendHumanReviewDigest,
  sendMonthlyAgentUsageReport,
  sendMonthlyHealthScore,
  sendMonthlyTeamSpendSummary,
  sendPremiumUpgradeTeaser,
  sendQuarterlyReVerificationReminder,
  sendSessionReminders,
  sendWeeklyAnalyticsDigest,
  sendWeeklyCityPipelineReport,
} from '@/portal/lib/cron/scheduleStubs';

export const dynamic = 'force-dynamic';

function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

async function runDaily(): Promise<void> {
  await expireStaleConciergeBriefs();
  await sendSessionReminders();
  await retryBorderlineReviews();
  await sendHumanReviewDigest();
  await conciergeOperatorDigest();
}

async function runWeeklyMonday(): Promise<void> {
  await sendCreditExpiryReminders();
  await sendEnthusiastPrivateSessionNudge();
  await detectChurnSignal();
  await sendWeeklyCityPipelineReport();
  await sendWeeklyAnalyticsDigest();
  await sendPremiumUpgradeTeaser();
}

async function runMonthlyFirst(): Promise<void> {
  await sendMonthlyTeamSpendSummary();
  await sendQuarterlyReVerificationReminder();
  await sendMonthlyHealthScore();
  await sendMonthlyAgentUsageReport();
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('Authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const now = new Date();
  const day = now.getUTCDay();
  const date = now.getUTCDate();

  await runDaily();
  if (day === 1) {
    await runWeeklyMonday();
  }
  if (date === 1) {
    await runMonthlyFirst();
  }

  return NextResponse.json({ ok: true, day, date });
}

export async function POST(req: Request) {
  return GET(req);
}
