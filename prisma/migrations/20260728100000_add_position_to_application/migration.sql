-- AlterTable: tambah kolom position ke Application
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "position" TEXT;
