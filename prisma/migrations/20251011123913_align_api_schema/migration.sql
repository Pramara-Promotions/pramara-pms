/*
  Warnings:

  - You are about to drop the column `type` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `condition` on the `AlertRule` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `AlertRule` table. All the data in the column will be lost.
  - You are about to drop the column `item` on the `InventoryNeed` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `InventoryNeed` table. All the data in the column will be lost.
  - You are about to drop the column `changeLogId` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `QCRecord` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `QCRecord` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `QCRecord` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `VarianceItem` table. All the data in the column will be lost.
  - You are about to drop the column `documentId` on the `VarianceItem` table. All the data in the column will be lost.
  - Added the required column `level` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `key` to the `AlertRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `AlertRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AlertRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `availableQty` to the `InventoryNeed` table without a default value. This is not possible if the table is not empty.
  - Added the required column `material` to the `InventoryNeed` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requiredQty` to the `InventoryNeed` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `InventoryNeed` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kind` to the `ProjectDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `ProjectDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ProjectDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actual` to the `VarianceItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `VarianceItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expected` to the `VarianceItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `field` to the `VarianceItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `VarianceItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ProjectDocument" DROP CONSTRAINT "ProjectDocument_changeLogId_fkey";

-- DropForeignKey
ALTER TABLE "VarianceItem" DROP CONSTRAINT "VarianceItem_documentId_fkey";

-- DropIndex
DROP INDEX "ProjectDocument_projectId_name_idx";

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "type",
ADD COLUMN     "level" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "AlertAction" ADD COLUMN     "by" TEXT,
ADD COLUMN     "correctiveActions" TEXT,
ADD COLUMN     "costImpactCents" INTEGER,
ADD COLUMN     "costNote" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "preventRecurrence" TEXT;

-- AlterTable
ALTER TABLE "AlertRule" DROP COLUMN "condition",
DROP COLUMN "type",
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "level" TEXT NOT NULL,
ADD COLUMN     "recipients" TEXT,
ADD COLUMN     "threshold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "InventoryNeed" DROP COLUMN "item",
DROP COLUMN "quantity",
ADD COLUMN     "availableQty" INTEGER NOT NULL,
ADD COLUMN     "material" TEXT NOT NULL,
ADD COLUMN     "requiredQty" INTEGER NOT NULL,
ADD COLUMN     "shortfall" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ProjectDocument" DROP COLUMN "changeLogId",
DROP COLUMN "name",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "affectedTeams" JSONB,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "approverRole" TEXT,
ADD COLUMN     "isStandard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sourceChangeId" INTEGER,
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "uploadedBy" TEXT,
ADD COLUMN     "verificationProof" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT,
ADD COLUMN     "verifierRole" TEXT;

-- AlterTable
ALTER TABLE "QCRecord" DROP COLUMN "remarks",
DROP COLUMN "status",
DROP COLUMN "type",
ADD COLUMN     "batchCode" TEXT,
ADD COLUMN     "pantoneMatch" TEXT DEFAULT 'Match',
ADD COLUMN     "passed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "rejected" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VarianceItem" DROP COLUMN "description",
DROP COLUMN "documentId",
ADD COLUMN     "actual" TEXT NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "expected" TEXT NOT NULL,
ADD COLUMN     "field" TEXT NOT NULL,
ADD COLUMN     "projectId" INTEGER NOT NULL,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "sourceDocId" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DEVIATION';

-- CreateIndex
CREATE INDEX "Alert_projectId_idx" ON "Alert"("projectId");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "AlertRule_projectId_key_idx" ON "AlertRule"("projectId", "key");

-- CreateIndex
CREATE INDEX "InventoryNeed_projectId_idx" ON "InventoryNeed"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_kind_title_idx" ON "ProjectDocument"("projectId", "kind", "title");

-- CreateIndex
CREATE INDEX "QCRecord_projectId_idx" ON "QCRecord"("projectId");

-- CreateIndex
CREATE INDEX "VarianceItem_projectId_idx" ON "VarianceItem"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_sourceChangeId_fkey" FOREIGN KEY ("sourceChangeId") REFERENCES "ChangeLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianceItem" ADD CONSTRAINT "VarianceItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianceItem" ADD CONSTRAINT "VarianceItem_sourceDocId_fkey" FOREIGN KEY ("sourceDocId") REFERENCES "ProjectDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
