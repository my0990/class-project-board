import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import ClassCard from "@/components/ClassCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getConfig();

  const [uois, classes, posts] = await Promise.all([
    prisma.uoi.findMany({
      orderBy: { order: "asc" },
      include: {
        lois: {
          orderBy: { order: "asc" },
          include: { stages: { orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.classRoom.findMany({ orderBy: { slug: "asc" } }),
    prisma.post.findMany({ select: { classRoomId: true, stageId: true } }),
  ]);

  const doneSet = new Set(posts.map((p) => `${p.classRoomId}:${p.stageId}`));

  const hasAnyStage = uois.some((u) => u.lois.some((l) => l.stages.length > 0));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <p className="text-sm font-medium text-blue-600">전체 학급 공통 프로젝트</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{config.projectTitle}</h1>

      {uois.length > 0 && (
        <ol className="mt-4 flex flex-wrap gap-x-1 gap-y-2 text-sm text-gray-500">
          {uois.map((u, i) => (
            <li key={u.id} className="flex items-center">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                {i + 1}. {u.name}
              </span>
              {i < uois.length - 1 && <span className="mx-1 text-gray-300">→</span>}
            </li>
          ))}
        </ol>
      )}

      {classes.length === 0 ? (
        <p className="mt-10 text-gray-400">
          아직 등록된 학급이 없습니다. <code className="rounded bg-gray-100 px-1">npm run db:seed</code>로 초기 데이터를
          생성해주세요.
        </p>
      ) : !hasAnyStage ? (
        <p className="mt-10 text-gray-400">
          아직 등록된 탐구 단원(UOI)/탐구 주제(LOI)/수업 단계가 없습니다. 관리자 페이지에서 만들어주세요.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <ClassCard
              key={c.id}
              slug={c.slug}
              name={c.name}
              teacherName={c.teacherName}
              uois={uois.map((u) => ({
                id: u.id,
                name: u.name,
                lois: u.lois.map((l) => ({
                  id: l.id,
                  name: l.name,
                  stages: l.stages.map((s) => ({
                    id: s.id,
                    name: s.name,
                    done: doneSet.has(`${c.id}:${s.id}`),
                  })),
                })),
              }))}
            />
          ))}
        </div>
      )}

      <p className="mt-10 text-center">
        <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">
          관리자: 단원/주제/단계 관리
        </Link>
      </p>
    </main>
  );
}
