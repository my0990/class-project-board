import Link from "next/link";
import { Suspense } from "react";
import ClassPageContent from "@/components/ClassPageContent";
import ClassPageSkeleton from "@/components/ClassPageSkeleton";

export const dynamic = "force-dynamic";

export default function ClassPage({ params }: { params: { slug: string } }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        &larr; 전체 학급 보기
      </Link>

      {/* DB 조회가 오래 걸려도 위의 링크 등 화면 뼈대는 바로 보이고, */}
      {/* 실제 내용(학급 이름/게시글)만 준비되는 대로 이 자리에 나중에 채워집니다. */}
      <Suspense fallback={<ClassPageSkeleton />}>
        <ClassPageContent slug={params.slug} />
      </Suspense>
    </main>
  );
}
