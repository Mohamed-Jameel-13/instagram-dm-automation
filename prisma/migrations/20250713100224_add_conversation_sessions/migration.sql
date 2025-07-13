-- CreateTable
CREATE TABLE "ConversationSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "conversationHistory" TEXT,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSession_userId_instagramUserId_automationId_key" ON "ConversationSession"("userId", "instagramUserId", "automationId");
