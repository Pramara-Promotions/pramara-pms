-- CreateTable
CREATE TABLE "AlertRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "recipients" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AlertRule_projectId_key_level_idx" ON "AlertRule"("projectId", "key", "level");
