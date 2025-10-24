-- AlterTable
ALTER TABLE "DocumentExtractionJob" ADD COLUMN     "applicationError" TEXT,
ADD COLUMN     "appliedAt" TIMESTAMP(3),
ADD COLUMN     "appliedBy" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "approvedFields" JSONB;
