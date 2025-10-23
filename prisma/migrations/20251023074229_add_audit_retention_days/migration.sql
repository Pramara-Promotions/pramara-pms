-- AlterTable
ALTER TABLE "User" ADD COLUMN     "auditRetentionDays" INTEGER NOT NULL DEFAULT 90;
