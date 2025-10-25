-- CreateEnum
CREATE TYPE "QCItemType" AS ENUM ('boolean', 'number', 'text', 'enum', 'photo', 'color');

-- CreateEnum
CREATE TYPE "QCSeverity" AS ENUM ('INFO', 'MINOR', 'MAJOR', 'CRITICAL');

-- CreateTable
CREATE TABLE "QCChecklistTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" INTEGER,
    "stationId" INTEGER,
    "projectSkuId" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QCChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QCItemTemplate" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "QCItemType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT,
    "min" DOUBLE PRECISION,
    "max" DOUBLE PRECISION,
    "tolerance" DOUBLE PRECISION,
    "options" TEXT[],
    "severity" "QCSeverity" NOT NULL DEFAULT 'MINOR',
    "photoRequired" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "condition" JSONB,
    "alertKey" TEXT,
    "helpText" TEXT,

    CONSTRAINT "QCItemTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QCSubmission" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "stationId" INTEGER NOT NULL,
    "projectSkuId" INTEGER,
    "batchCode" TEXT,
    "shift" TEXT,
    "operatorId" TEXT,
    "notes" TEXT,
    "overallPass" BOOLEAN NOT NULL DEFAULT true,
    "photos" TEXT[],
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QCSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QCItemResult" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "itemTemplateId" TEXT,
    "code" TEXT NOT NULL,
    "type" "QCItemType" NOT NULL,
    "valueString" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBool" BOOLEAN,
    "valueEnum" TEXT,
    "valueJson" JSONB,
    "pass" BOOLEAN NOT NULL DEFAULT true,
    "photoKeys" TEXT[],

    CONSTRAINT "QCItemResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QCChecklistTemplate_projectId_idx" ON "QCChecklistTemplate"("projectId");

-- CreateIndex
CREATE INDEX "QCChecklistTemplate_stationId_idx" ON "QCChecklistTemplate"("stationId");

-- CreateIndex
CREATE INDEX "QCChecklistTemplate_projectSkuId_idx" ON "QCChecklistTemplate"("projectSkuId");

-- CreateIndex
CREATE INDEX "QCItemTemplate_templateId_idx" ON "QCItemTemplate"("templateId");

-- CreateIndex
CREATE INDEX "QCItemTemplate_code_idx" ON "QCItemTemplate"("code");

-- CreateIndex
CREATE INDEX "QCSubmission_projectId_idx" ON "QCSubmission"("projectId");

-- CreateIndex
CREATE INDEX "QCSubmission_stationId_idx" ON "QCSubmission"("stationId");

-- CreateIndex
CREATE INDEX "QCSubmission_projectSkuId_idx" ON "QCSubmission"("projectSkuId");

-- CreateIndex
CREATE INDEX "QCSubmission_submittedAt_idx" ON "QCSubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "QCItemResult_submissionId_idx" ON "QCItemResult"("submissionId");

-- CreateIndex
CREATE INDEX "QCItemResult_code_idx" ON "QCItemResult"("code");

-- AddForeignKey
ALTER TABLE "QCChecklistTemplate" ADD CONSTRAINT "QCChecklistTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCChecklistTemplate" ADD CONSTRAINT "QCChecklistTemplate_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCChecklistTemplate" ADD CONSTRAINT "QCChecklistTemplate_projectSkuId_fkey" FOREIGN KEY ("projectSkuId") REFERENCES "ProjectSku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCItemTemplate" ADD CONSTRAINT "QCItemTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QCChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCSubmission" ADD CONSTRAINT "QCSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCSubmission" ADD CONSTRAINT "QCSubmission_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCSubmission" ADD CONSTRAINT "QCSubmission_projectSkuId_fkey" FOREIGN KEY ("projectSkuId") REFERENCES "ProjectSku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCSubmission" ADD CONSTRAINT "QCSubmission_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QCChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCItemResult" ADD CONSTRAINT "QCItemResult_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "QCSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCItemResult" ADD CONSTRAINT "QCItemResult_itemTemplateId_fkey" FOREIGN KEY ("itemTemplateId") REFERENCES "QCItemTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
