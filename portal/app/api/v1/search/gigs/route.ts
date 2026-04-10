/**
 * Mirror of the active Next.js route at `app/api/v1/search/gigs/route.ts`.
 * The App Router resolves from repo root `app/`; this file preserves the portal path contract.
 *
 * Vertical-aware culinary search (headers + validation) is implemented in that source file.
 *
 * NOTE: This route serves both gig listings and service task search. A separate /search/tasks
 * route was evaluated and determined redundant. See: portal/docs/search-upgrade-design.md
 * See: FLOMISMA_PLATFORM/docs/SPRINT_SUMMARY.md Section 10.1
 */
export { POST } from '@/app/api/v1/search/gigs/route';
