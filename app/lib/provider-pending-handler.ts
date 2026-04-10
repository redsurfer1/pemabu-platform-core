// CLEAN MODEL 2026-04-02: UI aligned with stubbed monetary-authority API routes.
// Re-implement in Sprint 5 against the licensed provider API.
// Reference: FLOMISMA_PLATFORM/docs/clean-api-surface.md

export function isProviderPendingError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'PROVIDER_OPERATION'
  );
}

export type ProviderOperationBody = {
  error?: string;
  code?: string;
  reference?: string;
};

export function isProviderOperationBody(data: unknown): data is ProviderOperationBody {
  return (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    (data as ProviderOperationBody).code === 'PROVIDER_OPERATION'
  );
}

export function responseIndicatesProviderPending(res: Response, data: unknown): boolean {
  return res.status === 501 && isProviderOperationBody(data);
}

export const PROVIDER_PENDING_MESSAGE =
  'This feature will be available once provider integration is complete.';

export const PROVIDER_PENDING_MESSAGE_FRIENDLY =
  'This feature requires provider integration and will be available in a future update.';
