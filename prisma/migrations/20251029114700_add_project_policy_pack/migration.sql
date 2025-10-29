-- CreateTable
CREATE TABLE "ProjectPolicy" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "policyType" TEXT NOT NULL,
    "policyTitle" TEXT NOT NULL,
    "policyDescription" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "documentUrl" TEXT,
    "responsiblePerson" TEXT NOT NULL,
    "reviewFrequency" INTEGER,
    "lastReviewDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "applicableStations" JSONB,
    "trainingRequired" BOOLEAN NOT NULL DEFAULT false,
    "trainingDocUrl" TEXT,
    "trainingCompletedBy" JSONB,
    "approvalHistory" JSONB,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectPolicy_projectId_idx" ON "ProjectPolicy"("projectId");

-- CreateIndex
CREATE INDEX "ProjectPolicy_policyType_idx" ON "ProjectPolicy"("policyType");

-- CreateIndex
CREATE INDEX "ProjectPolicy_status_idx" ON "ProjectPolicy"("status");

-- AddForeignKey
ALTER TABLE "ProjectPolicy" ADD CONSTRAINT "ProjectPolicy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPolicy" ADD CONSTRAINT "ProjectPolicy_responsiblePerson_fkey" FOREIGN KEY ("responsiblePerson") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPolicy" ADD CONSTRAINT "ProjectPolicy_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
