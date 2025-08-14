-- AlterTable
ALTER TABLE "PerformanceMetrics" ADD COLUMN     "avgAiResponseTime" DOUBLE PRECISION,
ADD COLUMN     "avgRegularResponseTime" DOUBLE PRECISION,
ADD COLUMN     "successfulAiDms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "successfulRegularDms" INTEGER NOT NULL DEFAULT 0;
