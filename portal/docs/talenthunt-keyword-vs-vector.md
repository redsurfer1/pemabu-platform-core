# Talent Hunt: keyword matching vs vector search (discrepancy)

## What `src/lib/talenthunt-integration.ts` actually does

- `findTopMatchingProjects()` loads **all** `TreasuryTask` rows for a tenant with `status: OPEN`.
- It maps `courseType` to a **fixed keyword list** (`COURSE_SKILL_MAP`).
- It scores each project with **substring overlap** between those keywords and `project.skills` plus a small bonus if keywords appear in `description`.
- **No ChromaDB client**, **no embedding API**, **no vector index** appears in this module.

## What product copy / architecture often implied

- “ChromaDB vector embeddings for gig matching” suggests **semantic similarity** (embeddings + nearest-neighbor search) between learner profile / course signals and project text.

## Decision (aligned with `portal/docs/search-upgrade-design.md`)

From **§2 Gap map** and **§3 Proposed Prisma schema / query logic**:

- **Standardize on:** Postgres **full-text** (`tsvector` on `TreasuryTask`) for **keyword / lexical** relevance in user-facing search APIs, plus optional **ChromaDB** (or future **pgvector**) for **semantic** retrieval, with results **intersected** with SQL filters (`tenantId`, `status`, category, location).
- **Do not** treat `talenthunt-integration.ts` as a vector implementation; treat it as a **temporary certification webhook heuristic** until replaced.

## Migration path

1. **Keep** webhook behavior until a drop-in replacement returns the same **shape** (`ProjectMatch[]`) so `certification-issued` route stays stable.
2. **Add** embedding pipeline (batch or on-write) that indexes `title + description + skills` into **Chroma** collection `chroma_collection_pemabu_treasury_tasks_v1` (see `prisma/migrations/manual/001_search_foundation.sql` header).
3. **Replace** scoring inside `findTopMatchingProjects` with: (a) vector top-K by course-derived query embedding, then (b) optional keyword filter, **or** call shared `search` service.
4. **Backfill:** nightly job embeds all OPEN tasks; on task update, re-upsert Chroma document.
5. **UI:** no change if webhook response schema unchanged; monitor match quality via logs / `matchScore` distribution.
