import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import HomeClassList from "@/components/HomeClassList";

// 홈 화면에서 실제 DB 조회가 필요한 부분만 따로 분리한 컴포넌트입니다.
// page.tsx에서 <Suspense>로 감싸서, DB 조회가 오래 걸려도(콜드스타트 등)
// 화면의 나머지 뼈대(제목, 관리자 링크 등)는 먼저 보이고 이 부분만 나중에 채워집니다.
export default async function HomeContent() {
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

  const classItems = classes.map((c) => ({
    slug: c.slug,
    name: c.name,
    teacherName: c.teacherName,
    uois: uois.map((u) => ({
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
    })),
  }));

  return (
    <>
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
        <HomeClassList classes={classItems} />
      )}
    </>
  );
}
