-- AlterTable
ALTER TABLE "Config" ADD COLUMN     "vercelSpendBudgetUsd" INTEGER,
ADD COLUMN     "vercelSpendCurrentUsd" INTEGER,
ADD COLUMN     "vercelSpendThresholdPct" INTEGER,
ADD COLUMN     "vercelSpendUpdatedAt" TIMESTAMP(3);
