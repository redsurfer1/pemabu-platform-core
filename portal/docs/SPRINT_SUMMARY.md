# Flomisma + Pemabu — Sprint Summary
# Sprints 4F through SpiceKrewe Onboarding
# Generated: 2026-04-02

---

## Pre-flight record (authoritative for this document)

All 32 paths listed in the sprint prompt were verified **EXISTS** and readable on **2026-04-02**. Approximate line counts are recorded in the sprint prompt’s pre-flight table in the agent chat log. **Unreadable:** none.

**Note:** `LIBRARY/Console/Commands/ObvRecalculateCommand.php` does **not** exist; `obv:recalculate` is implemented in `FLOMISMA_PLATFORM/LIBRARY/Console/Commands/ObvRecalculate.php`.

---

## Section 1 — Executive summary (non-technical)

Flomisma and Pemabu are companion software products used together in a deliberate split: one supplies licensed platform infrastructure, and the other operates a marketplace experience on top of it. After the recent program of work, both are framed around a “clean model” in everyday terms: the software is intended to organize work, record what parties agreed to, show where things stand, and support compliance and operations tooling. It is not positioned as the place where customer money is held, moved, or released by the platform itself. When money is involved in real life, the expectation is a licensed payments partner handles custody and settlement, while the platforms mirror status for clarity.

What is usable today, in business terms, is the non-monetary side of the story: discovery and workflow features, audits and reporting that do not execute payouts, administrative controls that do not initiate fund movement, tenant configuration and documentation, and new operational services such as technical hosting assistance, optional domain resale as a reseller (not as an accredited registrar), tenant code-health style audits, and advisory materials for a second marketplace brand onboarding for mobile.

What still needs a “Sprint Five” chapter is anything that depends on choosing and integrating a licensed provider: true hold-and-release behavior, live payout execution through the product, and replacing placeholder responses where the code intentionally refuses to move funds today. Legal and business gates also remain: external counsel responses to the eight internal briefs are still outstanding in the canonical brief file, and principals have not formally signed off on the dual-entity operating narrative, even though engineering has aligned the code and many documents to that story.

SpiceKrewe, as the second production-style tenant narrative in the repository, is in a sensible split state for a real onboarding: configuration, culinary taxonomy seeding intent, documentation for web and mobile tracks, and API patterns for location-aware search are represented in the tree. The actual go-live work—DNS, certificates, confirming the exact tenant identifier in the live database, supplying final brand assets, and publishing mobile apps under SpiceKrewe’s own store accounts—remains with the operator and brand team, with Flomisma positioned as advisor for the app, not publisher.

Finally, the program added explicit service lines that are easy to explain commercially: help operating custom domains and technical DNS layers without Flomisma becoming the registrant of record; fee lines documented in environment examples for hosting and optimization audits; and a clear statement that mobile store presence is the tenant’s responsibility. None of that changes the core posture: the platforms sell software and services around software, not banking.

---

## Section 2 — Regulatory and compliance status

### 2.1 Clean model summary

| Concept | Risk | Current status | Evidence |
|---------|------|----------------|----------|
| Money Services Business | Was present in narrative and some surfaces | **Mitigated in code for scoped endpoints** — live classification depends on operation | `FLOMISMA_PLATFORM/docs/clean-model-attestation.md`; `FLOMISMA_PLATFORM/docs/regulatory-scrub-report.md` (Sprint 4 appendix); `PEMABU_PLATFORM/portal/docs/regulatory-scrub-report.md` |
| Payments processor | Was present | **Stubbed / delegated framing** — Sprint 5 provider | `FLOMISMA_PLATFORM/docs/clean-api-surface.md` (STUB_501 rows); `FLOMISMA_PLATFORM/docs/approach-c-portal-escrow-settlement.md` |
| Escrow agent | Was present | **Stubbed — Sprint 5** | `FLOMISMA_PLATFORM/docs/clean-api-surface.md`; `FLOMISMA_PLATFORM/docs/approach-c-SmartContractService.php.md`; `FLOMISMA_PLATFORM/LIBRARY/services/AgreementService.php` |
| Fiduciary over assets | Not found in scrub group D | **No fiduciary matches called out** | `FLOMISMA_PLATFORM/docs/regulatory-scrub-report.md` |
| Consumer credit (ECOA) | Was ambiguous | **Reframed** as platform access / entitlements | `PEMABU_PLATFORM/portal/docs/compliance/Model-Card-V1.md`; `PEMABU_PLATFORM/portal/docs/compliance/Incentive-Remediation-V1.md`; Brief 3–4 in `FLOMISMA_PLATFORM/docs/legal-review-briefs.md` |
| Stored value / prepaid | Was ambiguous | **Reframed** — policy text denies redeemable cash balance | `PEMABU_PLATFORM/portal/docs/compliance/Incentive-Remediation-V1.md` |
| Domain registrar (ICANN) | New service | **Reseller only — tenant registrant of record** | `FLOMISMA_PLATFORM/LEGAL/domain-reseller-disclosure.md`; `FLOMISMA_PLATFORM/docs/clean-api-surface.md` (admin hosting SAFE) |

### 2.2 REGULATORY HOLD status

Hold documentation names below are taken from `FLOMISMA_PLATFORM/docs/regulatory-scrub-report.md` and the Pemabu mirror. Engineering status reflects Sprint 4 appendix + files read for this summary.

| File | Hold reason | Current status |
|------|------------|----------------|
| `FLOMISMA_PLATFORM/LIBRARY/services/SmartContractService.php` (lineage → `AgreementService.php`) | Payment-rail adjacent naming and historical behavior | **CLEAN MODEL APPLIED** — monetary methods throw / delegate message; provider webhook path via `AgreementService::receiveProviderWebhook` per `WebhookController.php` |
| `FLOMISMA_PLATFORM/LIBRARY/Http/Controllers/Api/V1/M2MController.php` | Wallet / escrow-like API surface | **CLEAN MODEL APPLIED** — mutating routes **STUB_501** per `FLOMISMA_PLATFORM/docs/clean-api-surface.md` and regulatory appendix |
| `FLOMISMA_PLATFORM/portal/lib/escrow-service.ts` | Escrow state machine | **CLEAN MODEL APPLIED** — replaced/stubbed per appendix (`ESCROW_REMOVED` cited in scrub appendix) |
| `FLOMISMA_PLATFORM/portal/lib/settlement-bridge.ts` | Settlement orchestration | **CLEAN MODEL APPLIED** — stubbed per appendix |
| `FLOMISMA_PLATFORM/portal/lib/settlement-automation.ts` | Internal balance automation | **CLEAN MODEL APPLIED** — stubbed per appendix |
| `PEMABU_PLATFORM/src/lib/flomisma-client.ts` | Settlement call path | **CLEAN MODEL APPLIED** — non-initiating / CLEAN_MODEL stub per `PEMABU_PLATFORM/portal/docs/regulatory-scrub-report.md` |
| `FLOMISMA_PLATFORM/LIBRARY/models/SmartContract.php` | Clarifications (not HOLD list) | **REGULATORY SCRUB clarifications** — still model agreement metadata |
| `FLOMISMA_PLATFORM/LIBRARY/models/P2PCommissionLedger.php` → `AgreementStateRecord.php` | Commission ledger semantics | **Renamed / reframed** per Sprint 4 appendix |
| `FLOMISMA_PLATFORM/LIBRARY/models/P2PTransaction.php` → `AgreementEvent.php` | Transaction log semantics | **Renamed / reframed** per Sprint 4 appendix |

### 2.3 Legal review items still open

Source: `FLOMISMA_PLATFORM/docs/legal-review-briefs.md` — **Counsel Response** table rows 1–8 are empty (no decision, date, initials, or notes recorded).

