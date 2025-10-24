-- CreateTable
CREATE TABLE "DocumentExtractionApproval" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "approvedFields" JSONB NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentExtractionApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentExtractionApproval_jobId_idx" ON "DocumentExtractionApproval"("jobId");

-- AddForeignKey
ALTER TABLE "DocumentExtractionApproval" ADD CONSTRAINT "DocumentExtractionApproval_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DocumentExtractionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
