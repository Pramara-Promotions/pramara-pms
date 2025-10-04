/*
  Warnings:

  - You are about to drop the column `active` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `affectedTeams` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `approvedAt` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `approverRole` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `isStandard` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `kind` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `sourceChangeId` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedAt` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedBy` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `verificationProof` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedAt` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedBy` on the `ProjectDocument` table. All the data in the column will be lost.
  - You are about to drop the column `verifierRole` on the `ProjectDocument` table. All the data in the column will be lost.
  - Added the required column `name` to the `ProjectDocument` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."ProjectDocument" DROP CONSTRAINT "ProjectDocument_sourceChangeId_fkey";

-- DropIndex
DROP INDEX "public"."ProjectDocument_active_idx";

-- DropIndex
DROP INDEX "public"."ProjectDocument_kind_idx";

-- DropIndex
DROP INDEX "public"."ProjectDocument_projectId_idx";

-- AlterTable
ALTER TABLE "public"."ProjectDocument" DROP COLUMN "active",
DROP COLUMN "affectedTeams",
DROP COLUMN "approvedAt",
DROP COLUMN "approvedBy",
DROP COLUMN "approverRole",
DROP COLUMN "isStandard",
DROP COLUMN "kind",
DROP COLUMN "notes",
DROP COLUMN "sourceChangeId",
DROP COLUMN "tags",
DROP COLUMN "title",
DROP COLUMN "updatedAt",
DROP COLUMN "uploadedAt",
DROP COLUMN "uploadedBy",
DROP COLUMN "verificationProof",
DROP COLUMN "verifiedAt",
DROP COLUMN "verifiedBy",
DROP COLUMN "verifierRole",
ADD COLUMN     "changeLogId" INTEGER,
ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "storageKey" TEXT,
ALTER COLUMN "url" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_name_idx" ON "public"."ProjectDocument"("projectId", "name");

-- AddForeignKey
ALTER TABLE "public"."ProjectDocument" ADD CONSTRAINT "ProjectDocument_changeLogId_fkey" FOREIGN KEY ("changeLogId") REFERENCES "public"."ChangeLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
