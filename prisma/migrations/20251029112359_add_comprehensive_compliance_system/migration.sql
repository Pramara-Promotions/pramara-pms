-- CreateTable
CREATE TABLE "CompanyCertification" (
    "id" TEXT NOT NULL,
    "certificationType" TEXT NOT NULL,
    "certificationName" TEXT NOT NULL,
    "certificationBody" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "certificateFileUrl" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "lastAuditDate" TIMESTAMP(3),
    "nextAuditDate" TIMESTAMP(3),
    "auditScheduled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "scope" TEXT,
    "responsiblePerson" TEXT NOT NULL,
    "reminderDays" INTEGER NOT NULL DEFAULT 90,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAudit" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "auditType" TEXT NOT NULL,
    "auditDate" TIMESTAMP(3) NOT NULL,
    "auditDuration" INTEGER,
    "auditorName" TEXT NOT NULL,
    "auditorCompany" TEXT NOT NULL,
    "findings" JSONB,
    "correctiveActions" JSONB,
    "auditReportUrl" TEXT,
    "outcome" TEXT NOT NULL,
    "nextAuditDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCompliance" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "complianceType" TEXT NOT NULL,
    "complianceName" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "requiredBy" TIMESTAMP(3),
    "certificationBody" TEXT,
    "responsiblePerson" TEXT NOT NULL,
    "blocksProduction" BOOLEAN NOT NULL DEFAULT false,
    "blocksShipment" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRequirement" (
    "id" TEXT NOT NULL,
    "complianceId" TEXT NOT NULL,
    "requirementType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "verificationMethod" TEXT,
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "verificationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceDocument" (
    "id" TEXT NOT NULL,
    "complianceId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentNumber" TEXT,
    "fileUrl" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "issuedBy" TEXT,
    "relatedTo" TEXT,
    "quantity" DOUBLE PRECISION,
    "quantityUnit" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "complianceId" TEXT,
    "testType" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "labName" TEXT NOT NULL,
    "labAccreditation" TEXT,
    "sampleCode" TEXT,
    "sampleDescription" TEXT,
    "testStandard" TEXT,
    "testDate" TIMESTAMP(3) NOT NULL,
    "reportDate" TIMESTAMP(3),
    "reportNumber" TEXT,
    "reportFileUrl" TEXT,
    "result" TEXT NOT NULL,
    "resultDetails" JSONB,
    "retestRequired" BOOLEAN NOT NULL DEFAULT false,
    "retestDueDate" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "costCurrency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCompliance" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "materialName" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "complianceType" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "certificateFileUrl" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "purchaseInvoiceNumber" TEXT,
    "purchaseInvoiceUrl" TEXT,
    "purchaseQuantity" DOUBLE PRECISION,
    "purchaseUnit" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "usedQuantity" DOUBLE PRECISION DEFAULT 0,
    "remainingQuantity" DOUBLE PRECISION,
    "traceable" BOOLEAN NOT NULL DEFAULT false,
    "traceabilityDocs" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCompliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceReminder" (
    "id" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "certificationId" TEXT,
    "projectId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assignedTo" TEXT NOT NULL,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "snoozeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyCertification_expiryDate_idx" ON "CompanyCertification"("expiryDate");

-- CreateIndex
CREATE INDEX "CompanyCertification_status_idx" ON "CompanyCertification"("status");

-- CreateIndex
CREATE INDEX "CompanyCertification_certificationType_idx" ON "CompanyCertification"("certificationType");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyCertification_certificationType_certificateNumber_key" ON "CompanyCertification"("certificationType", "certificateNumber");

-- CreateIndex
CREATE INDEX "ComplianceAudit_certificationId_idx" ON "ComplianceAudit"("certificationId");

-- CreateIndex
CREATE INDEX "ComplianceAudit_auditDate_idx" ON "ComplianceAudit"("auditDate");

-- CreateIndex
CREATE INDEX "ComplianceAudit_outcome_idx" ON "ComplianceAudit"("outcome");

-- CreateIndex
CREATE INDEX "ProjectCompliance_projectId_idx" ON "ProjectCompliance"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCompliance_status_idx" ON "ProjectCompliance"("status");

-- CreateIndex
CREATE INDEX "ProjectCompliance_complianceType_idx" ON "ProjectCompliance"("complianceType");

-- CreateIndex
CREATE INDEX "ProjectCompliance_responsiblePerson_idx" ON "ProjectCompliance"("responsiblePerson");

-- CreateIndex
CREATE INDEX "ComplianceRequirement_complianceId_idx" ON "ComplianceRequirement"("complianceId");

-- CreateIndex
CREATE INDEX "ComplianceRequirement_status_idx" ON "ComplianceRequirement"("status");

-- CreateIndex
CREATE INDEX "ComplianceRequirement_assignedTo_idx" ON "ComplianceRequirement"("assignedTo");

-- CreateIndex
CREATE INDEX "ComplianceDocument_complianceId_idx" ON "ComplianceDocument"("complianceId");

-- CreateIndex
CREATE INDEX "ComplianceDocument_documentType_idx" ON "ComplianceDocument"("documentType");

-- CreateIndex
CREATE INDEX "ComplianceDocument_status_idx" ON "ComplianceDocument"("status");

-- CreateIndex
CREATE INDEX "ComplianceDocument_expiryDate_idx" ON "ComplianceDocument"("expiryDate");

-- CreateIndex
CREATE INDEX "LabTest_projectId_idx" ON "LabTest"("projectId");

-- CreateIndex
CREATE INDEX "LabTest_complianceId_idx" ON "LabTest"("complianceId");

-- CreateIndex
CREATE INDEX "LabTest_testType_idx" ON "LabTest"("testType");

-- CreateIndex
CREATE INDEX "LabTest_result_idx" ON "LabTest"("result");

-- CreateIndex
CREATE INDEX "LabTest_testDate_idx" ON "LabTest"("testDate");

-- CreateIndex
CREATE INDEX "MaterialCompliance_projectId_idx" ON "MaterialCompliance"("projectId");

-- CreateIndex
CREATE INDEX "MaterialCompliance_complianceType_idx" ON "MaterialCompliance"("complianceType");

-- CreateIndex
CREATE INDEX "MaterialCompliance_supplierName_idx" ON "MaterialCompliance"("supplierName");

-- CreateIndex
CREATE INDEX "MaterialCompliance_status_idx" ON "MaterialCompliance"("status");

-- CreateIndex
CREATE INDEX "ComplianceReminder_certificationId_idx" ON "ComplianceReminder"("certificationId");

-- CreateIndex
CREATE INDEX "ComplianceReminder_projectId_idx" ON "ComplianceReminder"("projectId");

-- CreateIndex
CREATE INDEX "ComplianceReminder_assignedTo_idx" ON "ComplianceReminder"("assignedTo");

-- CreateIndex
CREATE INDEX "ComplianceReminder_dueDate_idx" ON "ComplianceReminder"("dueDate");

-- CreateIndex
CREATE INDEX "ComplianceReminder_completed_idx" ON "ComplianceReminder"("completed");

-- AddForeignKey
ALTER TABLE "CompanyCertification" ADD CONSTRAINT "CompanyCertification_responsiblePerson_fkey" FOREIGN KEY ("responsiblePerson") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAudit" ADD CONSTRAINT "ComplianceAudit_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "CompanyCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCompliance" ADD CONSTRAINT "ProjectCompliance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCompliance" ADD CONSTRAINT "ProjectCompliance_responsiblePerson_fkey" FOREIGN KEY ("responsiblePerson") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_complianceId_fkey" FOREIGN KEY ("complianceId") REFERENCES "ProjectCompliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_complianceId_fkey" FOREIGN KEY ("complianceId") REFERENCES "ProjectCompliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_complianceId_fkey" FOREIGN KEY ("complianceId") REFERENCES "ProjectCompliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCompliance" ADD CONSTRAINT "MaterialCompliance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCompliance" ADD CONSTRAINT "MaterialCompliance_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialCompliance" ADD CONSTRAINT "MaterialCompliance_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceReminder" ADD CONSTRAINT "ComplianceReminder_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "CompanyCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceReminder" ADD CONSTRAINT "ComplianceReminder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceReminder" ADD CONSTRAINT "ComplianceReminder_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceReminder" ADD CONSTRAINT "ComplianceReminder_acknowledgedBy_fkey" FOREIGN KEY ("acknowledgedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
