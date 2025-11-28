-- AlterTable
ALTER TABLE "DailyPlanGeneration" ADD COLUMN     "bottleneckOperation" TEXT,
ADD COLUMN     "effectiveCapacity" INTEGER,
ADD COLUMN     "planningStrategy" TEXT NOT NULL DEFAULT 'bottleneck',
ADD COLUMN     "processFlowId" TEXT;

-- CreateTable
CREATE TABLE "ProjectWorkflowStatus" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "processFlowComplete" BOOLEAN NOT NULL DEFAULT false,
    "processFlowCompletedAt" TIMESTAMP(3),
    "processFlowOperationCount" INTEGER NOT NULL DEFAULT 0,
    "bomComplete" BOOLEAN NOT NULL DEFAULT false,
    "bomCompletedAt" TIMESTAMP(3),
    "bomComponentCount" INTEGER NOT NULL DEFAULT 0,
    "moldsAssigned" BOOLEAN NOT NULL DEFAULT false,
    "moldsAssignedAt" TIMESTAMP(3),
    "moldCount" INTEGER NOT NULL DEFAULT 0,
    "trialsComplete" BOOLEAN NOT NULL DEFAULT false,
    "trialsCompletedAt" TIMESTAMP(3),
    "approvedTrialCount" INTEGER NOT NULL DEFAULT 0,
    "costingComplete" BOOLEAN NOT NULL DEFAULT false,
    "costingCompletedAt" TIMESTAMP(3),
    "finalCostPerUnit" DOUBLE PRECISION,
    "marginPercent" DOUBLE PRECISION,
    "poReceived" BOOLEAN NOT NULL DEFAULT false,
    "poReceivedAt" TIMESTAMP(3),
    "poNumber" TEXT,
    "poQuantity" INTEGER,
    "poCutoffDate" TIMESTAMP(3),
    "canPlan" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWorkflowStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAvailabilityEvent" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "reason" TEXT,
    "detectedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceAvailabilityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadBalancingOpportunity" (
    "id" TEXT NOT NULL,
    "availabilityEventId" TEXT,
    "planId" TEXT NOT NULL,
    "opportunityType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "currentBottleneck" TEXT,
    "proposedChanges" JSONB NOT NULL,
    "estimatedTimeSaved" DOUBLE PRECISION,
    "estimatedCostSaved" DOUBLE PRECISION,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "implementedAt" TIMESTAMP(3),
    "actualImpact" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "LoadBalancingOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "processType" TEXT NOT NULL,
    "subType" TEXT,
    "description" TEXT,
    "isSystemDefined" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "structure" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "ProcessTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessPlanDetail" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sequence" INTEGER NOT NULL,
    "inputCapacity" INTEGER,
    "operationCapacity" INTEGER NOT NULL,
    "effectiveOutput" INTEGER NOT NULL,
    "isBottleneck" BOOLEAN NOT NULL DEFAULT false,
    "stationId" INTEGER,
    "assignedMachines" INTEGER NOT NULL DEFAULT 1,
    "machineIds" JSONB,
    "assignedWorkers" INTEGER,
    "capacityUtilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hoursRequired" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "actualOutput" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessPlanDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanModificationHistory" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "detailId" TEXT,
    "changeType" TEXT NOT NULL,
    "fieldChanged" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "impactAnalysis" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanModificationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanConflict" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "affectedDetails" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "suggestion" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanConflict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWorkflowStatus_projectId_key" ON "ProjectWorkflowStatus"("projectId");

-- CreateIndex
CREATE INDEX "ProjectWorkflowStatus_canPlan_idx" ON "ProjectWorkflowStatus"("canPlan");

-- CreateIndex
CREATE INDEX "ProjectWorkflowStatus_projectId_idx" ON "ProjectWorkflowStatus"("projectId");

-- CreateIndex
CREATE INDEX "ResourceAvailabilityEvent_resourceType_idx" ON "ResourceAvailabilityEvent"("resourceType");

-- CreateIndex
CREATE INDEX "ResourceAvailabilityEvent_eventType_idx" ON "ResourceAvailabilityEvent"("eventType");

-- CreateIndex
CREATE INDEX "ResourceAvailabilityEvent_effectiveFrom_idx" ON "ResourceAvailabilityEvent"("effectiveFrom");

-- CreateIndex
CREATE INDEX "ResourceAvailabilityEvent_createdAt_idx" ON "ResourceAvailabilityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "LoadBalancingOpportunity_planId_idx" ON "LoadBalancingOpportunity"("planId");

-- CreateIndex
CREATE INDEX "LoadBalancingOpportunity_availabilityEventId_idx" ON "LoadBalancingOpportunity"("availabilityEventId");

-- CreateIndex
CREATE INDEX "LoadBalancingOpportunity_opportunityType_idx" ON "LoadBalancingOpportunity"("opportunityType");

-- CreateIndex
CREATE INDEX "LoadBalancingOpportunity_status_idx" ON "LoadBalancingOpportunity"("status");

-- CreateIndex
CREATE INDEX "LoadBalancingOpportunity_priority_idx" ON "LoadBalancingOpportunity"("priority");

-- CreateIndex
CREATE INDEX "LoadBalancingOpportunity_createdAt_idx" ON "LoadBalancingOpportunity"("createdAt");

-- CreateIndex
CREATE INDEX "ProcessTemplate_processType_subType_idx" ON "ProcessTemplate"("processType", "subType");

-- CreateIndex
CREATE INDEX "ProcessTemplate_usageCount_idx" ON "ProcessTemplate"("usageCount");

-- CreateIndex
CREATE INDEX "ProcessTemplate_successRate_idx" ON "ProcessTemplate"("successRate");

-- CreateIndex
CREATE INDEX "ProcessPlanDetail_planId_idx" ON "ProcessPlanDetail"("planId");

-- CreateIndex
CREATE INDEX "ProcessPlanDetail_date_idx" ON "ProcessPlanDetail"("date");

-- CreateIndex
CREATE INDEX "ProcessPlanDetail_operationId_idx" ON "ProcessPlanDetail"("operationId");

-- CreateIndex
CREATE INDEX "ProcessPlanDetail_status_idx" ON "ProcessPlanDetail"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessPlanDetail_planId_operationId_date_key" ON "ProcessPlanDetail"("planId", "operationId", "date");

-- CreateIndex
CREATE INDEX "PlanModificationHistory_planId_idx" ON "PlanModificationHistory"("planId");

-- CreateIndex
CREATE INDEX "PlanModificationHistory_detailId_idx" ON "PlanModificationHistory"("detailId");

-- CreateIndex
CREATE INDEX "PlanModificationHistory_changeType_idx" ON "PlanModificationHistory"("changeType");

-- CreateIndex
CREATE INDEX "PlanModificationHistory_createdAt_idx" ON "PlanModificationHistory"("createdAt");

-- CreateIndex
CREATE INDEX "PlanConflict_planId_idx" ON "PlanConflict"("planId");

-- CreateIndex
CREATE INDEX "PlanConflict_conflictType_idx" ON "PlanConflict"("conflictType");

-- CreateIndex
CREATE INDEX "PlanConflict_severity_idx" ON "PlanConflict"("severity");

-- CreateIndex
CREATE INDEX "PlanConflict_resolved_idx" ON "PlanConflict"("resolved");

-- CreateIndex
CREATE INDEX "DailyPlanGeneration_processFlowId_idx" ON "DailyPlanGeneration"("processFlowId");

-- CreateIndex
CREATE INDEX "PlanAdaptation_createdAt_idx" ON "PlanAdaptation"("createdAt");

-- AddForeignKey
ALTER TABLE "ProjectWorkflowStatus" ADD CONSTRAINT "ProjectWorkflowStatus_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadBalancingOpportunity" ADD CONSTRAINT "LoadBalancingOpportunity_availabilityEventId_fkey" FOREIGN KEY ("availabilityEventId") REFERENCES "ResourceAvailabilityEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadBalancingOpportunity" ADD CONSTRAINT "LoadBalancingOpportunity_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DailyPlanGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessTemplate" ADD CONSTRAINT "ProcessTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlanGeneration" ADD CONSTRAINT "DailyPlanGeneration_processFlowId_fkey" FOREIGN KEY ("processFlowId") REFERENCES "ProcessFlow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessPlanDetail" ADD CONSTRAINT "ProcessPlanDetail_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DailyPlanGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessPlanDetail" ADD CONSTRAINT "ProcessPlanDetail_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "ProcessOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessPlanDetail" ADD CONSTRAINT "ProcessPlanDetail_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanModificationHistory" ADD CONSTRAINT "PlanModificationHistory_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DailyPlanGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanModificationHistory" ADD CONSTRAINT "PlanModificationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanConflict" ADD CONSTRAINT "PlanConflict_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DailyPlanGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
