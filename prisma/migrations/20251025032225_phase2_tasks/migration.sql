-- CreateEnum
CREATE TYPE "TaskSection" AS ENUM ('Pre_Prod', 'Production', 'QC', 'Dispatch');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('green', 'amber', 'red');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('Low', 'Med', 'High');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER,
    "name" TEXT NOT NULL,
    "section" "TaskSection" NOT NULL DEFAULT 'Pre_Prod',
    "status" "TaskStatus" NOT NULL DEFAULT 'green',
    "assignee" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'Med',
    "tags" TEXT[],
    "attachments" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_section_position_idx" ON "Task"("section", "position");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
