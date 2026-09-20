/*
  Warnings:

  - You are about to drop the column `classRoomId` on the `Stage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[loiId,order]` on the table `Stage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Stage" DROP CONSTRAINT "Stage_classRoomId_fkey";

-- DropIndex
DROP INDEX "Stage_loiId_classRoomId_order_key";

-- AlterTable
ALTER TABLE "Stage" DROP COLUMN "classRoomId";

-- CreateIndex
CREATE UNIQUE INDEX "Stage_loiId_order_key" ON "Stage"("loiId", "order");