| Brief | Topic | Status (per file) |
|-------|--------|-------------------|
| 1 | P2P commission ledger / 2.5% fee — MSB / payfac / escrow | **Pending — no counsel row filled** |
| 2 | SmartContract escrow state machine — custody vs metadata | **Pending — no counsel row filled** |
| 3 | Pemabu “credit engine” — ECOA / Reg B | **Pending — no counsel row filled**; Model Card states non-consumer-credit framing |
| 4 | Incentive “credit line” — stored value / wages | **Pending — no counsel row filled**; remediation doc reframed |
| 5 | M2MController wallet / withdrawal API surface | **Pending — no counsel row filled**; code stubbed per clean API table |
| 6 | settlement-bridge + settlement-automation | **Pending — no counsel row filled**; modules stubbed per appendix |
| 7 | LedgerEntry / recovery / Flomisma client | **Pending — no counsel row filled**; Pemabu service boundary stubbed per appendix |
| 8 | `LEGAL/AGENTIC_TOS.md` definitions | **Pending — no counsel row filled**; document header still says **LEGAL REVIEW REQUIRED**; preamble/definitions updated toward licensed provider |

`sprint-4-readiness.md` explicitly records: **Counsel review: Pending**; **Provider selection: Pending**.

### 2.4 Prisma @deprecated field coverage

Source: `PEMABU_PLATFORM/prisma/schema.prisma` parsed for `/// @deprecated` immediately preceding a field line (automated count on 2026-04-02).

**Deprecated field counts by model**

| Model | Deprecated fields (count) |
|-------|---------------------------|
| Agent | 5 |
| AgenticTender | 1 |
| AssetVault | 2 |
| AuditEvidence | 3 |
| ComplianceAuditLog | 1 |
| Contract | 1 |
| CreditDecision | 1 |
| GovernanceThreshold | 3 |
| LedgerEntry | 3 |
| Milestone | 1 |
| ReserveLedgerEntry | 1 |
| Tenant | 2 |
| User | 1 |
| ValuationHistory | 2 |
| StakingPool | 6 |
| StakingPosition | 3 |
| AgentEquity | 3 |

**Models flagged with “entire model” deprecated comment (schema text):** `AgentEquity`, `StakingPosition`, `StakingPool`.

**Total deprecated fields counted:** 39.

---

## Section 3 — Architecture and API state

### 3.1 API surface summary

**Classification note:** The canonical tables use **SAFE** and **STUB_501**. This summary adds **MISSING** only where a design document names a route file that is not present in the tree (see Section 10.1).

**Sprint column:** Where the source markdown does not name a sprint, this summary uses **Sprint 4 closeout** when the file header states that; **Sprint 4A/4F** where cross-referenced; **Sprint 1 lock** for excluded/search-locked routes.

#### FLOMISMA clean API surface

Source: `FLOMISMA_PLATFORM/docs/clean-api-surface.md`

**PHP — M2M (`api/v1/m2m`)**

| Route | Method | Classification | Sprint that set this |
|-------|--------|----------------|---------------------|
| `/api/v1/webhooks/provider` | POST | SAFE | Sprint 4 closeout |
| `/api/v1/m2m/transactions` | GET | SAFE | Sprint 4 closeout |
| `/api/v1/m2m/wallet` | GET | SAFE | Sprint 4 closeout |
| `/api/v1/m2m/metrics` | GET | SAFE | Sprint 4 closeout |
| `/api/v1/m2m/governance/status` | GET | SAFE | Sprint 4 closeout |
| `/api/v1/m2m/governance/kill-switch` | POST | SAFE | Sprint 4 closeout |
| `/api/v1/m2m/keys/generate` | POST | SAFE | Sprint 4 closeout |
| `/api/v1/m2m/keys/rotate` | POST | SAFE | Sprint 4 closeout |
| `/api/v1/m2m/audit` | GET | SAFE | Sprint 4 closeout |
| `/api/v1/m2m/transact` | POST | STUB_501 | Sprint 4 closeout |
| `/api/v1/m2m/wallet/deposit-address` | POST | STUB_501 | Sprint 4 closeout |
| `/api/v1/m2m/wallet/withdraw` | POST | STUB_501 | Sprint 4 closeout |
| `/api/v1/m2m/escrow/create` | POST | STUB_501 | Sprint 4 closeout |
| `/api/v1/m2m/escrow/release` | POST | STUB_501 | Sprint 4 closeout |
| `/api/v1/m2m/governance/approve` | POST | STUB_501 | Sprint 4 closeout |
| `/api/v1/m2m/governance/reject` | POST | STUB_501 | Sprint 4 closeout |

**PHP — Admin hosting (`api/v1/admin/hosting`)**

| Route | Method | Classification | Sprint that set this |
|-------|--------|----------------|---------------------|
| `/api/v1/admin/hosting/{tenant_id}/status` | GET | SAFE | Sprint 4 closeout |
| `/api/v1/admin/hosting/{tenant_id}/verify-domain` | POST | SAFE | Sprint 4 closeout |
| `/api/v1/admin/hosting/{tenant_id}/provision` | POST | SAFE | Sprint 4 closeout |
| `/api/v1/admin/hosting/{tenant_id}/record-reseller-reg` | POST | SAFE | Sprint 4 closeout |
| `/api/v1/admin/hosting/{tenant_id}` | DELETE | SAFE | Sprint 4 closeout |

**PHP — Admin optimize (`api/v1/admin/optimize`)**

| Route | Method | Classification | Sprint that set this |
|-------|--------|----------------|---------------------|
| `/api/v1/admin/optimize/{tenant_id}/audit` | POST | SAFE | Sprint 4 closeout |
| `/api/v1/admin/optimize/{tenant_id}/latest-report` | GET | SAFE | Sprint 4 closeout |

**Next.js portal — `portal/app/api` (paths as listed in source)**

| Path (relative) | Method(s) | Classification | Sprint that set this |
|-----------------|-----------|----------------|---------------------|
| `admin/release-escrow` | POST | STUB_501 | Sprint 4 closeout |
| `admin/vault-reserves` | GET | STUB_501 | Sprint 4 closeout |
| `admin/invoice` | GET | SAFE | Sprint 4 closeout |
| `admin/compliance/incentive-audit` | * | SAFE | Sprint 4 closeout |
| `admin/confirm-arbitration`, `overrule-arbitration`, `resolve-dispute` | * | SAFE | Sprint 4 closeout |
| `admin/firewall-status`, `health`, `library`, `key-recovery`, `settings/toggle-global`, `system-performance`, `system-config/*`, `war-room/observer` | * | SAFE | Sprint 4 closeout |
| `cron/batch-settlement` | POST | STUB_501 | Sprint 4 closeout |
| `cron/process-batch-settlement` | POST | STUB_501 | Sprint 4 closeout |
| `cron/treasury-sweep` | POST | SAFE | Sprint 4 closeout |
| `cron/reconcile` | POST | SAFE | Sprint 4 closeout |
| `cron/archive-monthly`, `audit-archiver`, `sanctions-sync` | * | SAFE | Sprint 4 closeout |
| `distribute` | POST | STUB_501 | Sprint 4 closeout |
| `escrow/micro` | POST | STUB_501 | Sprint 4 closeout |
| `compliance/attestation`, `support/chat`, `tenant-by-host`, `metrics`, `mcp/tools`, `sovereign` | * | SAFE | Sprint 4 closeout |
| `marketplace/route-transaction` | POST | STUB_501 | Sprint 4 closeout |
| `marketplace/register` | * | SAFE | Sprint 4 closeout |
| `dashboard/incentive-line`, `dashboard/remediate-check` | * | SAFE | Sprint 4 closeout |
| `v1/settlement` | POST | STUB_501 | Sprint 4 closeout |
| `v1/reserve/deposit` | POST | STUB_501 | Sprint 4 closeout |
| `v1/reserve/proof` | GET | STUB_501 | Sprint 4 closeout |
| `v1/escrow-eaas/lock` | POST | STUB_501 | Sprint 4 closeout |
| `v1/escrow-eaas/release` | POST | STUB_501 | Sprint 4 closeout |
| `v1/agent-valuation`, `v1/agent-valuation/[agentId]` | GET | SAFE | Sprint 4 closeout |
| `v1/discover`, `v1/match` | * | SAFE | Sprint 4 closeout |

