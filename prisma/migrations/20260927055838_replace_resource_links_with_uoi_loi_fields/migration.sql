/*
  Warnings:

  - You are about to drop the `ResourceLink` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Loi" ADD COLUMN     "canvaUrl" TEXT,
ADD COLUMN     "padletUrl" TEXT;

-- AlterTable
ALTER TABLE "Uoi" ADD COLUMN     "docUrl" TEXT;

-- DropTable
DROP TABLE "ResourceLink";
