/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Station` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Station` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "avgOutputRate" DOUBLE PRECISION,
ADD COLUMN     "avgQualityRate" DOUBLE PRECISION,
ADD COLUMN     "capacity" INTEGER DEFAULT 1,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "roomId" INTEGER,
ADD COLUMN     "stationTypeId" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'operational',
ADD COLUMN     "totalJobsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Factory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT,
    "address" TEXT,
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Factory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" SERIAL NOT NULL,
    "factoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "floorId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "roomNumber" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "defaultSkills" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "stationId" INTEGER NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedBy" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStage" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "estimatedDays" INTEGER,
    "actualDays" INTEGER,
    "requiresQC" BOOLEAN NOT NULL DEFAULT false,
    "qcTemplateId" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalType" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTask" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDependency" (
    "id" TEXT NOT NULL,
    "fromStageId" TEXT NOT NULL,
    "toStageId" TEXT NOT NULL,
    "dependencyType" TEXT NOT NULL DEFAULT 'finish_to_start',
    "lagDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageDocument" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "documentType" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessConfig" (
    "id" TEXT NOT NULL,
    "stationId" INTEGER NOT NULL,
    "stationType" TEXT NOT NULL,
    "projectId" INTEGER,
    "projectSkuId" INTEGER,
    "cycleTimeSec" INTEGER,
    "cavities" INTEGER,
    "itemWeightGrams" DOUBLE PRECISION,
    "runnerWeightGrams" DOUBLE PRECISION,
    "setupTimeMins" INTEGER,
    "paintPerUnitMl" DOUBLE PRECISION,
    "thinnerPerUnitMl" DOUBLE PRECISION,
    "dryingTimeSec" INTEGER,
    "maskingSteps" INTEGER,
    "partsPerUnit" INTEGER,
    "assemblyTimeSec" INTEGER,
    "scrapRate" DOUBLE PRECISION DEFAULT 0.02,
    "machineCapacity" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionCalculation" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "stationId" INTEGER NOT NULL,
    "processConfigId" TEXT NOT NULL,
    "targetQty" INTEGER NOT NULL,
    "outputPerHour" DOUBLE PRECISION NOT NULL,
    "outputPerShift" DOUBLE PRECISION NOT NULL,
    "outputPerDay" DOUBLE PRECISION NOT NULL,
    "totalTimeRequired" DOUBLE PRECISION NOT NULL,
    "machinesRequired" INTEGER NOT NULL,
    "shiftsRequired" INTEGER NOT NULL,
    "materialConsumption" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionEntry" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "stationId" INTEGER NOT NULL,
    "shiftId" TEXT NOT NULL,
    "batchCode" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "targetQty" INTEGER NOT NULL,
    "actualQty" INTEGER NOT NULL,
    "rejectedQty" INTEGER NOT NULL DEFAULT 0,
    "materialUsed" JSONB NOT NULL,
    "materialVariance" JSONB,
    "outputVariance" DOUBLE PRECISION NOT NULL,
    "operatorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "costPerUnit" DOUBLE PRECISION,
    "stockQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStock" DOUBLE PRECISION,
    "reorderPoint" DOUBLE PRECISION,
    "leadTimeDays" INTEGER,
    "expiryTracking" BOOLEAN NOT NULL DEFAULT false,
    "supplier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialConsumption" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "stationId" INTEGER NOT NULL,
    "productionEntryId" TEXT,
    "plannedQty" DOUBLE PRECISION NOT NULL,
    "actualQty" DOUBLE PRECISION NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialLot" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "supplier" TEXT,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "initialQty" DOUBLE PRECISION NOT NULL,
    "currentQty" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "qcStatus" TEXT,
    "qcNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedInBatches" TEXT[],

    CONSTRAINT "MaterialLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "lotNumber" TEXT,
    "movementType" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "performedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReservation" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "dailyPlanId" TEXT,
    "stationId" INTEGER,
    "reservedQty" DOUBLE PRECISION NOT NULL,
    "reservedBy" TEXT NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "MaterialReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialForecast" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "forecastPeriod" TEXT NOT NULL,
    "plannedConsumption" DOUBLE PRECISION NOT NULL,
    "bufferStock" DOUBLE PRECISION NOT NULL,
    "expectedStock" DOUBLE PRECISION NOT NULL,
    "reorderNeeded" BOOLEAN NOT NULL DEFAULT false,
    "reorderQty" DOUBLE PRECISION,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workerType" TEXT NOT NULL,
    "providerId" TEXT,
    "skills" TEXT[],
    "certifications" JSONB,
    "shiftPreference" TEXT,
    "hireDate" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "hourlyRate" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThirdPartyProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "location" TEXT,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "rateStructure" TEXT,
    "turnoverRate" DOUBLE PRECISION DEFAULT 0,
    "attendanceRate" DOUBLE PRECISION DEFAULT 100,
    "performanceScore" DOUBLE PRECISION DEFAULT 0,
    "consistencyRating" DOUBLE PRECISION DEFAULT 0,
    "stabilityScore" DOUBLE PRECISION DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThirdPartyProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakDuration" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftPlan" (
    "id" TEXT NOT NULL,
    "dailyPlanId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "stationId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "assignedBy" TEXT,
    "assignmentReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftHandover" (
    "id" TEXT NOT NULL,
    "shiftPlanId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "outgoingWorker" TEXT NOT NULL,
    "incomingWorker" TEXT NOT NULL,
    "completedQty" INTEGER NOT NULL,
    "remainingQty" INTEGER NOT NULL,
    "issuesNoted" TEXT,
    "photos" TEXT[],
    "handoverTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerPerformance" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "stationId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shiftId" TEXT NOT NULL,
    "targetQty" INTEGER NOT NULL,
    "actualQty" INTEGER NOT NULL,
    "rejectedQty" INTEGER NOT NULL,
    "efficiency" DOUBLE PRECISION NOT NULL,
    "qualityRate" DOUBLE PRECISION NOT NULL,
    "completionTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPlan" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "factoryId" INTEGER,
    "scenario" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalTargetQty" INTEGER NOT NULL,
    "totalExpectedOutput" INTEGER NOT NULL,
    "estimatedCost" DOUBLE PRECISION,
    "reasoning" JSONB,
    "riskFactors" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "DailyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPlanStation" (
    "id" TEXT NOT NULL,
    "dailyPlanId" TEXT NOT NULL,
    "stationId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectSkuId" INTEGER,
    "targetQty" INTEGER NOT NULL,
    "shiftId" TEXT,
    "assignedWorkers" TEXT[],
    "workerAssignmentReason" JSONB,
    "materialsRequired" JSONB NOT NULL,
    "materialsReserved" BOOLEAN NOT NULL DEFAULT false,
    "equipmentStatus" TEXT NOT NULL DEFAULT 'operational',
    "dependencies" TEXT[],
    "dependenciesMet" BOOLEAN NOT NULL DEFAULT false,
    "blockingApprovalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "actualQty" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPlanStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAdaptation" (
    "id" TEXT NOT NULL,
    "dailyPlanId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "affectedStationId" INTEGER,
    "systemSuggestion" JSONB NOT NULL,
    "plannerDecision" TEXT,
    "plannerReason" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PlanAdaptation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerPreference" (
    "id" TEXT NOT NULL,
    "plannerId" TEXT NOT NULL,
    "preferenceType" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "systemSuggestion" TEXT NOT NULL,
    "plannerChoice" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "successRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannerPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "poNumber" TEXT,
    "projectSkuId" INTEGER NOT NULL,
    "targetQty" INTEGER NOT NULL,
    "currentQty" INTEGER NOT NULL,
    "rejectedQty" INTEGER NOT NULL DEFAULT 0,
    "currentStationId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "materialLots" JSONB NOT NULL,
    "machineId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchMovement" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "fromStationId" INTEGER,
    "toStationId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "operatorId" TEXT,
    "condition" TEXT,
    "photos" TEXT[],
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "workflowStageId" TEXT,
    "approvalType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiredFrom" TEXT NOT NULL,
    "requiredFromContact" TEXT,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "cutoffDate" TIMESTAMP(3) NOT NULL,
    "bufferDays" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "requestedChanges" TEXT,
    "delayedNewDate" TIMESTAMP(3),
    "delayReason" TEXT,
    "overrideBy" TEXT,
    "overrideReason" TEXT,
    "overrideRisk" TEXT,
    "overrideAt" TIMESTAMP(3),
    "attachments" TEXT[],

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalReminder" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "reminderDate" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "sentTo" TEXT[],
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "ApprovalReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Factory_code_key" ON "Factory"("code");

-- CreateIndex
CREATE INDEX "Factory_code_idx" ON "Factory"("code");

-- CreateIndex
CREATE INDEX "Floor_factoryId_idx" ON "Floor"("factoryId");

-- CreateIndex
CREATE INDEX "Section_floorId_idx" ON "Section"("floorId");

-- CreateIndex
CREATE INDEX "Room_sectionId_idx" ON "Room"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "StationType_name_key" ON "StationType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StationType_code_key" ON "StationType"("code");

-- CreateIndex
CREATE INDEX "StationType_code_idx" ON "StationType"("code");

-- CreateIndex
CREATE INDEX "MaintenanceLog_stationId_idx" ON "MaintenanceLog"("stationId");

-- CreateIndex
CREATE INDEX "MaintenanceLog_startTime_idx" ON "MaintenanceLog"("startTime");

-- CreateIndex
CREATE INDEX "WorkflowStage_projectId_idx" ON "WorkflowStage"("projectId");

-- CreateIndex
CREATE INDEX "WorkflowStage_sequence_idx" ON "WorkflowStage"("sequence");

-- CreateIndex
CREATE INDEX "WorkflowStage_status_idx" ON "WorkflowStage"("status");

-- CreateIndex
CREATE INDEX "WorkflowTask_stageId_idx" ON "WorkflowTask"("stageId");

-- CreateIndex
CREATE INDEX "WorkflowTask_status_idx" ON "WorkflowTask"("status");

-- CreateIndex
CREATE INDEX "WorkflowDependency_fromStageId_idx" ON "WorkflowDependency"("fromStageId");

-- CreateIndex
CREATE INDEX "WorkflowDependency_toStageId_idx" ON "WorkflowDependency"("toStageId");

-- CreateIndex
CREATE INDEX "StageDocument_stageId_idx" ON "StageDocument"("stageId");

-- CreateIndex
CREATE INDEX "ProcessConfig_stationId_idx" ON "ProcessConfig"("stationId");

-- CreateIndex
CREATE INDEX "ProcessConfig_projectId_idx" ON "ProcessConfig"("projectId");

-- CreateIndex
CREATE INDEX "ProductionCalculation_projectId_idx" ON "ProductionCalculation"("projectId");

-- CreateIndex
CREATE INDEX "ProductionCalculation_stationId_idx" ON "ProductionCalculation"("stationId");

-- CreateIndex
CREATE INDEX "ProductionEntry_projectId_idx" ON "ProductionEntry"("projectId");

-- CreateIndex
CREATE INDEX "ProductionEntry_stationId_idx" ON "ProductionEntry"("stationId");

-- CreateIndex
CREATE INDEX "ProductionEntry_shiftId_idx" ON "ProductionEntry"("shiftId");

-- CreateIndex
CREATE INDEX "Material_type_idx" ON "Material"("type");

-- CreateIndex
CREATE INDEX "Material_stockQty_idx" ON "Material"("stockQty");

-- CreateIndex
CREATE INDEX "MaterialConsumption_materialId_idx" ON "MaterialConsumption"("materialId");

-- CreateIndex
CREATE INDEX "MaterialConsumption_projectId_idx" ON "MaterialConsumption"("projectId");

-- CreateIndex
CREATE INDEX "MaterialConsumption_stationId_idx" ON "MaterialConsumption"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialLot_lotNumber_key" ON "MaterialLot"("lotNumber");

-- CreateIndex
CREATE INDEX "MaterialLot_lotNumber_idx" ON "MaterialLot"("lotNumber");

-- CreateIndex
CREATE INDEX "MaterialLot_materialId_idx" ON "MaterialLot"("materialId");

-- CreateIndex
CREATE INDEX "MaterialLot_status_idx" ON "MaterialLot"("status");

-- CreateIndex
CREATE INDEX "StockMovement_materialId_idx" ON "StockMovement"("materialId");

-- CreateIndex
CREATE INDEX "StockMovement_movementType_idx" ON "StockMovement"("movementType");

-- CreateIndex
CREATE INDEX "StockMovement_timestamp_idx" ON "StockMovement"("timestamp");

-- CreateIndex
CREATE INDEX "MaterialReservation_materialId_idx" ON "MaterialReservation"("materialId");

-- CreateIndex
CREATE INDEX "MaterialReservation_dailyPlanId_idx" ON "MaterialReservation"("dailyPlanId");

-- CreateIndex
CREATE INDEX "MaterialReservation_status_idx" ON "MaterialReservation"("status");

-- CreateIndex
CREATE INDEX "MaterialForecast_materialId_idx" ON "MaterialForecast"("materialId");

-- CreateIndex
CREATE INDEX "MaterialForecast_forecastDate_idx" ON "MaterialForecast"("forecastDate");

-- CreateIndex
CREATE INDEX "Worker_workerType_idx" ON "Worker"("workerType");

-- CreateIndex
CREATE INDEX "Worker_providerId_idx" ON "Worker"("providerId");

-- CreateIndex
CREATE INDEX "Worker_status_idx" ON "Worker"("status");

-- CreateIndex
CREATE INDEX "ThirdPartyProvider_stabilityScore_idx" ON "ThirdPartyProvider"("stabilityScore");

-- CreateIndex
CREATE INDEX "ShiftPlan_dailyPlanId_idx" ON "ShiftPlan"("dailyPlanId");

-- CreateIndex
CREATE INDEX "ShiftPlan_workerId_idx" ON "ShiftPlan"("workerId");

-- CreateIndex
CREATE INDEX "ShiftPlan_stationId_idx" ON "ShiftPlan"("stationId");

-- CreateIndex
CREATE INDEX "ShiftPlan_date_idx" ON "ShiftPlan"("date");

-- CreateIndex
CREATE INDEX "ShiftHandover_shiftPlanId_idx" ON "ShiftHandover"("shiftPlanId");

-- CreateIndex
CREATE INDEX "ShiftHandover_projectId_idx" ON "ShiftHandover"("projectId");

-- CreateIndex
CREATE INDEX "WorkerPerformance_workerId_idx" ON "WorkerPerformance"("workerId");

-- CreateIndex
CREATE INDEX "WorkerPerformance_projectId_idx" ON "WorkerPerformance"("projectId");

-- CreateIndex
CREATE INDEX "WorkerPerformance_date_idx" ON "WorkerPerformance"("date");

-- CreateIndex
CREATE INDEX "DailyPlan_date_idx" ON "DailyPlan"("date");

-- CreateIndex
CREATE INDEX "DailyPlan_factoryId_idx" ON "DailyPlan"("factoryId");

-- CreateIndex
CREATE INDEX "DailyPlanStation_dailyPlanId_idx" ON "DailyPlanStation"("dailyPlanId");

-- CreateIndex
CREATE INDEX "DailyPlanStation_stationId_idx" ON "DailyPlanStation"("stationId");

-- CreateIndex
CREATE INDEX "DailyPlanStation_projectId_idx" ON "DailyPlanStation"("projectId");

-- CreateIndex
CREATE INDEX "PlanAdaptation_dailyPlanId_idx" ON "PlanAdaptation"("dailyPlanId");

-- CreateIndex
CREATE INDEX "PlanAdaptation_trigger_idx" ON "PlanAdaptation"("trigger");

-- CreateIndex
CREATE INDEX "PlannerPreference_plannerId_idx" ON "PlannerPreference"("plannerId");

-- CreateIndex
CREATE INDEX "PlannerPreference_preferenceType_idx" ON "PlannerPreference"("preferenceType");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchCode_key" ON "Batch"("batchCode");

-- CreateIndex
CREATE INDEX "Batch_batchCode_idx" ON "Batch"("batchCode");

-- CreateIndex
CREATE INDEX "Batch_projectId_idx" ON "Batch"("projectId");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- CreateIndex
CREATE INDEX "Batch_currentStationId_idx" ON "Batch"("currentStationId");

-- CreateIndex
CREATE INDEX "BatchMovement_batchId_idx" ON "BatchMovement"("batchId");

-- CreateIndex
CREATE INDEX "BatchMovement_toStationId_idx" ON "BatchMovement"("toStationId");

-- CreateIndex
CREATE INDEX "BatchMovement_timestamp_idx" ON "BatchMovement"("timestamp");

-- CreateIndex
CREATE INDEX "ApprovalRequest_projectId_idx" ON "ApprovalRequest"("projectId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_cutoffDate_idx" ON "ApprovalRequest"("cutoffDate");

-- CreateIndex
CREATE INDEX "ApprovalReminder_approvalRequestId_idx" ON "ApprovalReminder"("approvalRequestId");

-- CreateIndex
CREATE INDEX "ApprovalReminder_reminderDate_idx" ON "ApprovalReminder"("reminderDate");

-- CreateIndex
CREATE INDEX "ApprovalReminder_status_idx" ON "ApprovalReminder"("status");

-- CreateIndex
CREATE INDEX "QCSubmission_batchCode_idx" ON "QCSubmission"("batchCode");

-- CreateIndex
CREATE UNIQUE INDEX "Station_code_key" ON "Station"("code");

-- CreateIndex
CREATE INDEX "Station_projectId_idx" ON "Station"("projectId");

-- CreateIndex
CREATE INDEX "Station_roomId_idx" ON "Station"("roomId");

-- CreateIndex
CREATE INDEX "Station_stationTypeId_idx" ON "Station"("stationTypeId");

-- CreateIndex
CREATE INDEX "Station_code_idx" ON "Station"("code");

-- CreateIndex
CREATE INDEX "Station_status_idx" ON "Station"("status");

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_stationTypeId_fkey" FOREIGN KEY ("stationTypeId") REFERENCES "StationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCSubmission" ADD CONSTRAINT "QCSubmission_batchCode_fkey" FOREIGN KEY ("batchCode") REFERENCES "Batch"("batchCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStage" ADD CONSTRAINT "WorkflowStage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStage" ADD CONSTRAINT "WorkflowStage_qcTemplateId_fkey" FOREIGN KEY ("qcTemplateId") REFERENCES "QCChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "WorkflowStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDependency" ADD CONSTRAINT "WorkflowDependency_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "WorkflowStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDependency" ADD CONSTRAINT "WorkflowDependency_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "WorkflowStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageDocument" ADD CONSTRAINT "StageDocument_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "WorkflowStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessConfig" ADD CONSTRAINT "ProcessConfig_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessConfig" ADD CONSTRAINT "ProcessConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessConfig" ADD CONSTRAINT "ProcessConfig_projectSkuId_fkey" FOREIGN KEY ("projectSkuId") REFERENCES "ProjectSku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionCalculation" ADD CONSTRAINT "ProductionCalculation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionCalculation" ADD CONSTRAINT "ProductionCalculation_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionCalculation" ADD CONSTRAINT "ProductionCalculation_processConfigId_fkey" FOREIGN KEY ("processConfigId") REFERENCES "ProcessConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEntry" ADD CONSTRAINT "ProductionEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEntry" ADD CONSTRAINT "ProductionEntry_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEntry" ADD CONSTRAINT "ProductionEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConsumption" ADD CONSTRAINT "MaterialConsumption_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConsumption" ADD CONSTRAINT "MaterialConsumption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConsumption" ADD CONSTRAINT "MaterialConsumption_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialConsumption" ADD CONSTRAINT "MaterialConsumption_productionEntryId_fkey" FOREIGN KEY ("productionEntryId") REFERENCES "ProductionEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialLot" ADD CONSTRAINT "MaterialLot_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReservation" ADD CONSTRAINT "MaterialReservation_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReservation" ADD CONSTRAINT "MaterialReservation_dailyPlanId_fkey" FOREIGN KEY ("dailyPlanId") REFERENCES "DailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialForecast" ADD CONSTRAINT "MaterialForecast_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ThirdPartyProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlan" ADD CONSTRAINT "ShiftPlan_dailyPlanId_fkey" FOREIGN KEY ("dailyPlanId") REFERENCES "DailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlan" ADD CONSTRAINT "ShiftPlan_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlan" ADD CONSTRAINT "ShiftPlan_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPlan" ADD CONSTRAINT "ShiftPlan_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_shiftPlanId_fkey" FOREIGN KEY ("shiftPlanId") REFERENCES "ShiftPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerPerformance" ADD CONSTRAINT "WorkerPerformance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerPerformance" ADD CONSTRAINT "WorkerPerformance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerPerformance" ADD CONSTRAINT "WorkerPerformance_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanStation" ADD CONSTRAINT "DailyPlanStation_dailyPlanId_fkey" FOREIGN KEY ("dailyPlanId") REFERENCES "DailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanStation" ADD CONSTRAINT "DailyPlanStation_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanStation" ADD CONSTRAINT "DailyPlanStation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanStation" ADD CONSTRAINT "DailyPlanStation_projectSkuId_fkey" FOREIGN KEY ("projectSkuId") REFERENCES "ProjectSku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAdaptation" ADD CONSTRAINT "PlanAdaptation_dailyPlanId_fkey" FOREIGN KEY ("dailyPlanId") REFERENCES "DailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_projectSkuId_fkey" FOREIGN KEY ("projectSkuId") REFERENCES "ProjectSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_currentStationId_fkey" FOREIGN KEY ("currentStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMovement" ADD CONSTRAINT "BatchMovement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMovement" ADD CONSTRAINT "BatchMovement_fromStationId_fkey" FOREIGN KEY ("fromStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMovement" ADD CONSTRAINT "BatchMovement_toStationId_fkey" FOREIGN KEY ("toStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_workflowStageId_fkey" FOREIGN KEY ("workflowStageId") REFERENCES "WorkflowStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalReminder" ADD CONSTRAINT "ApprovalReminder_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
