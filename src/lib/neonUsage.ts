// Neon(Postgres) 프로젝트의 이번 결제 주기 사용량을 Neon API에서 가져옵니다.
// 참고 문서: https://api-docs.neon.tech/reference/getproject
//
// 필요한 환경 변수 (.env.example 참고):
// - NEON_API_KEY: Neon 콘솔 > 우측 상단 프로필 > Settings > API keys에서 발급한 개인 API 키
// - NEON_PROJECT_ID: Neon 콘솔 > 프로젝트 > Settings > General에 있는 Project ID (예: cool-glade-12345678)

export type NeonUsage = {
  computeHours: number;
  computeHoursLimit: number;
  storageGb: number;
  storageGbLimit: number;
  transferGb: number;
  transferGbLimit: number;
  periodStart: string | null;
  periodEnd: string | null;
};

export type NeonUsageResult = { data: NeonUsage } | { error: string };

const NEON_API_BASE = "https://console.neon.tech/api/v2";

// Neon Free 플랜 기준 한도 (2026년 9월 기준). Neon이 플랜 한도를 바꾸면 이 숫자만 고치면 됩니다.
const FREE_COMPUTE_HOURS_LIMIT = 100;
const FREE_STORAGE_GB_LIMIT = 0.5;
const FREE_TRANSFER_GB_LIMIT = 5;

export async function getNeonUsage(): Promise<NeonUsageResult> {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;

  if (!apiKey || !projectId) {
    return { error: "NEON_API_KEY 또는 NEON_PROJECT_ID 환경 변수가 설정되어 있지 않습니다." };
  }

  let projectRes: Response;
  try {
    projectRes = await fetch(`${NEON_API_BASE}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
  } catch {
    return { error: "Neon API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  if (!projectRes.ok) {
    if (projectRes.status === 401 || projectRes.status === 403) {
      return { error: "NEON_API_KEY가 올바르지 않거나 이 프로젝트에 접근 권한이 없습니다." };
    }
    if (projectRes.status === 404) {
      return { error: "NEON_PROJECT_ID에 해당하는 프로젝트를 찾을 수 없습니다." };
    }
    return { error: `Neon API 오류가 발생했습니다 (status ${projectRes.status}).` };
  }

  const projectJson = (await projectRes.json()) as {
    project?: {
      compute_time_seconds?: number;
      data_transfer_bytes?: number;
      consumption_period_start?: string;
      consumption_period_end?: string;
    };
  };
  const project = projectJson.project ?? {};

  // 현재 저장 용량은 브랜치별 실제 크기를 더해서 계산합니다.
  // (project 객체의 data_storage_bytes_hour는 "누적 GB-시간" 청구 지표라 순간 저장 용량과는 달라서 쓰지 않습니다.)
  let storageBytes = 0;
  try {
    const branchesRes = await fetch(`${NEON_API_BASE}/projects/${projectId}/branches`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (branchesRes.ok) {
      const branchesJson = (await branchesRes.json()) as {
        branches?: Array<{ logical_size?: number; logical_size_bytes?: number }>;
      };
      storageBytes = (branchesJson.branches ?? []).reduce(
        (sum, b) => sum + (b.logical_size_bytes ?? b.logical_size ?? 0),
        0
      );
    }
  } catch {
    // 저장 용량 조회가 실패해도 나머지 사용량 정보는 그대로 보여줍니다.
  }

  const computeHours = (project.compute_time_seconds ?? 0) / 3600;
  const transferGb = (project.data_transfer_bytes ?? 0) / 1_000_000_000;
  const storageGb = storageBytes / 1_000_000_000;

  return {
    data: {
      computeHours,
      computeHoursLimit: FREE_COMPUTE_HOURS_LIMIT,
      storageGb,
      storageGbLimit: FREE_STORAGE_GB_LIMIT,
      transferGb,
      transferGbLimit: FREE_TRANSFER_GB_LIMIT,
      periodStart: project.consumption_period_start ?? null,
      periodEnd: project.consumption_period_end ?? null,
    },
  };
}
