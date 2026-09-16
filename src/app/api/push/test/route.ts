import { NextResponse } from "next/server";
import { sendTestPush } from "@/lib/webpush";

// 진단용 테스트 엔드포인트: 브라우저에서 이 주소를 그냥 열면(GET) 지금까지
// "알림 받기"를 눌러둔 모든 기기로 테스트 알림을 보내보고, 그 결과(성공/실패
// 이유)를 화면에 그대로 보여줍니다. 문제 해결을 위한 임시 진단 도구입니다.
export async function GET() {
  const result = await sendTestPush();
  return NextResponse.json(result, { status: 200 });
}
