-- AlterTable
ALTER TABLE "DmAnalytics" ADD COLUMN     "aiPrompt" TEXT;

-- AlterTable
ALTER TABLE "PostAnalytics" ADD COLUMN     "aiDmsSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "postCaption" TEXT,
ADD COLUMN     "postThumbnail" TEXT,
ADD COLUMN     "postType" TEXT;
