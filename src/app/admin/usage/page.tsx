import Link from "next/link";
import UsageDashboard from "@/components/UsageDashboard";

export const dynamic = "force-dynamic";

export default function UsagePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600 hover:underline">
        ← 관리자 설정으로
      </Link>
      <h1 className="mt-2 text-2xl font-bold">사용량 대시보드</h1>
      <p className="mt-1 text-sm text-gray-500">
        이 사이트가 쓰고 있는 서비스(Neon, Vercel, Cloudflare R2)의 이번 달 사용량을 한눈에 확인합니다.
      </p>
      <UsageDashboard />
    </main>
  );
}