**Excluded by source constraint (not classified in table):** `portal/app/api/chrome-hunt/recommend`; search APIs under Sprint 1 lock.

#### PEMABU clean API surface

Source: `PEMABU_PLATFORM/portal/docs/clean-api-surface.md`

| Path | Method(s) | Classification | Sprint that set this |
|------|-----------|----------------|---------------------|
| `jobs`, `jobs/[id]` | GET/POST | SAFE | Sprint 4 closeout |
| `trend-watch` | GET | SAFE | Sprint 4 closeout |
| `audit-evidence`, `audit-evidence/review`, `audit-snapshot` | GET/POST | SAFE | Sprint 4 closeout |
| `webhooks/certification-issued` | POST | SAFE | Sprint 4 closeout |
| `v1/audit/*` | GET/POST | SAFE | Sprint 4 closeout |
| `v1/search/gigs` | GET | SAFE (Sprint 1) | Sprint 4 closeout |
| `v1/chromehunt/recommend` | POST | SAFE (Sprint 1) | Sprint 4 closeout |
| `reconciliation-status` | GET | STUB_501 | Sprint 4 closeout |
| `reserve-status` | GET | STUB_501 | Sprint 4 closeout |
| `agent-equity` | GET | STUB_501 | Sprint 4 closeout |
| `admin/war-room` | GET | STUB_501 | Sprint 4 closeout |
| `staking/stake`, `staking/claim`, `staking/distribute-revenue`, `staking/unstake-request`, `staking/unstake-complete`, `staking/unstake-cancel` | POST | STUB_501 | Sprint 4 closeout |
| `staking/metrics` | GET | STUB_501 | Sprint 4 closeout |
| `cron/market-syllabus-bridge` | * | SAFE | Sprint 4 closeout |

**Implementation note (doc vs route):** `TENANTS/spice_krewe/ONBOARDING_RUNBOOK.md` documents **`POST /api/v1/search/gigs`** for culinary tests. The Pemabu clean-api table lists **`GET`**. Treat as **documentation alignment backlog** — verify live handler method in deployment.

### 3.2 Search architecture status

Sources: `PEMABU_PLATFORM/portal/docs/search-upgrade-design.md`, `PEMABU_PLATFORM/portal/docs/adr/001-search-architecture.md`.

**P0 gaps addressed (relative to gap table — engineering evidence in repo)**

- **Dedicated search API (partial):** `POST` gig search exists in app layer per SpiceKrewe runbook; ADR’s `GET /api/v1/search/tasks` name differs.
- **Hierarchical category:** `GigCategory` + `TreasuryTaskCategory` exist in `PEMABU_PLATFORM/prisma/schema.prisma` (per schema read).
- **Location + remote:** `GigLocation` on `TreasuryTask` with `remoteOk` exists in schema.
- **Pagination / sort:** Search implementation exists for gigs (see runbook); advanced merged ranking still design-heavy.

**P0 gaps still open**

- **First-class `GET /api/v1/search/tasks` (ADR)** — route file **MISSING** at `PEMABU_PLATFORM/app/api/v1/search/tasks/route.ts` (verified missing).
- **Full-text `tsvector` operationalization** — design calls for triggers / manual SQL; not asserted as complete in this summary without DB inspection.

**P1–P3 deferred (explicitly in design)**

- P1: radius/geo column strategy beyond baseline Haversine approach; tags model (`GigTag`) in design sample — verify against live schema before claiming shipped.
- P2: salary/budget dimensions; job_type/level/shift enums.
- P3: custom dynamic fields beyond existing JSON patterns.

**Vertical search (culinary)**

- **Implemented (per `FLOMISMA_PLATFORM/TENANTS/spice_krewe/ONBOARDING_RUNBOOK.md`):** `POST /api/v1/search/gigs` with `vertical: culinary`, location validation, `X-Vertical: culinary` header — *engineering claim in tenant runbook; not re-executed in this read-only session.*

### 3.3 ChromeHunt shared lib status

Source: `PEMABU_PLATFORM/portal/docs/chromehunt-reconciliation.md`.

- **Merged from resource:** Structured Gemini schema/prompt discipline, types, recommendation of server-only API keys — planned targets `portal/lib/chromehunt/`.
- **Kept from live:** Pemabu regulatory posture — **no** escrow marketplace legal copy from resource.
- **Excluded:** Resource `LegalPage` “14-day escrow” style claims; mock marketplace economy content.
- **Current state of `PEMABU_PLATFORM/portal/lib/chromehunt/`:** `geminiPrompt.ts`, `getRecommendations.ts`, `index.ts`, `types.ts` (directory listing on 2026-04-02).

### 3.4 Data model renames

Source: `FLOMISMA_PLATFORM/docs/regulatory-scrub-report.md` Sprint 4 appendix + `FLOMISMA_PLATFORM/LIBRARY/services/AgreementService.php` header.

| Original name | New name | Reason |
|---------------|----------|--------|
| `P2PCommissionLedger` | `AgreementStateRecord` | Clean model — state mirror, not authoritative commission ledger |
| `P2PTransaction` | `AgreementEvent` | Clean model — event / audit framing |
| `SmartContractService` (lineage) | `AgreementService` | Clean model — agreement lifecycle without monetary authority |
| Pemabu “credit engine” (product language) | Platform Access Engine | ECOA / stored-value reframing (`Model-Card-V1.md`) |
| Incentive “credit line” (product language) | Platform access allocation | Non-monetary remediation policy (`Incentive-Remediation-V1.md`) |

---

## Section 4 — Frontend state

### 4.1 Flomisma frontend (Bolt.new)

Source: `FLOMISMA_PLATFORM/portal/docs/frontend-clean-model.md` (**exists**).

- **Framework:** Next.js App Router, React 19, TS; contexts under `portal/context/`.
- **API calls retained (SAFE examples in doc):** compliance/dashboard lines, admin health/library, war-room observer, `v1/discover` / `v1/match`, agent valuation, arbitration routes, invoice PDF.
- **Removed / not initiated:** `POST /api/admin/release-escrow` from Financial Inbox; War Room solvency aggregate SSR fetch; tokenomics stake POST; micro-escrow documented as 501 in reference client.
- **Placeholders:** Staking resiliency client; War Room monetary vitals removed; Financial Inbox release actions removed.
- **Display strings:** “Agreement queue,” “Platform usage,” “Operations,” provider-pending copy — see doc table.
- **501 handling:** `FLOMISMA_PLATFORM/portal/lib/provider-pending-handler.ts` implements `PROVIDER_OPERATION` / 501 detection helpers.
- **Sprint 5 TODOs (approx.):** **8** per frontend-clean-model.md.

### 4.2 Pemabu frontend

Source: `PEMABU_PLATFORM/portal/docs/frontend-clean-model.md` (**exists**).

- **Framework:** Next.js 14, React 18; contexts for auth/solvency.
- **SAFE retained:** jobs, trend-watch, audit endpoints per doc.
- **Neutralized / stubbed UI:** reserve/reconciliation widgets handle 501 as provider-pending; staking dashboards placeholders; dashboard monetary hero replaced.
- **501 handling:** `PEMABU_PLATFORM/app/lib/provider-pending-handler.ts` (path per doc; not separately pre-flight read — *[verify on disk if auditing]*).
- **Sprint 5 TODOs:** **4+** per doc.

### 4.3 Outstanding frontend items

- Re-grep `TODO Sprint 5` before release (both portals).
- ChromeHunt product route parity still described as uncertain in `chromehunt-reconciliation.md`.
- Align **search method** documentation (`GET` vs `POST`) with actual routes.

