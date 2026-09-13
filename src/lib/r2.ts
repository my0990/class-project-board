import { S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2는 S3 호환 API를 제공하므로 AWS S3 SDK를 그대로 사용합니다.
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "";

// 끝에 "/"가 붙어 있어도 안전하게 동작하도록 제거합니다.
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
