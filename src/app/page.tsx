import Link from "next/link";
import { Suspense } from "react";
import HomeContent from "@/components/HomeContent";
import HomeSkeleton from "@/components/HomeSkeleton";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <p className="text-sm font-medium text-blue-600">전체 학급 공통 프로젝트</p>

      {/* DB 조회가 오래 걸려도(예: Neon 콜드스타트) 화면 뼈대는 바로 보이고, */}
      {/* 실제 내용(제목/학급 카드)만 준비되는 대로 이 자리에 나중에 채워집니다. */}
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent />
      </Suspense>

      <p className="mt-10 text-center">
        <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
          관리자: 단원/주제/단계 관리
        </Link>
      </p>
    </main>
  );
}
