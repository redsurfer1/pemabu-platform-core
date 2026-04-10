-- REVIEW BEFORE APPLY: run against Supabase SQL editor (or controlled Postgres),
-- not via `prisma migrate`, after Prisma schema columns are applied (db push / custom migration).
--
-- Sprint 1 search foundation for Pemabu `TreasuryTask`:
-- 1) Full-text search column `search_vector` (tsvector)
-- 2) Trigger to refresh tsvector on title/description changes
-- 3) GIN index for @@ queries
--
-- Vector / semantic search (ChromaDB — chosen for this sprint; pgvector NOT added in Prisma):
-- Collection naming convention (application layer):
--   chroma_collection_pemabu_treasury_tasks_v1
-- Document ID: TreasuryTask.id (UUID string)
-- Metadata filters: { "tenantId": "<uuid>", "status": "OPEN" }
-- Embeddings: title + description + skills[] (joined); re-index on task update webhook/cron.
-- Do not store payment, balance, or PII in Chroma metadata beyond tenant/task ids.

-- Step A: add column (skip if already exists)
ALTER TABLE "TreasuryTask"
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Step B: backfill existing rows
UPDATE "TreasuryTask"
SET search_vector =
  to_tsvector(
    'english',
    coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(array_to_string(skills, ' '), '')
  )
WHERE search_vector IS NULL;

-- Step C: trigger function
CREATE OR REPLACE FUNCTION treasury_task_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector(
      'english',
      coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '') || ' ' || coalesce(array_to_string(NEW.skills, ' '), '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_treasury_task_search_vector ON "TreasuryTask";
CREATE TRIGGER trg_treasury_task_search_vector
BEFORE INSERT OR UPDATE OF title, description, skills
ON "TreasuryTask"
FOR EACH ROW
EXECUTE PROCEDURE treasury_task_search_vector_update();

-- Step D: GIN index (concurrent build recommended in production)
CREATE INDEX IF NOT EXISTS treasury_task_search_vector_gin
  ON "TreasuryTask"
  USING GIN (search_vector);
