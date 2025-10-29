-- CreateTable
CREATE TABLE "Mold" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "moldCode" TEXT NOT NULL,
    "moldName" TEXT NOT NULL,
    "supplierName" TEXT,
    "cavities" INTEGER NOT NULL DEFAULT 1,
    "material" TEXT,
    "dimensions" TEXT,
    "weight" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'designing',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Mold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trial" (
    "id" TEXT NOT NULL,
    "moldId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "trialNumber" INTEGER NOT NULL,
    "trialDate" TIMESTAMP(3) NOT NULL,
    "runBy" TEXT NOT NULL,
    "machineId" TEXT,
    "cycleTime" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "pressure" DOUBLE PRECISION,
    "samplesProduced" INTEGER,
    "defectsFound" INTEGER,
    "defectTypes" JSONB,
    "observations" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "nextSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingDesign" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "designCode" TEXT NOT NULL,
    "designName" TEXT NOT NULL,
    "packagingType" TEXT NOT NULL,
    "dimensions" TEXT,
    "material" TEXT,
    "printingMethod" TEXT,
    "colors" INTEGER,
    "designFileUrl" TEXT,
    "mockupFileUrl" TEXT,
    "supplierName" TEXT,
    "unitCost" DOUBLE PRECISION,
    "moq" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'concept',
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "parentDesignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackagingDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PPSApproval" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "ppsCode" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentUrl" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewers" JSONB NOT NULL,
    "currentStage" TEXT NOT NULL DEFAULT 'submission',
    "requiresChanges" BOOLEAN NOT NULL DEFAULT false,
    "changeRequests" JSONB,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PPSApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mold_projectId_idx" ON "Mold"("projectId");

-- CreateIndex
CREATE INDEX "Mold_status_idx" ON "Mold"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Mold_projectId_moldCode_key" ON "Mold"("projectId", "moldCode");

-- CreateIndex
CREATE INDEX "Trial_moldId_idx" ON "Trial"("moldId");

-- CreateIndex
CREATE INDEX "Trial_projectId_idx" ON "Trial"("projectId");

-- CreateIndex
CREATE INDEX "Trial_outcome_idx" ON "Trial"("outcome");

-- CreateIndex
CREATE INDEX "PackagingDesign_projectId_idx" ON "PackagingDesign"("projectId");

-- CreateIndex
CREATE INDEX "PackagingDesign_status_idx" ON "PackagingDesign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingDesign_projectId_designCode_key" ON "PackagingDesign"("projectId", "designCode");

-- CreateIndex
CREATE INDEX "PPSApproval_projectId_idx" ON "PPSApproval"("projectId");

-- CreateIndex
CREATE INDEX "PPSApproval_status_idx" ON "PPSApproval"("status");

-- CreateIndex
CREATE INDEX "PPSApproval_currentStage_idx" ON "PPSApproval"("currentStage");

-- CreateIndex
CREATE UNIQUE INDEX "PPSApproval_projectId_ppsCode_key" ON "PPSApproval"("projectId", "ppsCode");

-- AddForeignKey
ALTER TABLE "Mold" ADD CONSTRAINT "Mold_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mold" ADD CONSTRAINT "Mold_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_moldId_fkey" FOREIGN KEY ("moldId") REFERENCES "Mold"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_runBy_fkey" FOREIGN KEY ("runBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingDesign" ADD CONSTRAINT "PackagingDesign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingDesign" ADD CONSTRAINT "PackagingDesign_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingDesign" ADD CONSTRAINT "PackagingDesign_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingDesign" ADD CONSTRAINT "PackagingDesign_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingDesign" ADD CONSTRAINT "PackagingDesign_parentDesignId_fkey" FOREIGN KEY ("parentDesignId") REFERENCES "PackagingDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPSApproval" ADD CONSTRAINT "PPSApproval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPSApproval" ADD CONSTRAINT "PPSApproval_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPSApproval" ADD CONSTRAINT "PPSApproval_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPSApproval" ADD CONSTRAINT "PPSApproval_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
