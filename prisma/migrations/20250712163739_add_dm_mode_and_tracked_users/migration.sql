/*
  Warnings:

  - You are about to drop the `UserInteraction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "UserInteraction_userId_interactorId_commentId_key";

-- DropIndex
DROP INDEX "UserInteraction_userId_interactionType_idx";

-- DropIndex
DROP INDEX "UserInteraction_userId_interactorId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserInteraction";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "TrackedUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Automation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "triggerType" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "message" TEXT,
    "commentReply" TEXT,
    "aiPrompt" TEXT,
    "posts" TEXT NOT NULL,
    "dmMode" TEXT NOT NULL DEFAULT 'normal',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Automation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Automation" ("actionType", "active", "aiPrompt", "commentReply", "createdAt", "id", "keywords", "message", "name", "posts", "triggerType", "updatedAt", "userId") SELECT "actionType", "active", "aiPrompt", "commentReply", "createdAt", "id", "keywords", "message", "name", "posts", "triggerType", "updatedAt", "userId" FROM "Automation";
DROP TABLE "Automation";
ALTER TABLE "new_Automation" RENAME TO "Automation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TrackedUser_userId_instagramUserId_key" ON "TrackedUser"("userId", "instagramUserId");
