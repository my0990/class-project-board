import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

// 새 글이 등록되면 지금까지 "알림 받기"를 눌러둔 모든 기기로 웹 푸시를 보냅니다.
// 환경 변수(VAPID 키)가 아직 설정되어 있지 않으면 조용히 건너뜁니다 - 이 기능은
// 부가 기능이라, 설정이 안 되어 있다고 게시글 등록 자체가 실패해서는 안 됩니다.
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return;

  ensureConfigured();
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err: unknown) {
        // 구독이 만료(410)되었거나 더 이상 존재하지 않으면(404) DB에서 정리합니다.
        const statusCode = (err as { statusCode?: number } | null)?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("푸시 전송 실패:", sub.endpoint, err);
        }
      }
    })
  );
}

// 문제 진단용: VAPID 키가 서버에 제대로 설정되어 있는지, 구독이 몇 개나 저장돼
// 있는지, 실제로 보내봤을 때 각 구독별로 성공/실패했는지를 자세히 알려줍니다.
export async function sendTestPush(): Promise<{
  hasPublicKey: boolean;
  hasPrivateKey: boolean;
  totalSubscriptions: number;
  sent: number;
  failed: number;
  details: string[];
}> {
  const hasPublicKey = Boolean(VAPID_PUBLIC_KEY);
  const hasPrivateKey = Boolean(VAPID_PRIVATE_KEY);
  const subs = await prisma.pushSubscription.findMany();

  if (!hasPublicKey || !hasPrivateKey) {
    return {
      hasPublicKey,
      hasPrivateKey,
      totalSubscriptions: subs.length,
      sent: 0,
      failed: 0,
      details: ["VAPID_PUBLIC_KEY 또는 VAPID_PRIVATE_KEY가 서버(Vercel)에 설정되어 있지 않습니다."],
    };
  }
  if (subs.length === 0) {
    return { hasPublicKey, hasPrivateKey, totalSubscriptions: 0, sent: 0, failed: 0, details: ["저장된 알림 구독이 없습니다."] };
  }

  ensureConfigured();
  const body = JSON.stringify({ title: "테스트 알림", body: "정상적으로 도착했어요!", url: "/" });

  let sent = 0;
  const details: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      const label = `...${sub.endpoint.slice(-16)}`;
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
        sent++;
        details.push(`성공: ${label}`);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number; body?: string } | null)?.statusCode;
        const errBody = (err as { body?: string } | null)?.body;
        const message = err instanceof Error ? err.message : String(err);
        details.push(`실패: ${label} (status=${statusCode ?? "?"}) ${errBody ?? message}`);
      }
    })
  );

  return { hasPublicKey, hasPrivateKey, totalSubscriptions: subs.length, sent, failed: subs.length - sent, details };
}
