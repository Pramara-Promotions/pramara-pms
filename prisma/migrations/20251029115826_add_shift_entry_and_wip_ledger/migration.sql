-- CreateTable
CREATE TABLE "ShiftEntry" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "stationId" INTEGER,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "shiftType" TEXT NOT NULL,
    "shiftStartTime" TIMESTAMP(3) NOT NULL,
    "shiftEndTime" TIMESTAMP(3) NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "workersPresent" INTEGER NOT NULL DEFAULT 0,
    "workersAbsent" INTEGER NOT NULL DEFAULT 0,
    "totalProduced" INTEGER NOT NULL DEFAULT 0,
    "targetProduction" INTEGER,
    "qualityPassed" INTEGER NOT NULL DEFAULT 0,
    "qualityRejected" INTEGER NOT NULL DEFAULT 0,
    "downtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "downtimeReason" TEXT,
    "machineStatus" JSONB,
    "materialsUsed" JSONB,
    "issues" JSONB,
    "achievements" TEXT,
    "handoverNotes" TEXT,
    "efficiency" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WIPLedger" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "stationId" INTEGER,
    "batchId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionType" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "fromStationId" INTEGER,
    "toStationId" INTEGER,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "operationCode" TEXT,
    "operatorId" TEXT,
    "qualityStatus" TEXT,
    "remarks" TEXT,
    "costPerUnit" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "balanceQuantity" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WIPLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftEntry_projectId_idx" ON "ShiftEntry"("projectId");

-- CreateIndex
CREATE INDEX "ShiftEntry_stationId_idx" ON "ShiftEntry"("stationId");

-- CreateIndex
CREATE INDEX "ShiftEntry_shiftDate_idx" ON "ShiftEntry"("shiftDate");

-- CreateIndex
CREATE INDEX "ShiftEntry_supervisorId_idx" ON "ShiftEntry"("supervisorId");

-- CreateIndex
CREATE INDEX "ShiftEntry_status_idx" ON "ShiftEntry"("status");

-- CreateIndex
CREATE INDEX "WIPLedger_projectId_idx" ON "WIPLedger"("projectId");

-- CreateIndex
CREATE INDEX "WIPLedger_stationId_idx" ON "WIPLedger"("stationId");

-- CreateIndex
CREATE INDEX "WIPLedger_batchId_idx" ON "WIPLedger"("batchId");

-- CreateIndex
CREATE INDEX "WIPLedger_transactionDate_idx" ON "WIPLedger"("transactionDate");

-- CreateIndex
CREATE INDEX "WIPLedger_transactionType_idx" ON "WIPLedger"("transactionType");

-- CreateIndex
CREATE INDEX "WIPLedger_itemCode_idx" ON "WIPLedger"("itemCode");

-- CreateIndex
CREATE INDEX "WIPLedger_status_idx" ON "WIPLedger"("status");

-- AddForeignKey
ALTER TABLE "ShiftEntry" ADD CONSTRAINT "ShiftEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEntry" ADD CONSTRAINT "ShiftEntry_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEntry" ADD CONSTRAINT "ShiftEntry_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEntry" ADD CONSTRAINT "ShiftEntry_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEntry" ADD CONSTRAINT "ShiftEntry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WIPLedger" ADD CONSTRAINT "WIPLedger_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WIPLedger" ADD CONSTRAINT "WIPLedger_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WIPLedger" ADD CONSTRAINT "WIPLedger_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WIPLedger" ADD CONSTRAINT "WIPLedger_fromStationId_fkey" FOREIGN KEY ("fromStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WIPLedger" ADD CONSTRAINT "WIPLedger_toStationId_fkey" FOREIGN KEY ("toStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WIPLedger" ADD CONSTRAINT "WIPLedger_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WIPLedger" ADD CONSTRAINT "WIPLedger_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WIPLedger" ADD CONSTRAINT "WIPLedger_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
