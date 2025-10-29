-- CreateTable
CREATE TABLE "ProcessFlow" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "flowName" TEXT NOT NULL,
    "flowDescription" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "totalOperations" INTEGER NOT NULL DEFAULT 0,
    "estimatedDuration" INTEGER,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessOperation" (
    "id" TEXT NOT NULL,
    "processFlowId" TEXT NOT NULL,
    "operationName" TEXT NOT NULL,
    "operationCode" TEXT NOT NULL,
    "operationDescription" TEXT,
    "sequence" INTEGER NOT NULL,
    "stationId" INTEGER,
    "machineRequired" TEXT,
    "skillLevel" TEXT,
    "estimatedTime" INTEGER,
    "standardOutput" INTEGER,
    "qualityCheckpoints" JSONB,
    "safetyRequirements" JSONB,
    "toolsRequired" JSONB,
    "predecessorIds" JSONB,
    "isParallel" BOOLEAN NOT NULL DEFAULT false,
    "isCriticalPath" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubOperation" (
    "id" TEXT NOT NULL,
    "processOperationId" TEXT NOT NULL,
    "subOperationName" TEXT NOT NULL,
    "subOperationCode" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL,
    "estimatedTime" INTEGER,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "checkpoints" JSONB,
    "instructions" TEXT,
    "imageUrls" JSONB,
    "videoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessFlow_projectId_idx" ON "ProcessFlow"("projectId");

-- CreateIndex
CREATE INDEX "ProcessFlow_status_idx" ON "ProcessFlow"("status");

-- CreateIndex
CREATE INDEX "ProcessOperation_processFlowId_idx" ON "ProcessOperation"("processFlowId");

-- CreateIndex
CREATE INDEX "ProcessOperation_stationId_idx" ON "ProcessOperation"("stationId");

-- CreateIndex
CREATE INDEX "ProcessOperation_sequence_idx" ON "ProcessOperation"("sequence");

-- CreateIndex
CREATE INDEX "SubOperation_processOperationId_idx" ON "SubOperation"("processOperationId");

-- CreateIndex
CREATE INDEX "SubOperation_sequence_idx" ON "SubOperation"("sequence");

-- AddForeignKey
ALTER TABLE "ProcessFlow" ADD CONSTRAINT "ProcessFlow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessFlow" ADD CONSTRAINT "ProcessFlow_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessOperation" ADD CONSTRAINT "ProcessOperation_processFlowId_fkey" FOREIGN KEY ("processFlowId") REFERENCES "ProcessFlow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessOperation" ADD CONSTRAINT "ProcessOperation_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubOperation" ADD CONSTRAINT "SubOperation_processOperationId_fkey" FOREIGN KEY ("processOperationId") REFERENCES "ProcessOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
