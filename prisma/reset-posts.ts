import { PrismaClient } from "@prisma/client";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// 탐구 단원(UOI)/탐구 주제(LOI)/수업 단계 구성과 반 계정(비밀번호)은 그대로 두고,
// 지금까지 각 반이 올린 게시글(텍스트 + 사진/동영상)만 전부 지우는 일회성 스크립트입니다.
// 실행: I_UNDERSTAND=yes npx tsx prisma/reset-posts.ts
const prisma = new PrismaClient();

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});
const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "";
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");

async function main() {
  if (process.env.I_UNDERSTAND !== "yes") {
    console.error(
      "안전을 위해 확인 없이는 실행되지 않습니다.\n" +
        "정말로 모든 게시글(텍스트+사진/동영상)을 삭제하려면 아래처럼 실행해주세요:\n\n" +
        "  I_UNDERSTAND=yes npx tsx prisma/reset-posts.ts\n"
    );
    process.exit(1);
  }

  const attachments = await prisma.attachment.findMany({ select: { url: true } });
  const postCount = await prisma.post.count();

  console.log(`삭제 대상 - 게시글: ${postCount}개, 첨부파일: ${attachments.length}개`);

  // 1) 클라우드 저장소(R2)에서 실제 사진/동영상 파일을 삭제합니다 (한 번에 최대 1000개씩).
  if (!R2_BUCKET || !R2_PUBLIC_URL) {
    console.log("R2 저장소 환경변수가 설정되어 있지 않아 저장소 파일 삭제는 건너뜁니다.");
  } else if (attachments.length === 0) {
    console.log("삭제할 첨부파일이 없습니다.");
  } else {
    const keys = attachments
      .map((a) => (a.url.startsWith(`${R2_PUBLIC_URL}/`) ? a.url.slice(R2_PUBLIC_URL.length + 1) : null))
      .filter((k): k is string => !!k);

    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      await r2.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: { Objects: chunk.map((Key) => ({ Key })) },
        })
      );
    }
    console.log(`저장소(R2)에서 파일 ${keys.length}개 삭제 완료`);
  }

  // 2) 게시글을 삭제합니다. 첨부파일 DB 레코드는 onDelete: Cascade로 함께 삭제됩니다.
  const { count } = await prisma.post.deleteMany({});
  console.log(`게시글 ${count}개 삭제 완료. (탐구 단원/주제/단계 구성, 반 계정/비밀번호는 그대로 유지됩니다)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
