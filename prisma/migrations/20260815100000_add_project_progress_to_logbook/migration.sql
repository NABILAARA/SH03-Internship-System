-- AlterTable: tambah kolom projectProgress ke Logbook
-- Default 0 agar baris yang sudah ada tidak terpengaruh
ALTER TABLE "Logbook" ADD COLUMN "projectProgress" INTEGER NOT NULL DEFAULT 0;
