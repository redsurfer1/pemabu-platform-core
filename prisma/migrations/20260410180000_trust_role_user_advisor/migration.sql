-- Align TrustRole enum with client-safe values (USER, ADVISOR).
-- PostgreSQL 10+ supports RENAME VALUE on enums.

ALTER TYPE "TrustRole" RENAME VALUE 'AUDITOR' TO 'ADVISOR';
ALTER TYPE "TrustRole" RENAME VALUE 'LLC_MEMBER' TO 'USER';
