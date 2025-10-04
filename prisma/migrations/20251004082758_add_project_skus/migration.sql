-- CreateTable
CREATE TABLE "public"."ProjectSku" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSku_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSku_projectId_code_key" ON "public"."ProjectSku"("projectId", "code");

-- AddForeignKey
ALTER TABLE "public"."ProjectSku" ADD CONSTRAINT "ProjectSku_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
