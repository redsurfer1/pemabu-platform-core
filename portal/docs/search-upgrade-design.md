# Pemabu Search Upgrade — Technical Design (OfferedJobs Blueprint Alignment)

**Status:** Proposed (design-only; no migrations in this artifact)  
**Version:** 1.0  
**Related:** `adr/001-search-architecture.md`  
**Regulatory constraint:** No payment-gated search, no Woo/Nokri subscription logic, no custodial or MSB-adjacent flows.

---

## Flomisma feature flag scope (Task C3)

The following applies when integrating with **Flomisma tenant config** (`TENANTS/<tenant>/config.json`):

| Capability | Default (all tenants) | Behind `features.advanced_gig_search` (proposed flag) |
|------------|------------------------|---------------------------------------------------------|
| Keyword + semantic retrieval on open projects (`TreasuryTask`) | Yes (baseline; see ADR) | N/A |
| Structured filters: **category tree**, **location**, **remote**, **tags** | No until schema + API ship | **Yes** (faceted search UI + `/api/v1/search` query params) |
| **Radius / lat-lng** geo filter | No until PostGIS or Haversine column | **Yes** |
| **Salary / budget range** dimensions (blueprint parity) | No | **Yes** (optional fields on listing; **not** payment) |
| Full-text Postgres `tsvector` on title/description | No | **Yes** (recommended with flag) |
| ChromaDB / vector re-ranking combined with SQL filters | No | **Yes** (when vector index exists per tenant) |

**Entitlements:** Pemabu continues to use **Sovereign Credit Engine / OBV** outputs as **non-monetary platform access tiers and feature entitlements** (not a consumer credit line or stored wallet balance) for workflow gating — **not** blueprint “package credits” for search visibility.

---

## 1. Blueprint extraction summary

### 1.1 Search / filter dimensions (from `TECHNICAL_BLUEPRINT_OfferedJobs_Extraction.md`)

- **Keyword:** full-text on title/content (`job-title` → `s`).
- **Category:** hierarchical taxonomy `job_category` (up to 4 levels).
- **Location:** taxonomy `ad_location` (country → state → city → town) + **location keyword** `loc_keyword`.
- **Radius:** `radius_lat`, `radius_long`, `distance` bounding box on lat/lng meta.
- **Remote:** boolean `work-remotely` → `_n_remotely_work`.
- **Additional taxonomies:** `job_type`, `job_level`, `job_shift`, `job_experience`, `job_skills`, `job_salary`, `job_currency`, `job_salary_type`, `job_qualifications`, `job_class`, `job_tags`.
- **Custom template fields:** `custom[key]` → dynamic meta keys.
- **Base constraints:** listing active/published; AND across taxonomies + meta; order by date (or param).

### 1.2 Taxonomy hierarchy

- **job_category:** tree (depth ≤ 4).
- **ad_location:** tree (country down to town).

### 1.3 Subscription / package model (blueprint §2) — **EXCLUDED from implementation**

- WooCommerce “packages,” per-class credits, Stripe checkout for plans — **not replicated**.
- **Reason:** regulatory constraint + Pemabu uses non–payment-gated discovery and separate credit/OBV systems.

### 1.4 Ranking / relevance (blueprint)

- WordPress: combined tax/meta query; order **date DESC** (or `order_job`).
- Rebuild suggestion: keyword FTS + structured filters; **no** explicit learning-to-rank in blueprint.
- **Proposed Pemabu upgrade:** `semanticScore` (vector) + `keywordRank` (FTS) + optional `recencyBoost` — weighted merge (see §3).

---

## 2. Gap map vs current Pemabu (this repository snapshot)

> **Note:** In this checkout, `portal/app/api/v1/match/` and `portal/app/api/v1/discover/` are **not present**. `GET /api/jobs` exposes **promoted** `TreasuryTask` rows via `getPromotedJobsFeed`. Semantic matching for certifications uses `src/lib/talenthunt-integration.ts` (**keyword overlap + description match**, not ChromaDB in code).

