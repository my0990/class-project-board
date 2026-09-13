import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [config, uois] = await Promise.all([
    getConfig(),
    prisma.uoi.findMany({
      orderBy: { order: "asc" },
      include: {
        lois: {
          orderBy: { order: "asc" },
          include: {
            stages: { orderBy: { order: "asc" } },
          },
        },
      },
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="text-2xl font-bold">관리자 설정</h1>
      <p className="mt-1 text-sm text-gray-500">
        프로젝트 제목과 전체 학급이 공통으로 사용할 탐구 단원(UOI) · 탐구 주제(LOI) · 수업 단계를 관리합니다.
      </p>

      <AdminPanel initialTitle={config.projectTitle} initialUois={uois} />
    </main>
  );
}
