-- AlterTable
ALTER TABLE "parties" ADD COLUMN     "aiSummaryGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "aiSummaryOpenPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "aiSummaryRecap" TEXT;
