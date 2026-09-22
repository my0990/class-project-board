// Vercel 프로젝트의 이번 달 사용량을 Vercel API에서 가져옵니다.
// 참고 문서: https://vercel.com/docs/rest-api/billing/list-focus-billing-charges
//
// 필요한 환경 변수 (.env.example 참고):
// - VERCEL_API_TOKEN: vercel.com/account/tokens 에서 발급한 개인 액세스 토큰
// - VERCEL_TEAM_ID: (선택) 이 프로젝트가 Vercel Team 소속일 때만 필요합니다.
//   개인 계정에서 바로 배포했다면 비워둬도 됩니다.
//
// 참고: Neon과 달리 Vercel은 "항목별 정해진 무료 한도"를 하나로 딱 잘라 API로
// 알려주지 않아서, 여기서는 이번 달에 실제로 쓴 항목과 수량을 그대로 나열합니다
// (예: Edge Requests 12,345 건). 정확한 무료 한도는 Vercel 요금제 페이지를 참고해주세요.

export type VercelUsageItem = {
  serviceName: string;
  quantity: number;
  unit: string;
};

export type VercelUsage = {
  items: VercelUsageItem[];
  estimatedCostUsd: number;
  periodStart: string;
  periodEnd: string;
};

export type VercelUsageResult = { data: VercelUsage } | { error: string } | { unavailable: string };

type FocusCharge = {
  ServiceName?: string;
  ChargeCategory?: string;
  ConsumedQuantity?: string | number | null;
  ConsumedUnit?: string | null;
  EffectiveCost?: string | number;
};

export async function getVercelUsage(): Promise<VercelUsageResult> {
  const token = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    return { error: "VERCEL_API_TOKEN 환경 변수가 설정되어 있지 않습니다." };
  }

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = periodStart.toISOString();
  const to = now.toISOString();

  const params = new URLSearchParams({ from, to });
  if (teamId) params.set("teamId", teamId);

  let res: Response;
  try {
    res = await fetch(`https://api.vercel.com/v1/billing/charges?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return { error: "Vercel API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  if (!res.ok) {
    if (res.status === 401) {
      return { error: "VERCEL_API_TOKEN이 올바르지 않습니다." };
    }
    if (res.status === 403) {
      return {
        error:
          "이 토큰으로는 사용량을 조회할 권한이 없습니다. 이 프로젝트가 Team 소속이면 VERCEL_TEAM_ID도 함께 설정해주세요.",
      };
    }
    if (res.status === 404) {
      const body = await res.text().catch(() => "");
      if (body.includes("Plan not found")) {
        // 이 API(FOCUS 형식 청구 데이터)는 Vercel이 문서에 명확히 밝히지 않았지만,
        // Enterprise 등급의 정식 계약이 있는 팀에만 데이터가 있는 것으로 확인되었습니다.
        // Hobby/Pro 팀은 VERCEL_TEAM_ID를 올바르게 설정해도 "Plan not found"가 납니다 -
        // 설정 문제가 아니라 Vercel이 이 등급에는 API를 열어주지 않는 것입니다.
        return {
          unavailable:
            "Vercel 사용량은 이 계정 등급에서는 API로 제공되지 않습니다 (Vercel Enterprise 등급 전용 기능으로 보입니다). Vercel 대시보드의 Usage 메뉴에서 직접 확인해주세요.",
        };
      }
      return { error: `Vercel API에서 데이터를 찾을 수 없습니다 (status 404). ${body.slice(0, 200)}` };
    }
    return { error: `Vercel API 오류가 발생했습니다 (status ${res.status}).` };
  }

  // FOCUS 형식 응답은 JSON 배열이 아니라, 줄바꿈으로 구분된 JSON(JSONL)입니다.
  const text = await res.text();
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const totals = new Map<string, { quantity: number; unit: string }>();
  let estimatedCostUsd = 0;

  for (const line of lines) {
    let charge: FocusCharge;
    try {
      charge = JSON.parse(line) as FocusCharge;
    } catch {
      continue;
    }

    const cost = Number(charge.EffectiveCost ?? 0);
    if (!Number.isNaN(cost)) estimatedCostUsd += cost;

    if (charge.ChargeCategory !== "Usage") continue;
    const quantity = Number(charge.ConsumedQuantity ?? 0);
    if (!quantity || Number.isNaN(quantity)) continue;

    const name = charge.ServiceName ?? "기타";
    const unit = charge.ConsumedUnit ?? "";
    const key = `${name}__${unit}`;
    const existing = totals.get(key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      totals.set(key, { quantity, unit });
    }
  }

  const items: VercelUsageItem[] = Array.from(totals.entries())
    .map(([key, v]) => ({ serviceName: key.split("__")[0], quantity: v.quantity, unit: v.unit }))
    .sort((a, b) => b.quantity - a.quantity);

  return {
    data: { items, estimatedCostUsd, periodStart: from, periodEnd: to },
  };
}
