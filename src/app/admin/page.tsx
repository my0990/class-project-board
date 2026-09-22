import { Suspense } from "react";
import Link from "next/link";
import AdminContent from "@/components/AdminContent";
import LoadingSpinner from "@/components/LoadingSpinner";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">관리자 설정</h1>
        <Link href="/admin/usage" className="flex-none text-sm font-medium text-blue-600 hover:underline">
          사용량 대시보드 →
        </Link>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        프로젝트 제목과 전체 학급이 공통으로 사용할 탐구 단원(UOI) · 탐구 주제(LOI) · 수업 단계를 관리합니다.
      </p>

      {/* DB 조회가 오래 걸려도 위의 제목/설명은 바로 보이고, */}
      {/* 실제 관리 화면만 준비되는 대로 이 자리에 나중에 채워집니다. */}
      <Suspense fallback={<LoadingSpinner label="설정을 불러오는 중..." />}>
        <AdminContent />
      </Suspense>
    </main>
  );
}
