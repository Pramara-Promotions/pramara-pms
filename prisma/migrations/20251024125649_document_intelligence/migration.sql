-- CreateTable
CREATE TABLE "DocumentExtractionJob" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileKey" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "sourceType" TEXT NOT NULL DEFAULT 'upload',
    "sourceId" TEXT,
    "processingMode" TEXT NOT NULL DEFAULT 'immediate',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "methodSummary" TEXT,
    "confidenceAvg" INTEGER,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentExtractionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentExtractionField" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT,
    "confidence" INTEGER,
    "method" TEXT,
    "sourcePage" INTEGER,
    "sourceFile" TEXT,
    "sourceCoordinates" JSONB,
    "unit" TEXT,
    "structured" JSONB,

    CONSTRAINT "DocumentExtractionField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentExtractionJob_entity_entityId_idx" ON "DocumentExtractionJob"("entity", "entityId");

-- CreateIndex
CREATE INDEX "DocumentExtractionJob_status_createdAt_idx" ON "DocumentExtractionJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentExtractionField_jobId_name_idx" ON "DocumentExtractionField"("jobId", "name");

-- AddForeignKey
ALTER TABLE "DocumentExtractionField" ADD CONSTRAINT "DocumentExtractionField_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DocumentExtractionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
