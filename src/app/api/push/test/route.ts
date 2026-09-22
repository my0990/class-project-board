import { NextResponse } from "next/server";
import { sendTestPush } from "@/lib/webpush";

// 진단용 테스트 엔드포인트: 브라우저에서 이 주소를 그냥 열면(GET) 지금까지
// "알림 받기"를 눌러둔 모든 기기로 테스트 알림을 보내보고, 그 결과(성공/실패
// 이유)를 화면에 그대로 보여줍니다. 문제 해결을 위한 임시 진단 도구입니다.
//
// 아래 dynamic 설정이 꼭 필요합니다: 요청 정보를 전혀 안 쓰는 GET 함수라서
// 이 설정이 없으면 Next.js가 "정적 페이지"로 착각해 배포(빌드)할 때마다
// 이 함수를 미리 한 번 실행해버리고, 그때 실제로 모든 기기에 테스트 알림이
// 발송되는 문제가 있었습니다.
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await sendTestPush();
  return NextResponse.json(result, { status: 200 });
}
