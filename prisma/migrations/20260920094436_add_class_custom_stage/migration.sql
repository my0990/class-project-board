/*
  Warnings:

  - A unique constraint covering the columns `[loiId,classRoomId,order]` on the table `Stage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Stage_loiId_order_key";

-- AlterTable
ALTER TABLE "Stage" ADD COLUMN     "classRoomId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Stage_loiId_classRoomId_order_key" ON "Stage"("loiId", "classRoomId", "order");

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
