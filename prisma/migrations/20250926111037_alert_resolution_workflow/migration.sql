/*
  Warnings:

  - You are about to drop the `InventoryNeed` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `type` on the `Alert` table. All the data in the column will be lost.
  - Made the column `batchCode` on table `QCRecord` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "AlertRule_projectId_key_level_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "InventoryNeed";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AlertAction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "alertId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "note" TEXT,
    "correctiveActions" TEXT,
    "preventRecurrence" TEXT,
    "costImpactCents" INTEGER,
    "costNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertAction_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Alert" ("createdAt", "id", "level", "message", "projectId") SELECT "createdAt", "id", "level", "message", "projectId" FROM "Alert";
DROP TABLE "Alert";
ALTER TABLE "new_Alert" RENAME TO "Alert";
CREATE TABLE "new_Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "cutoffDate" DATETIME,
    "pantoneCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Project" ("code", "createdAt", "cutoffDate", "id", "name", "pantoneCode", "quantity", "sku") SELECT "code", "createdAt", "cutoffDate", "id", "name", "pantoneCode", "quantity", "sku" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE TABLE "new_QCRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "batchCode" TEXT NOT NULL,
    "passed" INTEGER NOT NULL,
    "rejected" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "pantoneMatch" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QCRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_QCRecord" ("batchCode", "createdAt", "id", "pantoneMatch", "passed", "projectId", "reason", "rejected") SELECT "batchCode", "createdAt", "id", "pantoneMatch", "passed", "projectId", "reason", "rejected" FROM "QCRecord";
DROP TABLE "QCRecord";
ALTER TABLE "new_QCRecord" RENAME TO "QCRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
