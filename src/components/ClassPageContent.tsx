import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import ClassBoard from "@/components/ClassBoard";

type Props = { slug: string };

// 학급 상세 페이지에서 실제 DB 조회가 필요한 부분만 따로 분리한 컴포넌트입니다.
// page.tsx에서 <Suspense>로 감싸서, DB 조회가 오래 걸려도 "← 전체 학급 보기" 같은
// 화면 뼈대는 먼저 보이고 이 부분만 나중에 채워집니다.
export default async function ClassPageContent({ slug }: Props) {
  // 세 조회를 전부 동시에 시작합니다. 게시글 목록은 (특정 classRoomId 대신)
  // "학급의 slug"로 바로 필터링해서, 학급 조회가 끝나기를 기다렸다가 순서대로
  // 게시글을 조회하지 않아도 되게 했습니다 - DB 왕복 횟수를 2번에서 1번으로 줄여줍니다.
  const [config, classRoom, uois] = await Promise.all([
    getConfig(),
    prisma.classRoom.findUnique({ where: { slug } }),
    prisma.uoi.findMany({
      orderBy: { order: "asc" },
      include: {
        lois: {
          orderBy: { order: "asc" },
          include: {
            stages: {
              orderBy: { order: "asc" },
              include: {
                posts: {
                  where: { classRoom: { slug } },
                  orderBy: { createdAt: "desc" },
                  include: { attachments: { orderBy: { order: "asc" } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!classRoom) {
    notFound();
  }

  const uoisWithPosts = uois.map((u) => ({
    id: u.id,
    name: u.name,
    lois: u.lois.map((l) => ({
      id: l.id,
      name: l.name,
      stages: l.stages.map((s) => ({
        id: s.id,
        name: s.name,
        posts: s.posts,
      })),
    })),
  }));

  const hasAnyStage = uois.some((u) => u.lois.some((l) => l.stages.length > 0));

  return (
    <>
      <p className="mt-3 text-sm font-medium text-blue-600">{config.projectTitle}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{classRoom.name}</h1>
      <p className="mt-1 text-gray-500">{classRoom.teacherName ? `${classRoom.teacherName} 선생님` : ""}</p>

      {!hasAnyStage ? (
        <p className="mt-10 text-gray-400">
          아직 등록된 탐구 단원(UOI)/탐구 주제(LOI)/수업 단계가 없습니다. 관리자에게 문의해주세요.
        </p>
      ) : (
        <ClassBoard classSlug={classRoom.slug} uois={uoisWithPosts} />
      )}
    </>
  );
}
