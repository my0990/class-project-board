// Cloudflare R2의 이번 달 사용량을 Cloudflare GraphQL Analytics API에서 가져옵니다.
// 참고 문서: https://developers.cloudflare.com/r2/platform/metrics-analytics/
//
// 필요한 환경 변수 (.env.example 참고):
// - R2_ACCOUNT_ID: Cloudflare 계정 ID (버킷 만들 때 이미 등록한 값과 동일합니다)
// - CF_ANALYTICS_API_TOKEN: "Account Analytics: Read" 권한으로 새로 만든 Cloudflare API 토큰
//   (버킷 파일 업로드/다운로드에 쓰는 R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY와는 다른, 별도 토큰입니다)
// - R2_BUCKET_NAME: 사용량을 조회할 버킷 이름 (이미 등록되어 있음)
//
// Cloudflare R2 무료 한도 (Standard storage 기준, 2026년 9월 기준):
// - 저장 용량: 10 GB
// - Class A 작업 (쓰기/목록 조회 등 - PutObject, ListObjects 등): 월 100만 건
// - Class B 작업 (읽기 등 - GetObject, HeadObject 등): 월 1,000만 건
// 참고: https://developers.cloudflare.com/r2/pricing

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

const FREE_STORAGE_GB = 10;
const FREE_CLASS_A_REQUESTS = 1_000_000;
const FREE_CLASS_B_REQUESTS = 10_000_000;

// Cloudflare 공식 문서 기준 작업 분류
// https://developers.cloudflare.com/r2/pricing/#class-a-operations / #class-b-operations
const CLASS_A_ACTIONS = new Set([
  "ListBuckets",
  "PutBucket",
  "ListObjects",
  "PutObject",
  "CopyObject",
  "CompleteMultipartUpload",
  "CreateMultipartUpload",
  "LifecycleStorageTierTransition",
  "ListMultipartUploads",
  "UploadPart",
  "UploadPartCopy",
  "ListParts",
  "PutBucketEncryption",
  "PutBucketCors",
  "PutBucketLifecycleConfiguration",
]);

const CLASS_B_ACTIONS = new Set([
  "HeadBucket",
  "HeadObject",
  "GetObject",
  "UsageSummary",
  "GetBucketEncryption",
  "GetBucketLocation",
  "GetBucketCors",
  "GetBucketLifecycleConfiguration",
]);

export type R2Usage = {
  storageGb: number;
  storageGbLimit: number;
  objectCount: number;
  classARequests: number;
  classARequestsLimit: number;
  classBRequests: number;
  classBRequestsLimit: number;
  periodStart: string;
  periodEnd: string;
};

export type R2UsageResult = { data: R2Usage } | { error: string };

type GraphQlResponse = {
  data?: {
    viewer?: {
      accounts?: Array<{
        storage?: Array<{
          dimensions: { date: string; bucketName: string };
          max: { payloadSize: number; metadataSize: number; objectCount: number; uploadCount: number };
        }>;
        operations?: Array<{
          dimensions: { actionType: string };
          sum: { requests: number };
        }>;
      }>;
    };
  };
  errors?: Array<{ message: string }>;
};

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function getR2Usage(): Promise<R2UsageResult> {
  const token = process.env.CF_ANALYTICS_API_TOKEN;
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!token) {
    return { error: "CF_ANALYTICS_API_TOKEN 환경 변수가 설정되어 있지 않습니다." };
  }
  if (!accountId) {
    return { error: "R2_ACCOUNT_ID 환경 변수가 설정되어 있지 않습니다." };
  }

  const now = new Date();
  const periodStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = toDateOnly(periodStartDate);
  const end = toDateOnly(now);

  const query = `
    query R2Usage($accountTag: string!, $start: string!, $end: string!, $bucketName: string) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          storage: r2StorageAdaptiveGroups(
            filter: { date_geq: $start, date_leq: $end, bucketName: $bucketName }
            limit: 10
            orderBy: [date_DESC]
          ) {
            dimensions { date bucketName }
            max { payloadSize metadataSize objectCount uploadCount }
          }
          operations: r2OperationsAdaptiveGroups(
            filter: { date_geq: $start, date_leq: $end, bucketName: $bucketName, actionStatus: "success" }
            limit: 100
          ) {
            dimensions { actionType }
            sum { requests }
          }
        }
      }
    }
  `;

  let res: Response;
  try {
    res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { accountTag: accountId, start, end, bucketName: bucketName || undefined },
      }),
      cache: "no-store",
    });
  } catch {
    return { error: "Cloudflare API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return { error: "CF_ANALYTICS_API_TOKEN이 올바르지 않거나 권한이 부족합니다 (Account Analytics: Read 권한 필요)." };
    }
    const body = await res.text().catch(() => "");
    return { error: `Cloudflare API 오류가 발생했습니다 (status ${res.status}). ${body.slice(0, 300)}` };
  }

  const json = (await res.json().catch(() => null)) as GraphQlResponse | null;
  if (!json) {
    return { error: "Cloudflare API 응답을 읽지 못했습니다." };
  }
  if (json.errors && json.errors.length > 0) {
    return { error: `Cloudflare API 오류: ${json.errors.map((e) => e.message).join("; ")}` };
  }

  const account = json.data?.viewer?.accounts?.[0];
  const storageRows = account?.storage ?? [];
  const operationRows = account?.operations ?? [];

  // 가장 최근 날짜의 스냅샷을 "현재 저장 용량"으로 사용합니다 (버킷별로 나뉘어 있을 수 있어 합산).
  let storageBytes = 0;
  let objectCount = 0;
  if (storageRows.length > 0) {
    const latestDate = storageRows[0].dimensions.date;
    for (const row of storageRows) {
      if (row.dimensions.date !== latestDate) continue;
      storageBytes += (row.max.payloadSize ?? 0) + (row.max.metadataSize ?? 0);
      objectCount += row.max.objectCount ?? 0;
    }
  }

  let classARequests = 0;
  let classBRequests = 0;
  for (const row of operationRows) {
    const requests = row.sum?.requests ?? 0;
    if (CLASS_A_ACTIONS.has(row.dimensions.actionType)) {
      classARequests += requests;
    } else if (CLASS_B_ACTIONS.has(row.dimensions.actionType)) {
      classBRequests += requests;
    }
  }

  return {
    data: {
      storageGb: storageBytes / 1_000_000_000,
      storageGbLimit: FREE_STORAGE_GB,
      objectCount,
      classARequests,
      classARequestsLimit: FREE_CLASS_A_REQUESTS,
      classBRequests,
      classBRequestsLimit: FREE_CLASS_B_REQUESTS,
      periodStart: periodStartDate.toISOString(),
      periodEnd: now.toISOString(),
    },
  };
}
