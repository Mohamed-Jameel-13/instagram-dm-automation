-- CreateTable
CREATE TABLE "UserInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "interactorId" TEXT NOT NULL,
    "interactorUsername" TEXT,
    "interactionType" TEXT NOT NULL,
    "commentId" TEXT,
    "commentText" TEXT,
    "postId" TEXT,
    "wasFollowerAtTime" BOOLEAN NOT NULL,
    "followStatusCheckedAt" DATETIME,
    "automationTriggered" BOOLEAN NOT NULL DEFAULT false,
    "responseType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "UserInteraction_userId_interactorId_idx" ON "UserInteraction"("userId", "interactorId");

-- CreateIndex
CREATE INDEX "UserInteraction_userId_interactionType_idx" ON "UserInteraction"("userId", "interactionType");

-- CreateIndex
CREATE UNIQUE INDEX "UserInteraction_userId_interactorId_commentId_key" ON "UserInteraction"("userId", "interactorId", "commentId");
