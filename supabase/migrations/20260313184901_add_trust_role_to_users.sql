/*
  # Add Trust Center Role-Based Access Control

  1. Changes to Users Table
    - Add `trustRole` enum column for Trust Center access levels
    - Default value: PUBLIC (no Trust Center access)
    - Supports: PUBLIC, AUDITOR, LLC_MEMBER, ADMIN

  2. New Enum Type
    - `TrustRole` enum with four access levels:
      - PUBLIC: No Trust Center access
      - AUDITOR: Read-only Trust Center access
      - LLC_MEMBER: Full Trust Center access with limited controls
      - ADMIN: Full Trust Center and control access

  3. Security
    - Maintains existing RLS policies on User table
    - trustRole controls application-level access to /trust-center routes
    - AUDITOR role enforces view-only mode in UI components
*/

-- Create TrustRole enum type
DO $$ BEGIN
  CREATE TYPE "TrustRole" AS ENUM ('PUBLIC', 'AUDITOR', 'LLC_MEMBER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add trustRole column to User table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'trustRole'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "trustRole" "TrustRole" DEFAULT 'PUBLIC' NOT NULL;
  END IF;
END $$;

-- Create index for efficient trustRole queries
CREATE INDEX IF NOT EXISTS "User_trustRole_idx" ON "User"("trustRole");