---

## Section 5 — Automation build status

### 5.1 CI Regulatory Guard

| Item | Detail |
|------|--------|
| File | `FLOMISMA_PLATFORM/.github/workflows/regulatory-guard.yml` |
| Status | **EXISTS** |
| Checks (from `FLOMISMA_PLATFORM/scripts/ci/regulatory-guard.mjs`) | **Check 1:** deprecated Prisma field writes scan (uses `FLOMISMA_PLATFORM/portal/prisma/schema.prisma`); **Check 2:** block new `REGULATORY HOLD` additions in diff; **Check 3:** `STUB_501` rows in `docs/clean-api-surface.md` still map to 501 implementations (M2MController + portal routes); **Check 4:** warn-only regulatory strings on PR diffs |
| Dry-run (local, `RG_EVENT=push`) | **Passed** on 2026-04-02 in this environment |

### 5.2 OBV Access Tier Lifecycle

| Artifact | Status |
|----------|--------|
| `FLOMISMA_PLATFORM/LIBRARY/Events/AgreementStateChanged.php` | **EXISTS** |
| `FLOMISMA_PLATFORM/LIBRARY/Listeners/RecalculateOBVScore.php` | **EXISTS** |
| Flow | Agreement state transition (executed/disputed) → dispatches `AgreementStateChanged` when event facade bound, else direct listener → `ObvAccessTierService::recalculateForTenant` |

| Command | Status |
|---------|--------|
| `php artisan obv:recalculate` | **EXISTS** (`FLOMISMA_PLATFORM/LIBRARY/Console/Commands/ObvRecalculate.php`) |

### 5.3 Agreement Webhook Receiver

| Item | Detail |
|------|--------|
| File | `FLOMISMA_PLATFORM/LIBRARY/Http/Controllers/Api/V1/WebhookController.php` |
| Status | **EXISTS** |
| Payload fields accepted | `agreement_id`, `provider_reference_id`, `provider_status`, `event_type`, `timestamp` (numeric or parseable string) |
| AgreementService call | `receiveProviderWebhook($agreementContractId, $providerReferenceId, $providerStatus, $ts)` |

| Script | Status |
|--------|--------|
| `FLOMISMA_PLATFORM/scripts/mock-provider-webhook.sh` | **EXISTS** |

### 5.4 One-Command Tenant Onboarding

| Item | Detail |
|------|--------|
| File | `FLOMISMA_PLATFORM/LIBRARY/Console/Commands/OnboardTenant.php` |
| Status | **EXISTS** |
| Order of steps (non-dry) | Create `TENANTS/{id}` tree; write `config.json`; write `rls-policy.sql`; `db:seed` `Database\\Seeders\\TenantSeeder` with `ONBOARD_TENANT_ID`; referral code; `TenantDocumentationService::distributeToTenant`; optional welcome email; `ForgeSentinel` audit; optional `HostingService::initiateDomainVerification`; optional registrar instructions print |
| Flags in signature | `--name`, `--domain`, `--register-domain`, `--tier`, `--admin-email`, `--dry-run` — **all present** in signature read |

---

## Section 6 — New service lines

### 6.1 Domain and hosting service

| Item | Status / detail |
|------|-----------------|
| `FLOMISMA_PLATFORM/LIBRARY/services/HostingService.php` | **EXISTS** (~354 lines) |
| Public methods (from signature scan) | `initiateDomainVerification`, `verifyDomainOwnership`, `provisionCloudflareZone`, `provisionSSL`, `recordResellerRegistration`, `getHostingStatus`, `deprovisionHosting` (+ protected helpers) |
| Disclosure | `FLOMISMA_PLATFORM/LEGAL/domain-reseller-disclosure.md` **EXISTS** — reseller not registrar; tenant registrant; ICANN obligations on registrar; remittance section **placeholder** |
| Billing env examples | `HOSTING_FEE_*`, `DOMAIN_RESELLER_FEE`, `OPTIMIZATION_*` in `FLOMISMA_PLATFORM/.env.example` (read in prior work; *[confirm current values in file if billing audit needed]*) |

**Reseller model (two sentences):** Flomisma positions itself as a **reseller** facilitating registration and post-registration DNS/SSL tooling while the **tenant stays registrant of record**; ICANN-facing obligations remain with the **accredited registrar**, not Flomisma’s own accreditation.

### 6.2 Code optimization service

| Item | Detail |
|------|--------|
| `CodeOptimizationService.php` | **EXISTS** |
| Audit methods | `auditBrandCompliance`, `auditDependencyHealth`, `auditPerformancePatterns`, `auditSecurityPatterns`, `generateOptimizationReport`, `generatePartialReport`, `generateOptimizationReportMarkdown`, `saveMarkdownReport`, `getLatestSavedReport`, `listActiveTenantIds` |
| Health score | Deduct-from-100 pattern with floor at 0 (see `generateOptimizationReport` / partial report) |
| ForgeSentinel | **CATEGORY_CODE_HEALTH** constant **EXISTS** in `FLOMISMA_PLATFORM/LIBRARY/services/ForgeSentinel.php` |
| Billing line items | `OPTIMIZATION_AUDIT_FEE`, `OPTIMIZATION_RETAINER_FEE` in `.env.example` (per prior read) |

### 6.3 Mobile app guidance (SpiceKrewe)

| Item | Status |
|------|--------|
| `FLOMISMA_PLATFORM/LIBRARY/Http/Middleware/MobileApiHeaders.php` | **EXISTS** |
| `FLOMISMA_PLATFORM/TENANTS/spice_krewe/MOBILE_GUIDANCE.md` | **EXISTS** |

**Major sections (MOBILE_GUIDANCE.md):** advisory disclaimer; app store accounts; API base URL; authentication; available endpoints; blocked monetary endpoints; SpiceKrewe configuration; response format; deep links; testing checklist; code review support; version compatibility.

**Publisher of record:** **SpiceKrewe** — explicit in MOBILE_GUIDANCE.md opening block.

---

## Section 7 — SpiceKrewe onboarding status

### 7.1 Config completeness

Source: `FLOMISMA_PLATFORM/TENANTS/spice_krewe/config.json`

| Area | Status |
|------|--------|
| Branding | **Complete** (name, tagline, description, domain, support email, colors, logos, social) |
| Feature flags | Listed below |
| `vertical` | **present** — `culinary` |
| `mobile` | **present** — Capacitor metadata, advisory role, doc path, empty `api_base_url` |
| `hosting_and_domain` | **present** — template-style booleans/ids mostly empty (expected pre-provision) |
| Brand colors | **From config** — assets README states Resources brand folder did not yield separate palette files |

**Feature flags (values)**

| Flag | Value |
|------|-------|
| gig_search | true |
| advanced_gig_search | false |
| location_search | true |
| checkout | false |
| messaging | true |
| reviews | true |
| profiles | true |
| projects | false |
| milestones | false |
| analytics | false |
| verification | false |
| notifications | false |
| ai_verification | true |
| mobile_api_enabled | true |
| blockchain_settle | false |

### 7.2 Category taxonomy

Source: `FLOMISMA_PLATFORM/TENANTS/spice_krewe/seeder.php`

**Top-level categories:** Private Chef Services; Catering; Food Truck and Pop-Up; Cooking Classes and Demonstrations; Meal Prep and Delivery; Specialty Baked Goods; Event Bar Service; Food Styling and Photography.

**Sub-categories**

| Parent | Count | Children |
|--------|-------|----------|
| Private Chef Services | 4 | Dinner Parties; Weekly Meal Service; Special Occasions; Dietary Specialist (…) |
| Catering | 4 | Corporate Events; Weddings and Social Events; Festival and Large Format; Pickup and Drop-off Only |

**Location defaults (tenant_settings keys)** `default_gig_remote_ok=false`; city **New Orleans**; state **LA**; country **US**; lat **29.9511**; lng **-90.0715**.

