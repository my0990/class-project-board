// Vercel "Spend Management" 웹훅을 받는 엔드포인트입니다.
// 예산의 50% / 75% / 100%에 도달할 때마다 Vercel이 이 주소로 POST 요청을 보내줍니다.
// 참고 문서: https://vercel.com/docs/spend-management
//
// 원래 Vercel은 "Webhook Created" 알림에 서명용 시크릿을 잠깐 보여주는데, 이 값이 별표(****)로
// 가려진 채 아주 짧게 나타났다 사라져서 복사하기가 매우 어려웠습니다. 그래서 Vercel이 주는
// 시크릿 대신, 우리가 직접 만든 임의의 문자열을 웹훅 주소 뒤에 "?key=..." 형태로 붙여서 씁니다.
// (Slack 같은 서비스의 웹훅 URL과 같은 방식입니다.) 이 주소를 Vercel의 Webhook URL 칸에
// 그대로 붙여넣기만 하면 되고, 화면에서 뭔가 더 찾아서 복사할 필요가 없습니다.
//
// 설정 방법:
// 1) Vercel 대시보드 -> Team 설정 -> Billing -> Spend Management 에서 예산(On-Demand Budget) 설정
// 2) 같은 화면 Webhook URL에 "https://<내 사이트 주소>/api/vercel-spend-webhook?key=<시크릿>" 입력
//    (시크릿 값은 VERCEL_SPEND_WEBHOOK_SECRET 환경 변수와 똑같아야 합니다)
// 3) 저장
//
// 주의: 이 웹훅은 실시간이 아니라 몇 분 간격으로 예산 대비 사용량을 확인하고,
// 50%/75%/100% 문턱을 "새로 넘을 때"만 호출됩니다 - 매번 최신값이 오는 게 아닙니다.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";

type SpendWebhookPayload = {
  budgetAmount?: number;
  currentSpend?: number;
  teamId?: string;
  thresholdPercent?: number;
};

export async function POST(request: Request) {
  const secret = process.env.VERCEL_SPEND_WEBHOOK_SECRET;
  if (!secret) {
    // 아직 설정 전이면 조용히 501로 응답합니다.
    return NextResponse.json({ error: "웹훅 시크릿이 설정되지 않았습니다." }, { status: 501 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (key !== secret) {
    return NextResponse.json({ error: "Invalid key" }, { status: 403 });
  }

  let payload: SpendWebhookPayload;
  try {
    payload = (await request.json()) as SpendWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof payload.budgetAmount !== "number" ||
    typeof payload.currentSpend !== "number" ||
    typeof payload.thresholdPercent !== "number"
  ) {
    return NextResponse.json({ error: "Unexpected payload shape" }, { status: 400 });
  }

  const config = await getConfig();
  await prisma.config.update({
    where: { id: config.id },
    data: {
      vercelSpendBudgetUsd: Math.round(payload.budgetAmount),
      vercelSpendCurrentUsd: Math.round(payload.currentSpend),
      vercelSpendThresholdPct: Math.round(payload.thresholdPercent),
      vercelSpendUpdatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
