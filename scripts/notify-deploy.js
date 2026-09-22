// Vercel에서 배포(next build)가 끝난 뒤 자동으로 실행되어, 관리자 페이지에서
// "다음 배포 알림 보내기"를 켜둔 경우에만 이번 배포의 커밋 메시지를 담아
// "알림 받기"를 눌러둔 모든 기기에 업데이트 알림을 보냅니다.
//
// - 로컬 컴퓨터에서 그냥 npm run build 할 때는 VERCEL 환경변수가 없어서 조용히 건너뜁니다.
// - 미리보기(브랜치) 배포에서는 보내지 않고, 실제 배포(production)일 때만 보냅니다.
// - 관리자 페이지에서 켜두지 않았으면 건너뜁니다 (매 배포마다 자동으로 나가지 않도록).
// - 알림을 보냈다면(성공/실패 상관없이) 다음 배포에 또 나가지 않도록 스위치를 다시 끕니다.
// - 여기서 에러가 나도 배포 자체는 실패하지 않도록, 무슨 일이 있어도 이 스크립트는
//   정상 종료(exit code 0)합니다.

const { PrismaClient } = require("@prisma/client");
const webpush = require("web-push");

async function main() {
  if (!process.env.VERCEL) {
    console.log("[notify-deploy] Vercel 환경이 아니라서 건너뜁니다.");
    return;
  }
  if (process.env.VERCEL_ENV !== "production") {
    console.log(`[notify-deploy] production 배포가 아니라서(${process.env.VERCEL_ENV}) 건너뜁니다.`);
    return;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    console.log("[notify-deploy] VAPID 키가 설정되어 있지 않아 건너뜁니다.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const config = await prisma.config.findFirst();
    if (!config || !config.deployNotifyEnabled) {
      console.log("[notify-deploy] 관리자 페이지에서 꺼져 있어서 건너뜁니다.");
      return;
    }

    // 알림을 보내기로 한 순간 바로 스위치를 꺼서, 이후 배포에서는 다시 켜기 전까지
    // 알림이 나가지 않게 합니다.
    await prisma.config.update({ where: { id: config.id }, data: { deployNotifyEnabled: false } });

    const commitMessage = (process.env.VERCEL_GIT_COMMIT_MESSAGE || "").split("\n")[0].trim();
    const body = commitMessage || "새 업데이트가 배포되었습니다.";

    const subs = await prisma.pushSubscription.findMany();
    if (subs.length === 0) {
      console.log("[notify-deploy] 저장된 알림 구독이 없어서 건너뜁니다.");
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    const payload = JSON.stringify({ title: "업데이트 안내", body, url: "/" });

    let sent = 0;
    let failed = 0;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          sent++;
        } catch (err) {
          failed++;
          const statusCode = err && err.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.error("[notify-deploy] 전송 실패:", sub.endpoint, err && err.message);
          }
        }
      })
    );
    console.log(`[notify-deploy] 완료 - 성공 ${sent}건, 실패 ${failed}건`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[notify-deploy] 오류 (배포에는 영향 없음):", err);
});