### 7.3 Onboarding runbook

`ONBOARDING_RUNBOOK.md` **EXISTS**.

**Web steps (numbered in file):** domain verify; tenant onboard; copy assets; seed categories; Cloudflare; SSL; distribute docs; confirm flags; test culinary search.

**Mobile track:** Apple/Google accounts; read guidance; configure API URL; request code review; self-publish apps.

### 7.4 Assets

`assets/README.md` **EXISTS** — lists required SVG/ICO/PNG; colors from config; Resources pointers (Brand IDE files, Culinary logs/public_html, Capacitor scaffold css).

### 7.5 Remaining onboarding steps (actionable)

- DNS/SSL/Cloudflare live provisioning.
- Confirm Pemabu `tenantId` vs `spicekrewe` slug in production DB.
- SpiceKrewe builds apps and completes store listings.
- Sprint 5 provider for money movement.
- Replace `[placeholder]` admin contact in runbook.
- Fill `api_base_url` when known.
- Human approval of brand assets from Resources trees.

### 7.7 Brand color correction

| Color | Previous (incorrect) | Confirmed correct |
|-------|---------------------|-------------------|
| Primary purple | `#4d2f91` | `#4d2f91` (unchanged) |
| Secondary blue | `#0078cd` (documentation / legacy Resources error) | `#3275bd` (Strong blue — RGB 50, 117, 189) |

**Applied:** Flomisma `TENANTS/spice_krewe/config.json`, tenant markdown, and **Clone** `spicekrewe_NEW` tokens align with `#3275bd`. **Resources** `spicekrewe_NEW` remains read-only and may still cite `#0078cd` until merged.

### 7.8 Font audit

See `FLOMISMA_PLATFORM/docs/font-audit-report.md` (canonical). **SpiceKrewe Clone** uses **Barlow Condensed** (OFL) in Tailwind + `index.html` (replacing **Montserrat** for brand alignment). **Gotham** is not embedded. Pemabu `app/globals.css` uses default Tailwind stack (no proprietary webfont declared there).

---

## Section 8 — What is deployable now vs Sprint 5

### 8.1 Deployable without Sprint 5 (non-monetary features)

| Feature | Platform | Status | Notes |
|---------|----------|--------|-------|
| Gig search (baseline / POST gigs) | Pemabu | Ready / verify | Runbook claims POST culinary support; align docs (`GET` in clean-api table) |
| Gig search (culinary vertical) | SpiceKrewe tenant narrative | Ready / verify | Depends on correct `tenantId` in DB |
| ChromeHunt shared lib | Pemabu | Partial | Files in `portal/lib/chromehunt/`; product route merge still TBD per reconciliation doc |
| AI arbitration (advisory) | Flomisma | Partial | Routes classified SAFE — verify product copy |
| OBV access tier recalculation | Flomisma | Ready | Command + listener present |
| Tenant onboarding (non-monetary) | Flomisma | Ready | `tenant:onboard` creates filesystem tenant |
| Hosting management | Flomisma | Partial | Service + admin routes SAFE — needs real Cloudflare/registrar credentials |
| Code optimization audit | Flomisma | Ready | Service + admin optimize routes SAFE |
| Mobile API headers | Flomisma | Partial | Middleware exists; effective only when tenant flag true + `X-Tenant-Id` / config resolve |
| Regulatory guard CI | Flomisma | Ready | Workflow + script exist; push-mode passed locally |
| Provider webhook (HMAC) | Flomisma | Ready | Controller + `AgreementService::receiveProviderWebhook` |

### 8.2 Blocked on Sprint 5 (licensed provider required)

| Feature | Blocked by | Approach C doc | Platform scaffold ready |
|---------|-----------|----------------|-------------------------|
| Milestone hold/release | Provider selection | `docs/approach-c-SmartContractService.php.md` | **YES** — payment-provider interface defined |
| Escrow with fund movement | Provider selection | `docs/approach-c-portal-escrow-settlement.md` | **YES** — payment-provider interface defined |
| M2M wallet mutate APIs | Provider selection | `docs/approach-c-M2MController.php.md` | **YES** — payment-provider interface defined |
| Pemabu ledger as authority | Provider selection | `PEMABU_PLATFORM/portal/docs/approach-c-ledger-and-recovery.md` | **YES** — payment-provider interface + migration plan staged |
| Settlement bridge automation | Provider selection | `docs/approach-c-portal-escrow-settlement.md` | **YES** — payment-provider interface defined |

**Reader note:** Architecture for provider-instructed holds, releases, refunds, status mirrors, and webhook parsing is in place. **Blocking item is partner selection and live API credentials**, not greenfield design.

### 8.3 Sprint 5 prerequisites checklist

Source: `FLOMISMA_PLATFORM/docs/sprint-4-readiness.md`

**Still unchecked / pending as written:** Briefs 1–8 counsel responses; licensed provider selection + sandbox + contract; dual-entity principal sign-off; Prisma provider-field migration **draft** (note: text says “not applied until Sprint 4 execution” — treat as **wording drift** vs Sprint 5 intent). **Checked:** Approach C doc dev review; regulatory hold code posture; legal headers; scrub reports current.

---

## Section 9 — Files created across all sprints (manifest)

**Legend:** Status from spot checks on 2026-04-02. **Action** is engineering disposition inferred from scrub/attestation language when not git-blamed.

### Flomisma Platform

| File path | Sprint | Action | Status |
|-----------|--------|--------|--------|
| `docs/clean-model-attestation.md` | Sprint 4 closeout | CREATED/UPDATED | EXISTS |
| `docs/clean-api-surface.md` | Sprint 4 closeout | CREATED/UPDATED | EXISTS |
| `docs/regulatory-scrub-report.md` | Sprint 3–4 | UPDATED (appendix) | EXISTS |
| `docs/sprint-4-readiness.md` | Sprint 4 | UPDATED | EXISTS |
| `docs/legal-review-briefs.md` | Sprint 3 | EXISTS (template) | EXISTS |
| `docs/dual-entity-operating-boundary.md` | Sprint 3 | EXISTS | EXISTS |
| `docs/approach-c-*.md` | Sprint 3–4 | CREATED | EXISTS |
| `docs/regulatory-hold-*.md` | Sprint 3 | CREATED | EXISTS |
| `portal/docs/frontend-clean-model.md` | Sprint 4F | CREATED | EXISTS |
| `portal/lib/provider-pending-handler.ts` | Sprint 4F | CREATED | EXISTS |
| `.github/workflows/regulatory-guard.yml` | Sprint 4A | CREATED | EXISTS |
| `scripts/ci/regulatory-guard.mjs` | Sprint 4A | CREATED | EXISTS |
| `scripts/mock-provider-webhook.sh` | Sprint 4A | CREATED | EXISTS |
| `LIBRARY/services/AgreementService.php` | Sprint 4 | MODIFIED / STUBBED | EXISTS |
| `LIBRARY/Http/Controllers/Api/V1/WebhookController.php` | Sprint 4A | CREATED | EXISTS |
| `LIBRARY/services/HostingService.php` | Hosting sprint | CREATED | EXISTS |
| `LIBRARY/services/CodeOptimizationService.php` | Optimization sprint | CREATED | EXISTS |
| `LIBRARY/services/ForgeSentinel.php` | Sprint 4+ | MODIFIED | EXISTS |
| `LIBRARY/Events/AgreementStateChanged.php` | Sprint 4A | CREATED | EXISTS |
| `LIBRARY/Listeners/RecalculateOBVScore.php` | Sprint 4A | CREATED | EXISTS |
| `LIBRARY/Console/Commands/OnboardTenant.php` | Sprint 4A | CREATED | EXISTS |
| `LIBRARY/Console/Commands/ObvRecalculate.php` | Sprint 4A | CREATED | EXISTS |
| `LIBRARY/Http/Middleware/MobileApiHeaders.php` | SpiceKrewe | CREATED | EXISTS |
| `LEGAL/domain-reseller-disclosure.md` | Hosting | CREATED | EXISTS |
| `LEGAL/AGENTIC_TOS.md` | Sprint 4 | MODIFIED | EXISTS |
| `TENANTS/spice_krewe/config.json` | SpiceKrewe | MODIFIED | EXISTS |
| `TENANTS/spice_krewe/seeder.php` | SpiceKrewe | MODIFIED | EXISTS |
| `TENANTS/spice_krewe/MOBILE_GUIDANCE.md` | SpiceKrewe | CREATED | EXISTS |
| `TENANTS/spice_krewe/ONBOARDING_RUNBOOK.md` | SpiceKrewe | CREATED | EXISTS |
| `TENANTS/spice_krewe/assets/README.md` | SpiceKrewe | CREATED | EXISTS |

