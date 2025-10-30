-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "assembledFrom" TEXT[],
ADD COLUMN     "assembledInto" TEXT,
ADD COLUMN     "assemblyDate" TIMESTAMP(3),
ADD COLUMN     "assemblyOperator" TEXT,
ADD COLUMN     "assemblyStation" TEXT,
ADD COLUMN     "calculatedQty" INTEGER,
ADD COLUMN     "containerWeight" DOUBLE PRECISION,
ADD COLUMN     "isRejection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lotId" TEXT,
ADD COLUMN     "parentBatchId" TEXT,
ADD COLUMN     "quantityMethod" TEXT NOT NULL DEFAULT 'count',
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "rejectionStationId" INTEGER,
ADD COLUMN     "reworkCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reworkRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subBatchIdentifier" TEXT,
ADD COLUMN     "subSkuIdentifier" TEXT,
ADD COLUMN     "totalWeight" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProcessConfig" ADD COLUMN     "actualCycleTime" DOUBLE PRECISION,
ADD COLUMN     "baseCycleTime" DOUBLE PRECISION,
ADD COLUMN     "cycleTimeRatio" DOUBLE PRECISION,
ADD COLUMN     "cycleTimeVariance" DOUBLE PRECISION,
ADD COLUMN     "historicalPerformance" JSONB,
ADD COLUMN     "isMultiSKUWorkstation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastOptimizedAt" TIMESTAMP(3),
ADD COLUMN     "optimizationSuggestions" JSONB,
ADD COLUMN     "optionalAssetIds" TEXT[],
ADD COLUMN     "requiredAssetIds" TEXT[],
ADD COLUMN     "skuCode" TEXT;

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "actualCycleTime" DOUBLE PRECISION,
ADD COLUMN     "actualUtilization" DOUBLE PRECISION,
ADD COLUMN     "baseCycleTime" DOUBLE PRECISION,
ADD COLUMN     "currentSKU" TEXT,
ADD COLUMN     "cycleTimeUnit" TEXT,
ADD COLUMN     "isMultiAsset" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "learningEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "performanceBaseline" JSONB,
ADD COLUMN     "requiredAssetTypes" TEXT[],
ADD COLUMN     "requiresAssets" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skuCycleTimeMap" JSONB,
ADD COLUMN     "targetUtilization" DOUBLE PRECISION,
ADD COLUMN     "workstationType" TEXT;

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "poNumber" TEXT,
    "totalQty" INTEGER NOT NULL,
    "cartonCount" INTEGER,
    "palletCount" INTEGER,
    "packingStation" TEXT,
    "packingOperators" TEXT[],
    "packingDate" TIMESTAMP(3) NOT NULL,
    "shippingDestination" TEXT,
    "customerPO" TEXT,
    "shippingDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'packed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "category" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "specifications" JSONB,
    "mobility" TEXT NOT NULL DEFAULT 'fixed',
    "currentLocation" TEXT,
    "assignedToStation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "condition" TEXT NOT NULL DEFAULT 'good',
    "lastMaintenanceDate" TIMESTAMP(3),
    "nextMaintenanceDate" TIMESTAMP(3),
    "maintenanceHistory" JSONB,
    "maintenanceIntervalDays" INTEGER,
    "totalRunHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCycles" INTEGER NOT NULL DEFAULT 0,
    "lastUsedDate" TIMESTAMP(3),
    "utilizationRate" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "purchaseCost" DOUBLE PRECISION,
    "depreciationRate" DOUBLE PRECISION,
    "manualUrl" TEXT,
    "images" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkstationAsset" (
    "id" TEXT NOT NULL,
    "workstationId" INTEGER NOT NULL,
    "assetId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "removedAt" TIMESTAMP(3),
    "removedBy" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "cycleTimeImpact" DOUBLE PRECISION,
    "efficiencyImpact" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "WorkstationAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lot_lotCode_key" ON "Lot"("lotCode");

-- CreateIndex
CREATE INDEX "Lot_lotCode_idx" ON "Lot"("lotCode");

-- CreateIndex
CREATE INDEX "Lot_projectId_idx" ON "Lot"("projectId");

-- CreateIndex
CREATE INDEX "Lot_status_idx" ON "Lot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetCode_key" ON "Asset"("assetCode");

-- CreateIndex
CREATE INDEX "Asset_assetCode_idx" ON "Asset"("assetCode");

-- CreateIndex
CREATE INDEX "Asset_assetType_idx" ON "Asset"("assetType");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_mobility_idx" ON "Asset"("mobility");

-- CreateIndex
CREATE INDEX "WorkstationAsset_workstationId_idx" ON "WorkstationAsset"("workstationId");

-- CreateIndex
CREATE INDEX "WorkstationAsset_assetId_idx" ON "WorkstationAsset"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkstationAsset_workstationId_assetId_assignedAt_key" ON "WorkstationAsset"("workstationId", "assetId", "assignedAt");

-- CreateIndex
CREATE INDEX "Batch_parentBatchId_idx" ON "Batch"("parentBatchId");

-- CreateIndex
CREATE INDEX "Batch_lotId_idx" ON "Batch"("lotId");

-- CreateIndex
CREATE INDEX "Batch_isRejection_idx" ON "Batch"("isRejection");

-- CreateIndex
CREATE INDEX "ProcessConfig_skuCode_idx" ON "ProcessConfig"("skuCode");

-- CreateIndex
CREATE INDEX "Station_workstationType_idx" ON "Station"("workstationType");

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_parentBatchId_fkey" FOREIGN KEY ("parentBatchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkstationAsset" ADD CONSTRAINT "WorkstationAsset_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkstationAsset" ADD CONSTRAINT "WorkstationAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
