/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ProjectSku` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProjectSku" DROP CONSTRAINT "ProjectSku_projectId_fkey";

-- AlterTable
ALTER TABLE "ProjectSku" DROP COLUMN "createdAt",
ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "orderQty" INTEGER,
ADD COLUMN     "poNumber" TEXT,
ADD COLUMN     "type" TEXT;

-- CreateIndex
CREATE INDEX "ProjectSku_projectId_idx" ON "ProjectSku"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectSku" ADD CONSTRAINT "ProjectSku_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
