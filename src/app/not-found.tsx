import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-gray-500">주소를 다시 확인해주세요.</p>
      <Link href="/" className="mt-6 text-blue-600 hover:underline">
        전체 학급 보기로 돌아가기
      </Link>
    </main>
  );
}
