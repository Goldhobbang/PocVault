-- AlterTable
ALTER TABLE "CredentialUser" ADD COLUMN "googleOwnerId" TEXT;

-- CreateIndex
CREATE INDEX "CredentialUser_googleOwnerId_idx" ON "CredentialUser"("googleOwnerId");
