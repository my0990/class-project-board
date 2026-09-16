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
