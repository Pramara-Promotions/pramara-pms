-- AlterTable
ALTER TABLE "ProjectDocument" ADD COLUMN     "parentId" INTEGER,
ADD COLUMN     "revisionNote" TEXT;

-- CreateTable
CREATE TABLE "Station" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentStation" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "stationId" INTEGER NOT NULL,

    CONSTRAINT "DocumentStation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentStation_documentId_stationId_key" ON "DocumentStation"("documentId", "stationId");

-- CreateIndex
CREATE INDEX "ProjectDocument_parentId_idx" ON "ProjectDocument"("parentId");

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProjectDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentStation" ADD CONSTRAINT "DocumentStation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProjectDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentStation" ADD CONSTRAINT "DocumentStation_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
