-- CreateTable
CREATE TABLE "InboundEmail" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT[],
    "cc" TEXT[],
    "subject" TEXT NOT NULL,
    "textBody" TEXT,
    "htmlBody" TEXT,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "attachmentCount" INTEGER NOT NULL DEFAULT 0,
    "attachments" JSONB,
    "classified" BOOLEAN NOT NULL DEFAULT false,
    "classification" TEXT,
    "confidence" DOUBLE PRECISION,
    "linkedEntity" TEXT,
    "linkedEntityId" TEXT,
    "linkedBy" TEXT,
    "linkedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'unread',
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawHeaders" JSONB,
    "inReplyTo" TEXT,
    "references" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboundEmail_messageId_key" ON "InboundEmail"("messageId");

-- CreateIndex
CREATE INDEX "InboundEmail_status_receivedAt_idx" ON "InboundEmail"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "InboundEmail_from_idx" ON "InboundEmail"("from");

-- CreateIndex
CREATE INDEX "InboundEmail_linkedEntity_linkedEntityId_idx" ON "InboundEmail"("linkedEntity", "linkedEntityId");

-- CreateIndex
CREATE INDEX "InboundEmail_classification_idx" ON "InboundEmail"("classification");
