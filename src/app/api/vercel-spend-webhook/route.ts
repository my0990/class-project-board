// Vercel "Spend Management" 웹훅을 받는 엔드포인트입니다.
// 예산의 50% / 75% / 100%에 도달할 때마다 Vercel이 이 주소로 POST 요청을 보내줍니다.
// 참고 문서: https://vercel.com/docs/spend-management, https://vercel.com/docs/webhooks
//
// 설정 방법 (Vercel 대시보드):
// 1) Team 설정 -> Billing -> Spend Management 에서 "On-Demand Budget" 금액을 설정합니다.
// 2) 같은 화면에서 Webhook URL에 "https://<내 사이트 주소>/api/vercel-spend-webhook" 를 입력합니다.
// 3) 이때 한 번만 보여주는 Signing Secret을 복사해서, Vercel 프로젝트 환경 변수에
//    VERCEL_SPEND_WEBHOOK_SECRET 이름으로 등록합니다 (로컬 .env에도 테스트용으로 추가).
//
// 주의: 이 웹훅은 실시간이 아니라 몇 분 간격으로 예산 대비 사용량을 확인하고,
// 50%/75%/100% 문턱을 "새로 넘을 때"만 호출됩니다 - 매번 최신값이 오는 게 아닙니다.

import { NextResponse } from "next/server";
import crypto from "crypto";
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
    // 아직 설정 전이면 조용히 501로 응답합니다 (Vercel이 재시도하지 않도록 2xx를 주지는 않되,
    // 서버 로그에만 남기고 사용자에게는 별도 알림을 보내지 않습니다).
    return NextResponse.json({ error: "웹훅 시크릿이 설정되지 않았습니다." }, { status: 501 });
  }

  const headerSignature = request.headers.get("x-vercel-signature");
  const rawBody = await request.text();

  const bodySignature = crypto.createHmac("sha1", secret).update(rawBody).digest("hex");

  const headerBuf = headerSignature ? Buffer.from(headerSignature) : null;
  const bodyBuf = Buffer.from(bodySignature);
  const signatureValid =
    !!headerBuf && headerBuf.length === bodyBuf.length && crypto.timingSafeEqual(headerBuf, bodyBuf);

  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload: SpendWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as SpendWebhookPayload;
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
