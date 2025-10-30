-- CreateTable
CREATE TABLE "BoardColumn" (
    "id" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "section" "TaskSection" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "wipLimit" INTEGER,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardColumn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardColumn_projectId_idx" ON "BoardColumn"("projectId");

-- CreateIndex
CREATE INDEX "BoardColumn_projectId_position_idx" ON "BoardColumn"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "BoardColumn_projectId_section_key" ON "BoardColumn"("projectId", "section");

-- AddForeignKey
ALTER TABLE "BoardColumn" ADD CONSTRAINT "BoardColumn_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
