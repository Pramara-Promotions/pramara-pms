-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN     "bounceReason" TEXT,
ADD COLUMN     "bounced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bouncedAt" TIMESTAMP(3),
ADD COLUMN     "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clicked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clickedAt" TIMESTAMP(3),
ADD COLUMN     "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "opened" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "EmailLog_opened_idx" ON "EmailLog"("opened");

-- CreateIndex
CREATE INDEX "EmailLog_clicked_idx" ON "EmailLog"("clicked");
