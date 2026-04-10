/**
 * Pemabu portal tree mirror route.
 * Next.js serves API routes from the repository root `app/` directory; the canonical handler lives at:
 * `PEMABU_PLATFORM/app/api/webhooks/stripe/route.ts`.
 */
export { POST, dynamic } from '../../../../../app/api/webhooks/stripe/route';
