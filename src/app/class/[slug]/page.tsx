import Link from "next/link";
import { Suspense } from "react";
import ClassPageContent from "@/components/ClassPageContent";
import ClassPageSkeleton from "@/components/ClassPageSkeleton";

// 매 요청마다 새로 DB를 조회하지 않고, 한 번 만든 화면을 캐시해뒀다가 재사용합니다.
// 글 등록/수정 시 actions.ts에서 이 경로로 revalidatePath를 호출해주고 있어서,
// 새 글이 올라오면 바로 다음 방문 때 새로 만들어지고 그 전까지는 캐시된 화면을
// 빠르게 보여줍니다.
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
