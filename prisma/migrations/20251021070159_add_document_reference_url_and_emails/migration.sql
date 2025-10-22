-- AlterTable
ALTER TABLE "ProjectDocument" ADD COLUMN     "approvalEmails" JSONB,
ADD COLUMN     "notificationEmails" JSONB,
ADD COLUMN     "referenceUrl" TEXT;
