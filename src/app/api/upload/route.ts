import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

// 클라이언트가 사진/동영상을 Cloudflare R2에 직접 업로드할 수 있도록
// 미리 서명된(presigned) 업로드 URL을 발급해주는 라우트입니다.
// 서버(이 함수)를 거치지 않고 브라우저 -> R2로 파일이 직접 전송되므로
// 서버리스 함수의 요청 본문 크기 제한에 걸리지 않습니다.
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { filename, contentType } = (await request.json()) as {
      filename?: string;
      contentType?: string;
    };

    if (!filename || !contentType) {
      return NextResponse.json({ error: "파일 정보가 올바르지 않습니다." }, { status: 400 });
    }
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "지원하지 않는 파일 형식입니다." }, { status: 400 });
    }
    if (!R2_BUCKET || !R2_PUBLIC_URL) {
      return NextResponse.json(
        { error: "서버에 R2 저장소 설정(R2_BUCKET_NAME/R2_PUBLIC_URL)이 되어 있지 않습니다." },
        { status: 500 }
      );
    }

    const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const datePrefix = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `${datePrefix}/${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    // 15분 이내에만 유효한 업로드 URL. 동영상 압축에 시간이 걸리거나, 느린 모바일 회선에서
    // 업로드가 자동으로 재시도되는 경우를 감안해 여유를 넉넉히 뒀습니다.
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 * 15 });
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "업로드 URL 발급 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
