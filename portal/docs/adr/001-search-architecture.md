# ADR 001 — Pemabu Gig Search Architecture (OfferedJobs Blueprint Parity)

## Status

**Proposed**

## Context

- The **OfferedJobs** blueprint describes rich **faceted job search** (hierarchical category and location, radius, remote, many taxonomies, keyword FTS) and **WooCommerce-backed employer packages**.  
- **Pemabu** (this repo) models open work primarily as `TreasuryTask` with `skills: String[]`, promoted job feed (`GET /api/jobs`), and **keyword-style** matching in `src/lib/talenthunt-integration.ts` for certification webhooks — **not** a full faceted search API in the current snapshot.  
- **ChromaDB** is part of the product narrative but **not** wired in `talenthunt-integration.ts` as implemented here.  
- **Regulatory constraint:** search upgrades must **not** introduce payment custody, MSB-like flows, or Woo “paid visibility” patterns.

## Decision

1. **Introduce a first-class search API** (`GET /api/v1/search/tasks`) that combines:
   - **Structured filters** in PostgreSQL (tenant-scoped categories, tags, location, remote, optional budget fields, geo radius).
   - **Full-text search** on title/description (Postgres `tsvector` / `websearch_to_tsquery`).
   - **Semantic retrieval** via **pgvector on `TreasuryTask`** *or* **ChromaDB** collections keyed by `treasuryTaskId`, selected per infra preference — with results **intersected** with SQL filters for safety and tenant isolation.

2. **Normalize taxonomy** using new Prisma models (`GigCategory`, `GigTag`, `GigLocation`, join tables) instead of encoding all facets only in `skills[]`.

3. **Expose advanced UI filters** only when the **Flomisma tenant feature flag** `features.advanced_gig_search` is true (see `TENANTS/pemabu/config.json` patch in project docs).

4. **Explicitly reject** importing Nokri/Woo **subscription and package credit** mechanics for **search access** or **result ranking**. Economic gating remains **Pemabu’s existing OBV / access-entitlement signals** (platform capability limits, not consumer lending or custodial balances), not blueprint employer packages.

## Consequences

- **Positive:** Marketplace discovery approaches **industry-standard** marketplace UX (filters + keyword + semantic relevance) without adopting WordPress coupling.
- **Positive:** Tenant operators can **opt in** via Flomisma config for advanced search cost/complexity.
- **Risk:** Migrations and backfill for categories/locations require migration sprint; vector infra adds ops complexity.
- **Mitigation:** Ship **SQL-only** search first; add vector + FTS in phases; feature-flag advanced facets.

## Rejected alternatives

| Alternative | Why rejected |
|-------------|--------------|
| **Port Nokri PHP search queries** | Wrong stack; unmaintainable; security/regulatory risk surface. |
| **WooCommerce packages for “featured” listings or search visibility** | **REGULATORY_RISK** (payment + marketplace placement); conflicts with non-custodial constraint when tied to money flow. |
| **Stripe Checkout for “search tier”** | Same — payment-gated discovery is out of scope for this design. |
| **Chroma-only search without SQL filters** | Fails tenant isolation and structured compliance filters; unacceptable for multi-tenant data. |
| **Keyword-only forever** | Does not meet blueprint or product goals for semantic gig matching. |
