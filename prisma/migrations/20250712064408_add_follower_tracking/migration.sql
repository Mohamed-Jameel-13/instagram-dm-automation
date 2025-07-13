-- CreateTable
CREATE TABLE "Follower" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followerUsername" TEXT,
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "followedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCommentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Follower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "automationId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerText" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "isNewFollower" BOOLEAN,
    "triggeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Follower_userId_followerId_key" ON "Follower"("userId", "followerId");
