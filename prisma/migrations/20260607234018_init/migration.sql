/*
  Warnings:

  - You are about to drop the `GoogleFile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GoogleText` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GoogleUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GoogleFile";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GoogleText";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GoogleUser";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CredentialUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loginId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "storageQuota" INTEGER NOT NULL DEFAULT 1073741824,
    "usedStorage" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CredentialFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CredentialFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CredentialUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CredentialText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CredentialText_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CredentialUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CredentialUser_loginId_key" ON "CredentialUser"("loginId");

-- CreateIndex
CREATE INDEX "CredentialUser_loginId_idx" ON "CredentialUser"("loginId");

-- CreateIndex
CREATE INDEX "CredentialUser_isActive_idx" ON "CredentialUser"("isActive");

-- CreateIndex
CREATE INDEX "CredentialFile_userId_createdAt_idx" ON "CredentialFile"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CredentialText_userId_updatedAt_idx" ON "CredentialText"("userId", "updatedAt");
