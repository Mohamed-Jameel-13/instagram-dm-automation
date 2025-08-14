-- AlterTable
ALTER TABLE "AutomationLog" ADD COLUMN     "commentId" TEXT,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "postId" TEXT,
ADD COLUMN     "processingTimeMs" INTEGER,
ADD COLUMN     "responseStatus" TEXT,
ADD COLUMN     "responseType" TEXT;

-- CreateTable
CREATE TABLE "DmAnalytics" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerSource" TEXT,
    "messageLength" INTEGER NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAnalytics" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "dmsSent" INTEGER NOT NULL DEFAULT 0,
    "commentsReplied" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalTriggers" INTEGER NOT NULL DEFAULT 0,
    "successfulDms" INTEGER NOT NULL DEFAULT 0,
    "failedDms" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fastestResponse" INTEGER,
    "slowestResponse" INTEGER,
    "uniqueRecipients" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DmAnalytics_automationId_sentAt_idx" ON "DmAnalytics"("automationId", "sentAt");

-- CreateIndex
CREATE INDEX "DmAnalytics_triggerSource_sentAt_idx" ON "DmAnalytics"("triggerSource", "sentAt");

-- CreateIndex
CREATE INDEX "DmAnalytics_userId_sentAt_idx" ON "DmAnalytics"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostAnalytics_postId_key" ON "PostAnalytics"("postId");

-- CreateIndex
CREATE INDEX "PostAnalytics_userId_lastActivity_idx" ON "PostAnalytics"("userId", "lastActivity");

-- CreateIndex
CREATE INDEX "PostAnalytics_postId_idx" ON "PostAnalytics"("postId");

-- CreateIndex
CREATE INDEX "PerformanceMetrics_userId_date_idx" ON "PerformanceMetrics"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceMetrics_userId_date_key" ON "PerformanceMetrics"("userId", "date");

-- CreateIndex
CREATE INDEX "AutomationLog_automationId_triggeredAt_idx" ON "AutomationLog"("automationId", "triggeredAt");

-- CreateIndex
CREATE INDEX "AutomationLog_postId_triggeredAt_idx" ON "AutomationLog"("postId", "triggeredAt");

-- CreateIndex
CREATE INDEX "AutomationLog_triggerType_triggeredAt_idx" ON "AutomationLog"("triggerType", "triggeredAt");

-- CreateIndex
CREATE INDEX "AutomationLog_userId_triggeredAt_idx" ON "AutomationLog"("userId", "triggeredAt");
