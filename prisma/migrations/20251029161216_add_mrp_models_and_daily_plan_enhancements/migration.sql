/*
  Warnings:

  - Added the required column `updatedAt` to the `DailyPlan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DailyPlan" ADD COLUMN     "adaptations" JSONB,
ADD COLUMN     "estimatedDuration" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "projectId" INTEGER,
ADD COLUMN     "scenarioType" TEXT,
ADD COLUMN     "targetQty" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "MaterialRequirement" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "skuId" INTEGER,
    "materialId" TEXT NOT NULL,
    "quantityRequired" DOUBLE PRECISION NOT NULL,
    "lossType" TEXT NOT NULL,
    "lossPercentage" DOUBLE PRECISION NOT NULL,
    "totalWithLoss" DOUBLE PRECISION NOT NULL,
    "costEstimate" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "MaterialRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOMItem" (
    "id" SERIAL NOT NULL,
    "skuId" INTEGER NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantityPerUnit" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BOMItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MRPLearning" (
    "id" SERIAL NOT NULL,
    "materialId" TEXT NOT NULL,
    "projectId" INTEGER,
    "skuId" INTEGER,
    "estimatedQuantity" DOUBLE PRECISION NOT NULL,
    "estimatedLoss" DOUBLE PRECISION NOT NULL,
    "actualQuantity" DOUBLE PRECISION NOT NULL,
    "actualLoss" DOUBLE PRECISION NOT NULL,
    "accuracyPercentage" DOUBLE PRECISION NOT NULL,
    "lossType" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,

    CONSTRAINT "MRPLearning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MRPRecommendation" (
    "id" SERIAL NOT NULL,
    "materialId" TEXT NOT NULL,
    "projectId" INTEGER,
    "skuId" INTEGER,
    "recommendedLoss" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "basedOnRecords" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "MRPRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialRequirement_projectId_idx" ON "MaterialRequirement"("projectId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_materialId_idx" ON "MaterialRequirement"("materialId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_skuId_idx" ON "MaterialRequirement"("skuId");

-- CreateIndex
CREATE INDEX "MaterialRequirement_status_idx" ON "MaterialRequirement"("status");

-- CreateIndex
CREATE INDEX "BOMItem_skuId_idx" ON "BOMItem"("skuId");

-- CreateIndex
CREATE INDEX "BOMItem_materialId_idx" ON "BOMItem"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "BOMItem_skuId_materialId_key" ON "BOMItem"("skuId", "materialId");

-- CreateIndex
CREATE INDEX "MRPLearning_materialId_idx" ON "MRPLearning"("materialId");

-- CreateIndex
CREATE INDEX "MRPLearning_projectId_idx" ON "MRPLearning"("projectId");

-- CreateIndex
CREATE INDEX "MRPLearning_skuId_idx" ON "MRPLearning"("skuId");

-- CreateIndex
CREATE INDEX "MRPLearning_lossType_idx" ON "MRPLearning"("lossType");

-- CreateIndex
CREATE INDEX "MRPRecommendation_materialId_idx" ON "MRPRecommendation"("materialId");

-- CreateIndex
CREATE INDEX "MRPRecommendation_projectId_idx" ON "MRPRecommendation"("projectId");

-- CreateIndex
CREATE INDEX "MRPRecommendation_skuId_idx" ON "MRPRecommendation"("skuId");

-- CreateIndex
CREATE INDEX "MRPRecommendation_status_idx" ON "MRPRecommendation"("status");

-- CreateIndex
CREATE INDEX "DailyPlan_projectId_idx" ON "DailyPlan"("projectId");

-- AddForeignKey
ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequirement" ADD CONSTRAINT "MaterialRequirement_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProjectSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMItem" ADD CONSTRAINT "BOMItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProjectSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MRPLearning" ADD CONSTRAINT "MRPLearning_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MRPLearning" ADD CONSTRAINT "MRPLearning_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProjectSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MRPRecommendation" ADD CONSTRAINT "MRPRecommendation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MRPRecommendation" ADD CONSTRAINT "MRPRecommendation_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProjectSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;
