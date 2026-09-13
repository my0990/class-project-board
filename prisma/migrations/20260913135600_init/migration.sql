-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "adminPasswordHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Uoi" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Uoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loi" (
    "id" TEXT NOT NULL,
    "uoiId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "loiId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassRoom" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "classRoomId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Uoi_order_key" ON "Uoi"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Loi_uoiId_order_key" ON "Loi"("uoiId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_loiId_order_key" ON "Stage"("loiId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ClassRoom_slug_key" ON "ClassRoom"("slug");

-- AddForeignKey
ALTER TABLE "Loi" ADD CONSTRAINT "Loi_uoiId_fkey" FOREIGN KEY ("uoiId") REFERENCES "Uoi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_loiId_fkey" FOREIGN KEY ("loiId") REFERENCES "Loi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ClassRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
