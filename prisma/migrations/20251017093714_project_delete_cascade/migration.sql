-- DropForeignKey
ALTER TABLE "ProjectPref" DROP CONSTRAINT "ProjectPref_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectSku" DROP CONSTRAINT "ProjectSku_projectId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_projectId_fkey";

-- AddForeignKey
ALTER TABLE "ProjectPref" ADD CONSTRAINT "ProjectPref_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSku" ADD CONSTRAINT "ProjectSku_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
