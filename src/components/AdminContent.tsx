import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import AdminPanel from "@/components/AdminPanel";

// 관리자 페이지에서 실제 DB 조회가 필요한 부분만 따로 분리한 컴포넌트입니다.
export default async function AdminContent() {
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

  return <AdminPanel initialTitle={config.projectTitle} initialUois={uois} />;
}