| Blueprint dimension | Current Pemabu coverage | Gap | Priority |
|---------------------|-------------------------|-----|----------|
| Keyword search on listings | Partial: `TreasuryTask` has title/description; jobs feed scrubbed; no dedicated user-facing search API | Dedicated `/api/v1/search` + FTS | P0 |
| Hierarchical category | **None** on `TreasuryTask` (only `skills: String[]`) | `GigCategory` tree + join table | P0 |
| Hierarchical location | **None** (no lat/lng on task) | Location model or normalized columns + optional `locationId` | P0 |
| Radius / distance | **None** | `latitude`/`longitude` + Haversine or PostGIS | P1 |
| Remote flag | **None** | `remoteOk Boolean` on task | P1 |
| job_type, level, shift, experience | **None** | Enums or lookup tables + columns on task | P2 |
| Salary / budget range | **None** | Optional `budgetMin`/`budgetMax` + `currency` (informational only) | P2 |
| Skills vs tags | `skills[]` only | `GigTag` many-to-many for faceted filters | P1 |
| Custom dynamic fields | **None** | Optional `metadata Json` already pattern elsewhere; extend task `metadata` | P3 |
| Vector semantic search | Described for Pemabu product; **not** in `talenthunt-integration.ts` | Chroma (or pgvector) + merge with SQL | P0–P1 |
| Pagination / sort | Jobs feed limited | Cursor/page + explicit sort keys | P0 |

---

## 3. Proposed Prisma schema additions

**Convention:** New models are **tenant-scoped** with `tenantId` to align with existing `TreasuryTask`.

```prisma
// ─── Gig taxonomy & geo (OfferedJobs-aligned facets; non-payment) ─────────

model GigCategory {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  slug      String
  name      String
  parentId  String?
  parent    GigCategory?  @relation("GigCategoryTree", fields: [parentId], references: [id], onDelete: SetNull)
  children  GigCategory[] @relation("GigCategoryTree")
  depth     Int      @default(0) // 0–3 equivalent to blueprint levels
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  tasks     TreasuryTaskCategory[]

  @@unique([tenantId, slug])
  @@index([tenantId, parentId])
}

model TreasuryTaskCategory {
  treasuryTaskId String
  categoryId     String
  treasuryTask   TreasuryTask @relation(fields: [treasuryTaskId], references: [id], onDelete: Cascade)
  category       GigCategory  @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([treasuryTaskId, categoryId])
  @@index([categoryId])
}

model GigTag {
  id       String   @id @default(uuid())
  tenantId String
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  slug     String
  label    String
  tasks    TreasuryTaskTag[]

  @@unique([tenantId, slug])
  @@index([tenantId])
}

model TreasuryTaskTag {
  treasuryTaskId String
  tagId          String
  treasuryTask   TreasuryTask @relation(fields: [treasuryTaskId], references: [id], onDelete: Cascade)
  tag            GigTag       @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([treasuryTaskId, tagId])
  @@index([tagId])
}

/// Normalized location node (blueprint ad_location). Optional flat address on task for display.
model GigLocation {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  slug      String
  name      String
  parentId  String?
  parent    GigLocation?  @relation("GigLocationTree", fields: [parentId], references: [id], onDelete: SetNull)
  children  GigLocation[] @relation("GigLocationTree")
  latitude  Decimal? @db.Decimal(10, 7)
  longitude Decimal? @db.Decimal(10, 7)
  tasks     TreasuryTask[]

  @@unique([tenantId, slug])
  @@index([tenantId, parentId])
}

// ─── Extend existing TreasuryTask (additive fields; migrate carefully) ─────
// Add to model TreasuryTask { ... existing ... } in schema.prisma:

// locationId          String?
// location            GigLocation? @relation(fields: [locationId], references: [id], onDelete: SetNull)
// remoteOk            Boolean      @default(false)
// latitude            Decimal?     @db.Decimal(10, 7)
// longitude           Decimal?     @db.Decimal(10, 7)
// budgetMin           Decimal?     @db.Decimal(18, 2)
// budgetMax           Decimal?     @db.Decimal(18, 2)
// budgetCurrency      String?      @default("USD")
// engagementType      String?      // e.g. ONE_OFF | ONGOING (maps blueprint job_type loosely)
// experienceLevel     String?      // maps job_level / job_experience
// searchDocument      Unsupported("tsvector")? // if using raw SQL migration
// categories          TreasuryTaskCategory[]
// tags                TreasuryTaskTag[]
```