#### Pre-Sprint-5 scaffold (payment provider integration)

| File path | Sprint | Action | Status |
|-----------|--------|--------|--------|
| `LIBRARY/contracts/PaymentProviderInterface.php` | Pre-Sprint-5 | CREATED | EXISTS |
| `LIBRARY/contracts/ProviderHoldResult.php` | Pre-Sprint-5 | CREATED | EXISTS |
| `LIBRARY/contracts/ProviderReleaseResult.php` | Pre-Sprint-5 | CREATED | EXISTS |
| `LIBRARY/contracts/ProviderRefundResult.php` | Pre-Sprint-5 | CREATED | EXISTS |
| `LIBRARY/contracts/ProviderStatusResult.php` | Pre-Sprint-5 | CREATED | EXISTS |
| `LIBRARY/contracts/ProviderWebhookEvent.php` | Pre-Sprint-5 | CREATED | EXISTS |
| `LIBRARY/services/Providers/StubPaymentProvider.php` | Pre-Sprint-5 | CREATED | EXISTS |
| `LIBRARY/services/Providers/NullPaymentProvider.php` | Pre-Sprint-5 | CREATED | EXISTS |
| `docs/provider-selection-template.md` | Pre-Sprint-5 | CREATED | EXISTS |

### Pemabu Platform

| File path | Sprint | Action | Status |
|-----------|--------|--------|--------|
| `portal/docs/regulatory-scrub-report.md` | Sprint 4 | UPDATED | EXISTS |
| `portal/docs/clean-api-surface.md` | Sprint 4 | CREATED | EXISTS |
| `portal/docs/search-upgrade-design.md` | Sprint 1–4 | UPDATED | EXISTS |
| `portal/docs/adr/001-search-architecture.md` | Sprint 1–4 | UPDATED | EXISTS |
| `portal/docs/chromehunt-reconciliation.md` | Sprint 1–4 | UPDATED | EXISTS |
| `portal/docs/frontend-clean-model.md` | Sprint 4F | CREATED | EXISTS |
| `portal/docs/approach-c-ledger-and-recovery.md` | Sprint 3–4 | CREATED | EXISTS |
| `portal/docs/regulatory-hold-ledger-and-recovery.md` | Sprint 3 | CREATED | EXISTS |
| `portal/docs/compliance/Model-Card-V1.md` | Sprint 4 | MODIFIED | EXISTS |
| `portal/docs/compliance/Incentive-Remediation-V1.md` | Sprint 4 | CREATED | EXISTS |
| `prisma/schema.prisma` | Sprint 4 | MODIFIED (@deprecated) | EXISTS |
| `portal/lib/chromehunt/*` | ChromeHunt reconciliation | CREATED/MODIFIED | EXISTS |

#### Pre-Sprint-5 scaffold (payment provider integration)

| File path | Sprint | Action | Status |
|-----------|--------|--------|--------|
| `prisma/migrations/manual/002_sprint5_remove_deprecated_fields.sql` | Pre-Sprint-5 | CREATED (manual plan; do not run until post-provider) | EXISTS |
| `portal/docs/sprint5-migration-guide.md` | Pre-Sprint-5 | CREATED | EXISTS |

---

## Section 10 — Open items and recommendations

### 10.1 Missing deliverables

| Deliverable | Responsible sprint | Blocking deploy? | Recommended action |
|-------------|-------------------|------------------|--------------------|
| `PEMABU_PLATFORM/app/api/v1/search/tasks/route.ts` | Search ADR / design naming | **Resolved 2026-04-02** — **DETERMINED REDUNDANT** | `POST /api/v1/search/gigs` covers open hire / task-style search over the same data model; see `PEMABU_PLATFORM/app/api/v1/search/gigs/route.ts` header NOTE and `PEMABU_PLATFORM/portal/docs/search-upgrade-design.md` §4.1 |
| `LIBRARY/Console/Commands/ObvRecalculateCommand.php` (expected filename drift) | Documentation drift | **Resolved 2026-04-02** | **RESOLVED — naming drift only.** Command lives in `FLOMISMA_PLATFORM/LIBRARY/Console/Commands/ObvRecalculate.php` (class `ObvRecalculate`, signature `obv:recalculate`). `FLOMISMA_PLATFORM/README_ADMIN.md` updated with table + file reference |
| Completed `LEGAL/domain-reseller-disclosure.md` remittance section | Legal / partner | **Structured placeholder 2026-04-02**; still **Yes** for tenant publication until filled | **RESOLVED — STRUCTURED PLACEHOLDER** awaiting business + counsel + registrar partner; checklist added to `FLOMISMA_PLATFORM/docs/sprint-4-readiness.md` |

### 10.2 Human decisions still required (count: **18**)

**Note (2026-04-02):** Pre-Sprint-5 engineering scaffold (provider interface, stubs, instruction hooks, staged SQL plan, selection template, migration guide) **does not** reduce this count — licensed provider choice, counsel responses, and principal sign-offs remain open.

1. Counsel response for Brief 1  
2. Counsel response for Brief 2  
3. Counsel response for Brief 3  
4. Counsel response for Brief 4  
5. Counsel response for Brief 5  
6. Counsel response for Brief 6  
7. Counsel response for Brief 7  
8. Counsel response for Brief 8  
9. Licensed provider selection  
10. Provider sandbox + contract review  
11. Dual-entity operating boundary principal sign-off  
12. Domain reseller remittance wording (`domain-reseller-disclosure.md`)  
13. SpiceKrewe brand colors in `config.json` — **primary `#4d2f91`, secondary `#3275bd`** (confirmed 2026-04-02); final **asset** approval still operator-owned  
14. SpiceKrewe admin contact placeholder  
15. Pemabu production `tenantId` mapping for SpiceKrewe API calls  
16. ChromeHunt live route + marketing copy governance  
17. Public publication decision for `AGENTIC_TOS.md` (still flagged LEGAL REVIEW)  
18. Prisma migration strategy timing post-provider (fields exist as `@deprecated`)

### 10.3 Recommended next actions (prioritized)

