-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'exchange',
    "protocol" TEXT NOT NULL DEFAULT 'imap',
    "authMethod" TEXT NOT NULL DEFAULT 'basic',
    "username" TEXT NOT NULL,
    "passwordEnc" TEXT,
    "host" TEXT,
    "port" INTEGER DEFAULT 993,
    "tls" BOOLEAN DEFAULT true,
    "tenantId" TEXT,
    "clientId" TEXT,
    "clientSecretEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "mailbox" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailAccount_enabled_idx" ON "EmailAccount"("enabled");

-- CreateIndex
CREATE INDEX "EmailAccount_protocol_authMethod_idx" ON "EmailAccount"("protocol", "authMethod");