**Relations to add on existing models:** `Tenant` gains `gigCategories`, `gigTags`, `gigLocations` if desired; `TreasuryTask` gains M2M relations as above.

**Vector store:** Prefer **`pgvector`** column on `TreasuryTask` (`embedding vector(1536)`) *or* keep **Chroma** collection keyed by `treasuryTaskId` — decision in ADR.

---

## 4. Next.js API route structure

**Base path:** `app/api/v1/search/` (under main Next app root `PEMABU_PLATFORM/app`, not the sparse `portal/` subtree, unless product standardizes on `portal` — align with routing convention at implementation time).

### 4.1 `GET /api/v1/search/tasks`

**Purpose:** Faceted search over open hire projects / gigs.

```ts
export interface SearchTasksQuery {
  tenantId: string;
  q?: string;
  categoryId?: string;
  includeCategoryDescendants?: boolean;
  locationId?: string;
  tagSlugs?: string[];
  remoteOk?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  budgetMin?: number;
  budgetMax?: number;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'newest' | 'deadline';
}
```

**Response:**

```ts
export interface SearchTasksResponse {
  items: Array<{
    id: string;
    title: string;
    description: string;
    skills: string[];
    matchComponents?: { semantic?: number; keyword?: number; geo?: number };
    score: number;
  }>;
  total: number;
  page: number;
  totalPages: number;
}
```

### 4.2 `POST /api/v1/search/semantic-preview` (optional, flag-gated)

**Purpose:** Given natural language, return embedding ID candidates before SQL narrowing.

```ts
export interface SemanticPreviewBody {
  tenantId: string;
  query: string;
  topK?: number;
}
```

### 4.3 Query logic outline

1. **Parse** query → structured `SearchTasksQuery`.
2. **Prisma WHERE:** tenant + status OPEN + category/tag/location/remote/budget predicates.
3. **Geo:** if `lat,lng,radiusKm` → Haversine in raw query or PostGIS `ST_DWithin`.
4. **FTS:** `ts_rank` / `websearch_to_tsquery` on `searchDocument` or `title`+`description`.
5. **Vector:** fetch candidate IDs from Chroma/pgvector **restricted to** tenant + OPEN; intersect with SQL IDs.
6. **Merge score:** e.g. `score = 0.5 * semantic + 0.3 * keyword + 0.2 * geoBoost` (tunable; document weights in config).
7. **Privacy:** reuse `scrubContext` for non-admin roles on descriptions in list view.

---

## 5. UI component plan

**Location:** `components/gig-search/` (or `app/(portal)/gigs/search/`) — **implementation sprint**.

| Component | Role |
|-----------|------|
| `GigSearchBar` | Keyword `q`, debounced submit |
| `CategoryTreeFilter` | Hierarchical select; emits `categoryId` + optional descendants |
| `LocationFilter` | Tree or autocomplete on `GigLocation` |
| `TagMultiSelect` | Slugs from `GigTag` |
| `RemoteToggle` | `remoteOk` |
| `RadiusMapFilter` | Optional; uses browser geolocation with consent |
| `BudgetRangeSlider` | Min/max informational |
| `SearchResultsList` | Cards wired to `SearchTasksResponse` |
| `MatchGauge` | Show **combined** score breakdown when `advanced_gig_search` enabled |

**Design system:** Navy/Copper tokens already in Pemabu — reuse `MatchGauge` for **composite score**; do not add new UI libraries beyond `package.json`.

---

## 6. Explicitly out of scope

- WooCommerce **packages**, **featured/bump** credits, Stripe **checkout for search tiers**.
- **Paywall** on search results or “premium placement” tied to blueprint job_class packages.
- Holding user funds or operating escrow **in this feature** (blueprint marketplace sections are irrelevant).

---

## 7. Implementation sequencing (suggested)

1. Schema + migrations for `GigCategory`, `GigTag`, `GigLocation`, M2M, `TreasuryTask` columns.
2. Backfill scripts for categories/tags from existing `skills`.
3. `GET /api/v1/search/tasks` with SQL-only filters.
4. Add FTS + vector (Chroma or pgvector) + merged ranking.
5. UI filters behind Flomisma **feature flag** for advanced facets.
