/*
  Warnings:

  - You are about to drop the column `link` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "link",
ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "dismissed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dismissedAt" TIMESTAMP(3),
ADD COLUMN     "entityCode" TEXT,
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityName" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "impactDetails" JSONB,
ADD COLUMN     "impactLevel" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "primaryAction" TEXT,
ADD COLUMN     "primaryActionType" TEXT,
ADD COLUMN     "primaryActionUrl" TEXT,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "secondaryActions" JSONB;

-- CreateIndex
CREATE INDEX "Notification_userId_dismissed_idx" ON "Notification"("userId", "dismissed");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");

-- CreateIndex
CREATE INDEX "Notification_expiresAt_idx" ON "Notification"("expiresAt");
