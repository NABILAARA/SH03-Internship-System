-- Add startDate and endDate to InternshipProgram
-- SAFE: only ADD COLUMN, period column is kept intact (no data loss)

ALTER TABLE "InternshipProgram" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "InternshipProgram" ADD COLUMN IF NOT EXISTS "endDate"   TIMESTAMP(3);
