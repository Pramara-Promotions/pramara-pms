-- CreateTable
CREATE TABLE "ProjectPref" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "skuAttrKeys" JSONB,
    "lastPo" TEXT,

    CONSTRAINT "ProjectPref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "poNumber" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPref_projectId_key" ON "ProjectPref"("projectId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_projectId_idx" ON "PurchaseOrder"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_projectId_poNumber_key" ON "PurchaseOrder"("projectId", "poNumber");

-- AddForeignKey
ALTER TABLE "ProjectPref" ADD CONSTRAINT "ProjectPref_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
