/*
  Warnings:

  - Added the required column `projectId` to the `PlanAdaptation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlanAdaptation" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedBy" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "expectedImpact" TEXT,
ADD COLUMN     "planGenerationId" TEXT,
ADD COLUMN     "projectId" INTEGER NOT NULL,
ADD COLUMN     "reasoning" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "suggestedAction" JSONB,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "type" TEXT,
ALTER COLUMN "dailyPlanId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CostTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "defaultValue" DOUBLE PRECISION,
    "unit" TEXT,
    "customizable" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCosting" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "exFactoryCost" DOUBLE PRECISION,
    "fobCost" DOUBLE PRECISION,
    "sellingPrice" DOUBLE PRECISION,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostComponent" (
    "id" TEXT NOT NULL,
    "projectCostingId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "allocation" TEXT NOT NULL DEFAULT 'per_unit',
    "quantity" DOUBLE PRECISION,
    "costPerUnit" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "oneTime" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingTier" (
    "id" TEXT NOT NULL,
    "projectCostingId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarginRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB,
    "marginPercent" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarginRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostingApproval" (
    "id" TEXT NOT NULL,
    "projectCostingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approverId" TEXT,
    "comments" TEXT,
    "actedAt" TIMESTAMP(3),

    CONSTRAINT "CostingApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductComponent" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "skuId" INTEGER,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "material" TEXT,
    "color" TEXT,
    "pantoneCode" TEXT,
    "isRubberised" BOOLEAN NOT NULL DEFAULT false,
    "qtyPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentMaterial" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "qtyPerComponent" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "stage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoldMaster" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cavities" INTEGER NOT NULL DEFAULT 1,
    "cavityConfig" JSONB,
    "cycleTimeSec" INTEGER NOT NULL,
    "material" TEXT NOT NULL,
    "productType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "location" TEXT,
    "manufacturer" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "maintenanceSchedule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoldMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationMachine" (
    "id" TEXT NOT NULL,
    "stationId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "machineType" TEXT NOT NULL,
    "moldMasterId" TEXT,
    "cycleTimeSec" INTEGER,
    "cavities" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'available',
    "currentProjectId" INTEGER,
    "currentSkuId" INTEGER,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAllocation" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "skuId" INTEGER,
    "stationId" INTEGER NOT NULL,
    "machineId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "machinesAllocated" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "ResourceAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeoverHistory" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "fromProjectId" INTEGER,
    "fromSkuId" INTEGER,
    "toProjectId" INTEGER NOT NULL,
    "toSkuId" INTEGER,
    "changeoverStart" TIMESTAMP(3) NOT NULL,
    "changeoverEnd" TIMESTAMP(3),
    "changeoverMinutes" INTEGER,
    "rampUpEnd" TIMESTAMP(3),
    "rampUpMinutes" INTEGER,
    "changeType" TEXT NOT NULL,
    "notes" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeoverHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPlanGeneration" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DailyPlanGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPlanStationAuto" (
    "id" TEXT NOT NULL,
    "planGenerationId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "skuId" INTEGER NOT NULL,
    "stationId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "targetQty" INTEGER NOT NULL,
    "actualQty" INTEGER NOT NULL DEFAULT 0,
    "allocatedMachines" INTEGER NOT NULL DEFAULT 1,
    "theoreticalCapacity" INTEGER NOT NULL,
    "effectiveCapacity" INTEGER NOT NULL,
    "changeoverMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "blockedReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "variance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyPlanStationAuto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CostTemplate_name_key" ON "CostTemplate"("name");

-- CreateIndex
CREATE INDEX "CostTemplate_category_idx" ON "CostTemplate"("category");

-- CreateIndex
CREATE INDEX "ProjectCosting_projectId_idx" ON "ProjectCosting"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCosting_status_idx" ON "ProjectCosting"("status");

-- CreateIndex
CREATE INDEX "CostComponent_projectCostingId_idx" ON "CostComponent"("projectCostingId");

-- CreateIndex
CREATE INDEX "CostComponent_category_idx" ON "CostComponent"("category");

-- CreateIndex
CREATE INDEX "PricingTier_projectCostingId_idx" ON "PricingTier"("projectCostingId");

-- CreateIndex
CREATE INDEX "MarginRule_active_idx" ON "MarginRule"("active");

-- CreateIndex
CREATE INDEX "CostingApproval_projectCostingId_idx" ON "CostingApproval"("projectCostingId");

-- CreateIndex
CREATE INDEX "CostingApproval_status_idx" ON "CostingApproval"("status");

-- CreateIndex
CREATE INDEX "ProductComponent_projectId_idx" ON "ProductComponent"("projectId");

-- CreateIndex
CREATE INDEX "ProductComponent_skuId_idx" ON "ProductComponent"("skuId");

-- CreateIndex
CREATE INDEX "ProductComponent_type_idx" ON "ProductComponent"("type");

-- CreateIndex
CREATE INDEX "ComponentMaterial_componentId_idx" ON "ComponentMaterial"("componentId");

-- CreateIndex
CREATE INDEX "ComponentMaterial_materialId_idx" ON "ComponentMaterial"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "MoldMaster_code_key" ON "MoldMaster"("code");

-- CreateIndex
CREATE INDEX "MoldMaster_material_idx" ON "MoldMaster"("material");

-- CreateIndex
CREATE INDEX "MoldMaster_status_idx" ON "MoldMaster"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StationMachine_code_key" ON "StationMachine"("code");

-- CreateIndex
CREATE INDEX "StationMachine_stationId_idx" ON "StationMachine"("stationId");

-- CreateIndex
CREATE INDEX "StationMachine_status_idx" ON "StationMachine"("status");

-- CreateIndex
CREATE INDEX "StationMachine_currentProjectId_idx" ON "StationMachine"("currentProjectId");

-- CreateIndex
CREATE INDEX "ResourceAllocation_projectId_idx" ON "ResourceAllocation"("projectId");

-- CreateIndex
CREATE INDEX "ResourceAllocation_stationId_idx" ON "ResourceAllocation"("stationId");

-- CreateIndex
CREATE INDEX "ResourceAllocation_machineId_idx" ON "ResourceAllocation"("machineId");

-- CreateIndex
CREATE INDEX "ResourceAllocation_startDate_endDate_idx" ON "ResourceAllocation"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceAllocation_status_idx" ON "ResourceAllocation"("status");

-- CreateIndex
CREATE INDEX "ChangeoverHistory_machineId_idx" ON "ChangeoverHistory"("machineId");

-- CreateIndex
CREATE INDEX "ChangeoverHistory_fromSkuId_toSkuId_idx" ON "ChangeoverHistory"("fromSkuId", "toSkuId");

-- CreateIndex
CREATE INDEX "ChangeoverHistory_changeoverStart_idx" ON "ChangeoverHistory"("changeoverStart");

-- CreateIndex
CREATE INDEX "DailyPlanGeneration_projectId_idx" ON "DailyPlanGeneration"("projectId");

-- CreateIndex
CREATE INDEX "DailyPlanGeneration_status_idx" ON "DailyPlanGeneration"("status");

-- CreateIndex
CREATE INDEX "DailyPlanGeneration_startDate_endDate_idx" ON "DailyPlanGeneration"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "DailyPlanStationAuto_planGenerationId_idx" ON "DailyPlanStationAuto"("planGenerationId");

-- CreateIndex
CREATE INDEX "DailyPlanStationAuto_projectId_idx" ON "DailyPlanStationAuto"("projectId");

-- CreateIndex
CREATE INDEX "DailyPlanStationAuto_skuId_idx" ON "DailyPlanStationAuto"("skuId");

-- CreateIndex
CREATE INDEX "DailyPlanStationAuto_stationId_idx" ON "DailyPlanStationAuto"("stationId");

-- CreateIndex
CREATE INDEX "DailyPlanStationAuto_date_idx" ON "DailyPlanStationAuto"("date");

-- CreateIndex
CREATE INDEX "DailyPlanStationAuto_status_idx" ON "DailyPlanStationAuto"("status");

-- CreateIndex
CREATE INDEX "PlanAdaptation_planGenerationId_idx" ON "PlanAdaptation"("planGenerationId");

-- CreateIndex
CREATE INDEX "PlanAdaptation_projectId_idx" ON "PlanAdaptation"("projectId");

-- CreateIndex
CREATE INDEX "PlanAdaptation_type_idx" ON "PlanAdaptation"("type");

-- CreateIndex
CREATE INDEX "PlanAdaptation_status_idx" ON "PlanAdaptation"("status");

-- AddForeignKey
ALTER TABLE "BOMItem" ADD CONSTRAINT "BOMItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MRPLearning" ADD CONSTRAINT "MRPLearning_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAdaptation" ADD CONSTRAINT "PlanAdaptation_planGenerationId_fkey" FOREIGN KEY ("planGenerationId") REFERENCES "DailyPlanGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAdaptation" ADD CONSTRAINT "PlanAdaptation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCosting" ADD CONSTRAINT "ProjectCosting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostComponent" ADD CONSTRAINT "CostComponent_projectCostingId_fkey" FOREIGN KEY ("projectCostingId") REFERENCES "ProjectCosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingTier" ADD CONSTRAINT "PricingTier_projectCostingId_fkey" FOREIGN KEY ("projectCostingId") REFERENCES "ProjectCosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostingApproval" ADD CONSTRAINT "CostingApproval_projectCostingId_fkey" FOREIGN KEY ("projectCostingId") REFERENCES "ProjectCosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComponent" ADD CONSTRAINT "ProductComponent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComponent" ADD CONSTRAINT "ProductComponent_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProjectSku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentMaterial" ADD CONSTRAINT "ComponentMaterial_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "ProductComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentMaterial" ADD CONSTRAINT "ComponentMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationMachine" ADD CONSTRAINT "StationMachine_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationMachine" ADD CONSTRAINT "StationMachine_moldMasterId_fkey" FOREIGN KEY ("moldMasterId") REFERENCES "MoldMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProjectSku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAllocation" ADD CONSTRAINT "ResourceAllocation_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "StationMachine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeoverHistory" ADD CONSTRAINT "ChangeoverHistory_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "StationMachine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeoverHistory" ADD CONSTRAINT "ChangeoverHistory_fromProjectId_fkey" FOREIGN KEY ("fromProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeoverHistory" ADD CONSTRAINT "ChangeoverHistory_toProjectId_fkey" FOREIGN KEY ("toProjectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeoverHistory" ADD CONSTRAINT "ChangeoverHistory_fromSkuId_fkey" FOREIGN KEY ("fromSkuId") REFERENCES "ProjectSku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeoverHistory" ADD CONSTRAINT "ChangeoverHistory_toSkuId_fkey" FOREIGN KEY ("toSkuId") REFERENCES "ProjectSku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanGeneration" ADD CONSTRAINT "DailyPlanGeneration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanStationAuto" ADD CONSTRAINT "DailyPlanStationAuto_planGenerationId_fkey" FOREIGN KEY ("planGenerationId") REFERENCES "DailyPlanGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanStationAuto" ADD CONSTRAINT "DailyPlanStationAuto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanStationAuto" ADD CONSTRAINT "DailyPlanStationAuto_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "ProjectSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanStationAuto" ADD CONSTRAINT "DailyPlanStationAuto_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
