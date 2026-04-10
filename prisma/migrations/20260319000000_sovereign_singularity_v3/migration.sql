-- sovereign_singularity_v3 (MANUAL FALLBACK)
-- Prepared without a live DATABASE_URL connection.
-- Once DATABASE_URL is set, you can run:
--   npx prisma migrate dev --name sovereign_singularity_v3
-- and ensure the generated SQL matches these safe renames.

-- Clean sweep column renames
ALTER TABLE "InviteToBid" RENAME COLUMN "projectId" TO "treasuryTaskId";
ALTER TABLE "AgenticTender" RENAME COLUMN "projectId" TO "treasuryTaskId";

