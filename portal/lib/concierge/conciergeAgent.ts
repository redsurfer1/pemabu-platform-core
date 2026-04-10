/**
 * CLEAN MODEL: Concierge fee via Stripe. Platform does not hold funds.
 * See: docs/dual-entity-operating-boundary.md
 */

export const CONCIERGE_FEE_CENTS = 7500;

const HUMAN_REVIEW_TOTAL_CENTS = 500_000;

export type ProviderKind = 'private_chef' | 'food_truck';

export type ProviderSummary = {
  providerId: string;
  providerName: string;
  serviceType: string;
  providerType: ProviderKind;
};

export type EventScale = 'intimate' | 'gathering' | 'large';

/** Server-side tier from guest count — do not trust client-supplied scale. */
export function eventScaleFromGuestCount(guestCount: number): EventScale {
  const n = Number(guestCount);
  if (!Number.isFinite(n) || n < 1) return 'intimate';
  if (n <= 25) return 'intimate';
  if (n <= 100) return 'gathering';
  return 'large';
}

export type ConciergeBriefInput = {
  citySlug: string;
  cityDisplayName: string;
  eventType: string;
  guestCount: number;
  /** Derived server-side from guestCount — never trust client. */
  eventScale: EventScale;
  theme?: string | null;
  budgetCents: number;
  eventDate?: string | null;
  locationNotes?: string | null;
  chefs: ProviderSummary[];
  trucks: ProviderSummary[];
};

export type PackageItem = {
  providerId: string;
  providerName: string;
  providerType: ProviderKind;
  serviceType: string;
  estimatedCostCents: number;
  notes?: string;
};

export type ConciergePackageResult = {
  packageItems: PackageItem[];
  estimatedTotalCents: number;
  packageNarrative: string;
  requiresHumanReview: boolean;
  conciergeFeesCents: number;
};

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatProviderList(providers: ProviderSummary[]): string {
  if (providers.length === 0) return '';
  return providers
    .map(
      (p) =>
        `- id=${p.providerId} name=${p.providerName} type=${p.providerType} service=${p.serviceType}`,
    )
    .join('\n');
}

export async function generateConciergePackage(
  brief: ConciergeBriefInput
): Promise<ConciergePackageResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model =
    process.env.ANTHROPIC_CONCIERGE_MODEL ??
    process.env.ANTHROPIC_MODEL ??
    'claude-sonnet-4-20250514';

  const chefLines = formatProviderList(brief.chefs);
  const truckLines = formatProviderList(brief.trucks);

  const prompt = `You are the SpiceKrewe event concierge in ${brief.cityDisplayName}.

Event brief:
- Type: ${brief.eventType}
- Guests: ${brief.guestCount}
- Event scale (derived): ${brief.eventScale} (intimate: 1–20 guests, gathering: 21–75, large: 76+)
- Budget (cents): ${brief.budgetCents}
- Theme: ${brief.theme ?? 'n/a'}
- Date: ${brief.eventDate ?? 'flexible'}
- Location notes: ${brief.locationNotes ?? 'n/a'}

Available providers in ${brief.cityDisplayName}:

PRIVATE CHEFS (${brief.chefs.length} available):
${chefLines || '(none listed)'}

FOOD TRUCKS (${brief.trucks.length} available):
${truckLines || '(none listed)'}

Selection guidance based on event scale:
- intimate (1-20 guests): recommend private_chef unless buyer requests food truck specifically
- gathering (21-75 guests): consider either type based on event description and cuisine preferences
- large (76+ guests): prefer food_truck or a combination of food trucks; private chef alone is not practical at this scale

Return JSON ONLY, no markdown fences, with this exact shape:
{"packageItems":[{"providerId":"","providerName":"","providerType":"private_chef","serviceType":"","estimatedCostCents":0,"notes":""}],"estimatedTotalCents":0,"packageNarrative":""}

providerType on each packageItem must be either "private_chef" or "food_truck" and must match an id from the lists above.

Rules:
- Sum of estimatedCostCents should not exceed budgetCents.
- estimatedTotalCents is the sum of item estimates.
- For each recommended provider, include providerType in your response.`;

  if (!apiKey) {
    const pool =
      brief.eventScale === 'large'
        ? [...brief.trucks, ...brief.chefs].slice(0, 6)
        : [...brief.chefs, ...brief.trucks].slice(0, 6);
    const pick = pool.slice(0, Math.min(3, Math.max(1, pool.length)));
    const fallbackItems: PackageItem[] = pick.map((p) => ({
      providerId: p.providerId,
      providerName: p.providerName,
      providerType: p.providerType,
      serviceType: p.serviceType,
      estimatedCostCents: Math.min(
        Math.floor(brief.budgetCents / Math.max(1, pick.length)),
        brief.budgetCents,
      ),
      notes: 'Auto suggestion (no ANTHROPIC_API_KEY)',
    }));
    const estimatedTotalCents = fallbackItems.reduce((s, i) => s + i.estimatedCostCents, 0);
    return {
      packageItems: fallbackItems,
      estimatedTotalCents,
      packageNarrative:
        'Suggested lineup based on available providers (development fallback without Claude).',
      requiresHumanReview: estimatedTotalCents > HUMAN_REVIEW_TOTAL_CENTS,
      conciergeFeesCents: CONCIERGE_FEE_CENTS,
    };
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Concierge AI error ${res.status}: ${err}`);
  }

  const body = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = body.content?.find((c) => c.type === 'text')?.text ?? '';
  const parsed = extractJsonObject(text);
  if (!parsed) {
    throw new Error('Concierge AI returned non-JSON');
  }

  const rawItems = Array.isArray(parsed.packageItems) ? parsed.packageItems : [];
  const packageItems: PackageItem[] = rawItems
    .map((row) => {
      const r = row as Record<string, unknown>;
      const estimated = Number(r.estimatedCostCents);
      const ptRaw = String(r.providerType ?? 'private_chef');
      const providerType: ProviderKind = ptRaw === 'food_truck' ? 'food_truck' : 'private_chef';
      return {
        providerId: String(r.providerId ?? ''),
        providerName: String(r.providerName ?? ''),
        providerType,
        serviceType: String(r.serviceType ?? 'culinary'),
        estimatedCostCents: Number.isFinite(estimated) ? Math.max(0, Math.floor(estimated)) : 0,
        notes: r.notes != null ? String(r.notes) : undefined,
      };
    })
    .filter((i) => i.providerId.length > 0);

  const estimatedTotalCents = Number.isFinite(Number(parsed.estimatedTotalCents))
    ? Math.max(0, Math.floor(Number(parsed.estimatedTotalCents)))
    : packageItems.reduce((s, i) => s + i.estimatedCostCents, 0);

  const packageNarrative =
    typeof parsed.packageNarrative === 'string'
      ? parsed.packageNarrative
      : 'Your SpiceKrewe concierge package is ready.';

  const requiresHumanReview = estimatedTotalCents > HUMAN_REVIEW_TOTAL_CENTS;

  return {
    packageItems,
    estimatedTotalCents,
    packageNarrative,
    requiresHumanReview,
    conciergeFeesCents: CONCIERGE_FEE_CENTS,
  };
}