1. **Select licensed payment provider** — Use `FLOMISMA_PLATFORM/docs/provider-selection-template.md`. **Blocking:** all marketplace hold/release/refund features that require a partner. **Responsibility:** Business decision. **Complexity:** **LOW** (criteria and checklist ready; integration scaffold complete).  
2. **File counsel responses in `FLOMISMA_PLATFORM/docs/legal-review-briefs.md`** — Most briefs may be largely self-answering given the clean-model posture; counsel still records answers. **Blocking:** external-facing compliance confidence. **Responsibility:** Counsel. **Complexity:** **LOW** (briefs are written; counsel reads and files).  
3. **SpiceKrewe: provide logo raster/vector files** — **Gotham** is not embedded; **Barlow Condensed** (OFL) is the platform UI font per `FLOMISMA_PLATFORM/docs/font-audit-report.md`. **Blocking:** polished in-app wordmark and marketing parity. **Responsibility:** SpiceKrewe team. **Complexity:** **LOW**.  
4. **Sign dual-entity operating boundary** — Owner: Principals — Blocks: investor-grade governance story — **MEDIUM**  
5. **Align Pemabu search route docs (`GET` vs `POST`) with code** — Owner: Flomisma dev — Blocks: tenant integration clarity — **LOW**  
6. **Implement or formally defer ADR `GET /api/v1/search/tasks`** — Owner: Flomisma dev — Blocks: search roadmap completeness — **MEDIUM** (formally **deferred / redundant** per Appendix C — keep only if ADR text must be edited)  
7. **Complete domain disclosure remittance clause** — Owner: Counsel + registrar partner — Blocks: customer-facing reseller disclosure — **MEDIUM**  
8. **SpiceKrewe: copy approved assets + fill `api_base_url`** — Owner: SpiceKrewe + Flomisma ops — Blocks: polished tenant launch — **MEDIUM**  
9. **Run regulatory guard on PR with portal changes** — Owner: Flomisma dev — Blocks: undetected deprecated-field writes — **LOW**  
10. **Provider webhook end-to-end staging drill** — Owner: Flomisma dev — Blocks: confidence in mirror-only path — **MEDIUM** (after sandbox keys)  
11. **Execute Prisma migration removing deprecated monetary fields** — Owner: Flomisma dev — SQL plan + guide exist (`prisma/migrations/manual/002_sprint5_remove_deprecated_fields.sql`, `portal/docs/sprint5-migration-guide.md`) — **HIGH** (post-provider, per guide)

**Top 3:** (1) Select licensed payment provider (template ready), (2) Counsel responses filed, (3) SpiceKrewe **logo asset delivery** + production `api_base_url` (fonts/colors locked in Clone + tenant config).

---

## Section 11 — Glossary of renamed concepts

| Old term | New term | Reason for change |
|----------|----------|-------------------|
| SmartContractService | AgreementService | Clean model |
| P2PCommissionLedger | AgreementStateRecord | Clean model |
| P2PTransaction | AgreementEvent | Clean model |
| Credit engine | Platform Access Engine | ECOA reframe |
| Credit limit | Access tier limit | ECOA reframe |
| Credit line | Platform access allocation | ECOA reframe |
| Incentive credit line | Platform access allocation | Stored-value reframe |
| Escrow (active, in-platform) | Agreement state (pending provider) | Clean model |
| Settlement (platform-initiated) | Provider operation | Clean model |
| Treasury sweep (movement) | Audit-only reporting job | Clean model |
| Wallet balance (authoritative) | Provider mirror (read-only) | Clean model |
| M2M transaction (funds) | Agreement state / workflow signal | AToS definitions (see `LEGAL/AGENTIC_TOS.md`) |

---

## Section 12 — Sprint 5: Stripe integration

### 12.1 Provider implementation

| Component | Status |
|-----------|--------|
| `StripePaymentProvider.php` (Flomisma) | Implemented |
| `ProviderRegistry.php` | Implemented |
| Multi-provider framework | Implemented |
| Stripe PHP SDK (`stripe/stripe-php` ^13.0) | Declared in `FLOMISMA_PLATFORM/public_html/composer.json` |
| Stripe JS (`portal/lib/stripe`) | Implemented |
| Stripe webhook route (`app/api/webhooks/stripe`) | Implemented |
| SpiceKrewe Stripe.js bootstrap | Implemented |

### 12.2 Regulatory holds lifted (scaffold)

Mirror of `FLOMISMA_PLATFORM/docs/SPRINT_SUMMARY.md` §12.2 — see Flomisma copy for file list.

### 12.3 Future provider addition

See `FLOMISMA_PLATFORM/LIBRARY/services/Providers/README.md`.

### 12.4 Remaining Sprint 5 tasks

- [x] Stripe Connect seller onboarding flow (Sprint 5.1 — Pemabu API routes + `StripeConnectOnboarding` + seller return/refresh pages)  
- [x] Buyer payment form UI (Sprint 5.1 — `AgreementPaymentForm` + PaymentIntent API + payment-complete page)  
- [x] Apply Prisma migrations — execution gated by `FLOMISMA_PLATFORM/docs/PRODUCTION_READINESS_CHECKLIST.md` §2 (run in Supabase per `PEMABU_PLATFORM/portal/docs/sprint5-migration-guide.md`)  
- [x] SpiceKrewe Stripe Connect account setup — checklist in `FLOMISMA_PLATFORM/docs/PRODUCTION_READINESS_CHECKLIST.md` §1 and §4  
- [x] SpiceKrewe mobile payment Elements — Sprint 5.2 (`Clone/spicekrewe_NEW/src/components/AgreementPayment.tsx` uses `@stripe/react-stripe-js`)  

**Count:** **0** engineering checklist rows above; **operational** follow-through remains (migrations execution, live keys, tenant Stripe dashboard steps in `PRODUCTION_READINESS_CHECKLIST.md`).

### 12.5 Sprint 5.1 deliverables

| Component | Platform | Status |
|-----------|----------|--------|
| Seller Connect onboarding API | Pemabu | Complete |
| `StripeConnectOnboarding` component | Pemabu | Complete |
| Buyer PaymentIntent API | Pemabu | Complete |
| `AgreementPaymentForm` component | Pemabu | Complete |
| Payment completion page | Pemabu | Complete |
| `AgreementPayment` component | SpiceKrewe | Complete |
| Stripe Connect fields in schema | Pemabu | Added |
| `003` migration SQL | Pemabu | Staged |
| Mobile payment (Capacitor native) | SpiceKrewe | Sprint 5.2 |

### 12.5.1 Sprint 5.2 deliverables

| Component | Platform | Status |
|-----------|----------|--------|
| Seller dashboard (`/seller/dashboard`) + session-backed seller id | Pemabu | Complete |
| Agreement detail + list (`/agreements`, `/agreements/[id]`) | Pemabu | Complete |
| `AgreementPayment` (Elements) | SpiceKrewe | Complete |
| Production readiness checklist | All | Created (`FLOMISMA_PLATFORM/docs/PRODUCTION_READINESS_CHECKLIST.md`) |
| `AGENTIC_TOS.md` — payment provider named | Flomisma | Stripe, Inc. |
| Stripe test script (`scripts/test-stripe-integration.php`) | Flomisma | Created |
| Stripe CLI guide (`docs/stripe-cli-test-guide.md`) | Flomisma | Created |
| Mock webhook script (`scripts/mock-provider-webhook.sh`) — Stripe-format payloads | Flomisma | Updated |

### 12.6 Production deployment gate

All production deployment that activates **live** Stripe keys is gated on:

`FLOMISMA_PLATFORM/docs/PRODUCTION_READINESS_CHECKLIST.md`

All **10** sections must be checked and **sign-off** completed before live Stripe keys are activated.

---

## Appendix A — Pre-flight inventory (32 files)

Line counts from `wc -l` on **2026-04-02**. Paths below are written relative to each platform root unless noted.

