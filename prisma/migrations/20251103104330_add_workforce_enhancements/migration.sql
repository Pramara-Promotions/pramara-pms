/*
  Warnings:

  - A unique constraint covering the columns `[employeeCode]` on the table `Worker` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "email" TEXT,
ADD COLUMN     "employeeCode" TEXT,
ADD COLUMN     "overtimeRate" DOUBLE PRECISION,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "WorkerPerformance" ADD COLUMN     "hoursWorked" DOUBLE PRECISION,
ADD COLUMN     "shiftType" TEXT,
ADD COLUMN     "tasksCompleted" INTEGER;

-- CreateTable
CREATE TABLE "ProviderPerformance" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "monthYear" TEXT NOT NULL,
    "totalWorkers" INTEGER NOT NULL DEFAULT 0,
    "avgAttendance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "incidents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderPerformance_providerId_idx" ON "ProviderPerformance"("providerId");

-- CreateIndex
CREATE INDEX "ProviderPerformance_monthYear_idx" ON "ProviderPerformance"("monthYear");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_employeeCode_key" ON "Worker"("employeeCode");

-- CreateIndex
CREATE INDEX "Worker_employeeCode_idx" ON "Worker"("employeeCode");

-- AddForeignKey
ALTER TABLE "ProviderPerformance" ADD CONSTRAINT "ProviderPerformance_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ThirdPartyProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
