-- Add verifyUrl to Certificate (nullable — safe for existing data)
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "verifyUrl" TEXT;
