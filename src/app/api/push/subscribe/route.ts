import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 브라우저의 푸시 구독 정보를 저장합니다. 이후 새 글이 등록될 때 이 정보로
// 웹 푸시 알림을 보냅니다.
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: "구독 정보가 올바르지 않습니다." }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: { p256dh: body.keys.p256dh, auth: body.keys.auth },
      create: { endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "구독 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 알림 끄기(구독 해제) 시 호출됩니다.
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json({ error: "구독 정보가 올바르지 않습니다." }, { status: 400 });
    }
    await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "구독 해제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