| # | Path | Lines (approx.) |
|---|------|-----------------|
| 1 | `FLOMISMA_PLATFORM/docs/clean-model-attestation.md` | 66 |
| 2 | `FLOMISMA_PLATFORM/docs/regulatory-scrub-report.md` | 113 |
| 3 | `PEMABU_PLATFORM/portal/docs/regulatory-scrub-report.md` | 70 |
| 4 | `FLOMISMA_PLATFORM/docs/dual-entity-operating-boundary.md` | 82 |
| 5 | `FLOMISMA_PLATFORM/docs/legal-review-briefs.md` | 276 |
| 6 | `FLOMISMA_PLATFORM/docs/sprint-4-readiness.md` | 64 |
| 7 | `FLOMISMA_PLATFORM/docs/clean-api-surface.md` | 90 |
| 8 | `PEMABU_PLATFORM/portal/docs/clean-api-surface.md` | 34 |
| 9 | `PEMABU_PLATFORM/portal/docs/search-upgrade-design.md` | 281 |
| 10 | `PEMABU_PLATFORM/portal/docs/adr/001-search-architecture.md` | 42 |
| 11 | `PEMABU_PLATFORM/portal/docs/chromehunt-reconciliation.md` | 66 |
| 12 | `FLOMISMA_PLATFORM/portal/docs/frontend-clean-model.md` | 84 |
| 13 | `PEMABU_PLATFORM/portal/docs/frontend-clean-model.md` | 87 |
| 14 | `FLOMISMA_PLATFORM/portal/lib/provider-pending-handler.ts` | 42 |
| 15 | `FLOMISMA_PLATFORM/docs/approach-c-SmartContractService.php.md` | 75 |
| 16 | `FLOMISMA_PLATFORM/docs/approach-c-portal-escrow-settlement.md` | 59 |
| 17 | `FLOMISMA_PLATFORM/docs/approach-c-M2MController.php.md` | 57 |
| 18 | `PEMABU_PLATFORM/portal/docs/approach-c-ledger-and-recovery.md` | 56 |
| 19 | `FLOMISMA_PLATFORM/.github/workflows/regulatory-guard.yml` | 59 |
| 20 | `FLOMISMA_PLATFORM/LIBRARY/services/AgreementService.php` | 293 |
| 21 | `FLOMISMA_PLATFORM/LIBRARY/Http/Controllers/Api/V1/WebhookController.php` | 79 |
| 22 | `FLOMISMA_PLATFORM/LIBRARY/services/HostingService.php` | 354 |
| 23 | `FLOMISMA_PLATFORM/LEGAL/domain-reseller-disclosure.md` | 17 |
| 24 | `FLOMISMA_PLATFORM/TENANTS/spice_krewe/config.json` | 98 |
| 25 | `FLOMISMA_PLATFORM/TENANTS/spice_krewe/ONBOARDING_RUNBOOK.md` | 78 |
| 26 | `FLOMISMA_PLATFORM/TENANTS/spice_krewe/MOBILE_GUIDANCE.md` | 110 |
| 27 | `FLOMISMA_PLATFORM/TENANTS/spice_krewe/assets/README.md` | 45 |
| 28 | `FLOMISMA_PLATFORM/LIBRARY/services/CodeOptimizationService.php` | 711 |
| 29 | `PEMABU_PLATFORM/prisma/schema.prisma` | 656 |
| 30 | `PEMABU_PLATFORM/portal/docs/compliance/Model-Card-V1.md` | 89 |
| 31 | `PEMABU_PLATFORM/portal/docs/compliance/Incentive-Remediation-V1.md` | 43 |
| 32 | `FLOMISMA_PLATFORM/LEGAL/AGENTIC_TOS.md` | 331 |

## Appendix B — `hosting:*` Artisan commands (discovered)

Source: `FLOMISMA_PLATFORM/LIBRARY/Console/Commands/Hosting*.php` signature scan on **2026-04-02**.

| Command | File |
|---------|------|
| `hosting:deprovision` | `LIBRARY/Console/Commands/HostingDeprovisionCommand.php` |
| `hosting:provision-cloudflare` | `LIBRARY/Console/Commands/HostingProvisionCloudflareCommand.php` |
| `hosting:provision-ssl` | `LIBRARY/Console/Commands/HostingProvisionSslCommand.php` |
| `hosting:record-reseller-registration` | `LIBRARY/Console/Commands/HostingRecordResellerRegistrationCommand.php` |
| `hosting:status` | `LIBRARY/Console/Commands/HostingStatusCommand.php` |
| `hosting:verify-domain` | `LIBRARY/Console/Commands/HostingVerifyDomainCommand.php` |

**Note:** `TENANTS/spice_krewe/ONBOARDING_RUNBOOK.md` references `php artisan hosting:verify-domain spice_krewe`, which matches `hosting:verify-domain`.

---

## Appendix C — Sprint summary closeout

**Date:** 2026-04-02

### Gaps resolved this session

- **Gap 1 (search tasks route):** **RESOLVED — DETERMINED REDUNDANT.** `search-upgrade-design.md` §4.1 names `/search/tasks` for faceted search over **open hire projects / gigs** on the same `TreasuryTask` model as gig search; no separate `task_type` / service-request dimension exists without schema work. Redundancy documented in `PEMABU_PLATFORM/app/api/v1/search/gigs/route.ts` and `PEMABU_PLATFORM/portal/app/api/v1/search/gigs/route.ts`.
- **Gap 2 (ObvRecalculate naming drift):** **RESOLVED.** Canonical file `FLOMISMA_PLATFORM/LIBRARY/Console/Commands/ObvRecalculate.php`, class `ObvRecalculate`, `php artisan obv:recalculate {tenant_id?} {--all}`. `FLOMISMA_PLATFORM/README_ADMIN.md` OBV section updated with command table and implementation path.
- **Gap 3 (domain disclosure remittance):** **STRUCTURED PLACEHOLDER** applied in `LEGAL/domain-reseller-disclosure.md` Section 5; **awaiting business/legal/registrar input** before tenant publication. Reminder added to `FLOMISMA_PLATFORM/docs/sprint-4-readiness.md` (**Ongoing disclosures and publications**).

### Executive brief

Created: `FLOMISMA_PLATFORM/docs/EXECUTIVE_BRIEF.md` (non-technical one-pager for advisors/partners/investors).

### Remaining open human-decision items

**Count:** **18** (unchanged from Section 10.2). This closeout did not remove counsel briefs, provider selection, principal sign-off, or other substantive decisions; it documented redundancy, fixed naming drift in admin docs, and structured the domain remittance checklist **without** completing partner-specific remittance terms.

---

## Appendix D — Pre-Sprint-5 scaffold summary

**Date:** 2026-04-02

### What was built

- **PaymentProviderInterface** with **six** logical operations (create hold, instruct release, instruct refund, query hold status, verify webhook signature, parse webhook payload).
- **StubPaymentProvider** for local development.
- **NullPaymentProvider** for non-local environments pending provider selection.
- Provider result value objects (**five** classes: hold, release, refund, status, webhook event).
- **AgreementService** `initiateHold` / `confirmRelease` / `confirmRefund` wired to the interface (plus existing webhook mirror path).
- Sprint 5 migration SQL pre-written (**40** column drops across **17** Prisma models — manual file; do not run until post-provider).
- **Provider selection evaluation template** (`FLOMISMA_PLATFORM/docs/provider-selection-template.md`).
- **Sprint 5 migration guide** (`PEMABU_PLATFORM/portal/docs/sprint5-migration-guide.md`).

### Integration time estimate

**7–10 business days** from provider selection to production. Breakdown:

- Provider adapter implementation: **3–5 days**
- Prisma migration execution: **1 day**
- Staging test against provider sandbox: **2–3 days**
- Production deployment: **1 day**

*(Matches `FLOMISMA_PLATFORM/docs/provider-selection-template.md` § Integration timeline estimate.)*

### What the next developer does

When a licensed provider is selected:

1. Create a new class that implements **PaymentProviderInterface**.
2. Make real API calls in each method.
3. Update the **service provider** binding to the new class (see **M2MCommerceServiceProvider** registration).
4. Set **`WEBHOOK_SECRET`** in `.env` to the provider’s shared signing secret (HMAC pattern already used by **WebhookController**).
5. Run **`002_sprint5_remove_deprecated_fields.sql`** per **`portal/docs/sprint5-migration-guide.md`** after staging validation.

### Deprecated field scope

**17** models, **40** column drops staged in migration SQL. Full list in **`PEMABU_PLATFORM/portal/docs/sprint5-migration-guide.md`**.

---

*End of `SPRINT_SUMMARY.md`. This document is an engineering aggregation of files actually read for its construction; it is not legal advice.*
