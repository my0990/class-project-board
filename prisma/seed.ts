import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ------------------------------------------------------------------
// 1) 공통 프로젝트 설정 (전체 반이 함께 진행하는 프로젝트 제목 + 관리자 비밀번호)
//    실제 정보로 바꾼 뒤 다시 실행하면 반영됩니다(이미 있으면 값은 유지, 아래에서 갱신 로직 참고).
// ------------------------------------------------------------------
const PROJECT_TITLE = "우리 동네 문제 해결 프로젝트";
const ADMIN_PASSWORD = "admin123!"; // 관리자(단원/단계 관리) 비밀번호 - 꼭 바꿔서 공유하세요.

// ------------------------------------------------------------------
// 2) 탐구 단원(UOI) > 탐구 주제(LOI) > 수업 단계(Stage) 구조
//    나중에 admin 페이지에서 이름/순서/추가/삭제를 자유롭게 바꿀 수 있습니다.
// ------------------------------------------------------------------
const STAGE_NAMES = ["관계맺기", "집중하기", "조사하기", "조직 및 정리하기", "일반화하기"];

const UOIS = [
  {
    name: "uoi1",
    lois: [
      { name: "loi1", stages: STAGE_NAMES },
      { name: "loi2", stages: STAGE_NAMES },
      { name: "loi3", stages: STAGE_NAMES },
    ],
  },
  {
    name: "uoi2",
    lois: [
      { name: "loi1", stages: STAGE_NAMES },
      { name: "loi2", stages: STAGE_NAMES },
      { name: "loi3", stages: STAGE_NAMES },
    ],
  },
  {
    name: "uoi3",
    lois: [
      { name: "loi1", stages: STAGE_NAMES },
      { name: "loi2", stages: STAGE_NAMES },
      { name: "loi3", stages: STAGE_NAMES },
    ],
  },
];

// ------------------------------------------------------------------
// 3) 7개 학급
// ------------------------------------------------------------------
const UPDATE_EXISTING = false;

const classes = [
  { slug: "1", name: "1반", teacherName: "이지혜", password: "class1!" },
  { slug: "2", name: "2반", teacherName: "강지현", password: "class2!" },
  { slug: "3", name: "3반", teacherName: "김신영", password: "class3!" },
  { slug: "4", name: "4반", teacherName: "최규진", password: "class4!" },
  { slug: "5", name: "5반", teacherName: "신하경", password: "class5!" },
  { slug: "6", name: "6반", teacherName: "이지훈", password: "class6!" },
  { slug: "7", name: "7반", teacherName: "탁태현", password: "class7!" },
];

// 로컬 더미 테스트용 샘플 게시글
// (반 slug -> [ {uoi 인덱스, loi 인덱스, stage 인덱스 (모두 0부터), 내용, 이미지 여부, 며칠 전} ])
const dummyPosts: Record<
  string,
  { uoi: number; loi: number; stage: number; content: string; withImage: boolean; daysAgo: number }[]
> = {
  "1": [
    { uoi: 0, loi: 0, stage: 0, content: "친구들과 우리 동네에서 관심 있는 문제를 자유롭게 이야기 나눴어요.", withImage: true, daysAgo: 8 },
    { uoi: 0, loi: 0, stage: 1, content: "조사한 내용을 바탕으로 우리 동네 문제의 공통점을 정리했습니다.", withImage: false, daysAgo: 3 },
  ],
  "2": [
    { uoi: 0, loi: 0, stage: 0, content: "동네 지도를 보며 평소 불편했던 장소에 스티커를 붙여봤어요.", withImage: true, daysAgo: 6 },
  ],
  "3": [
    { uoi: 0, loi: 0, stage: 0, content: "조사 계획서를 작성하고 역할을 분담했습니다.", withImage: false, daysAgo: 5 },
    { uoi: 0, loi: 1, stage: 0, content: "직접 동네를 다니며 불편한 시설을 사진으로 기록했습니다.", withImage: true, daysAgo: 1 },
  ],
  "4": [
    { uoi: 0, loi: 0, stage: 0, content: "우리 동네에서 바꾸고 싶은 것을 그림으로 표현해봤어요.", withImage: true, daysAgo: 7 },
  ],
  "5": [
    { uoi: 0, loi: 1, stage: 0, content: "동네 어른들을 인터뷰하고 답변을 정리했습니다.", withImage: false, daysAgo: 2 },
  ],
  "6": [
    { uoi: 0, loi: 0, stage: 0, content: "동네 문제에 대한 브레인스토밍을 진행했습니다.", withImage: true, daysAgo: 9 },
    { uoi: 0, loi: 0, stage: 1, content: "조사 주제를 3가지로 좁혔습니다.", withImage: false, daysAgo: 4 },
  ],
  "7": [
    { uoi: 0, loi: 2, stage: 0, content: "조사한 내용을 바탕으로 정리했습니다.", withImage: true, daysAgo: 1 },
  ],
};

async function main() {
  // 1) Config
  const existingConfig = await prisma.config.findFirst();
  if (!existingConfig) {
    await prisma.config.create({
      data: {
        projectTitle: PROJECT_TITLE,
        adminPasswordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      },
    });
  } else if (UPDATE_EXISTING) {
    await prisma.config.update({
      where: { id: existingConfig.id },
      data: {
        projectTitle: PROJECT_TITLE,
        adminPasswordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      },
    });
  }

  // 2) Uoi > Loi > Stage
  // stageId[uoiIndex][loiIndex][stageIndex] 형태로 나중에 더미 게시글을 만들 때 찾아 씁니다.
  const stageIdLookup: string[][][] = [];

  for (let ui = 0; ui < UOIS.length; ui++) {
    const uoiDef = UOIS[ui];
    const uoi = await prisma.uoi.upsert({
      where: { order: ui + 1 },
      update: UPDATE_EXISTING ? { name: uoiDef.name } : {},
      create: { order: ui + 1, name: uoiDef.name },
    });

    stageIdLookup[ui] = [];

    for (let li = 0; li < uoiDef.lois.length; li++) {
      const loiDef = uoiDef.lois[li];
      const loi = await prisma.loi.upsert({
        where: { uoiId_order: { uoiId: uoi.id, order: li + 1 } },
        update: UPDATE_EXISTING ? { name: loiDef.name } : {},
        create: { uoiId: uoi.id, order: li + 1, name: loiDef.name },
      });

      stageIdLookup[ui][li] = [];

      for (let si = 0; si < loiDef.stages.length; si++) {
        const stage = await prisma.stage.upsert({
          where: { loiId_order: { loiId: loi.id, order: si + 1 } },
          update: UPDATE_EXISTING ? { name: loiDef.stages[si] } : {},
          create: { loiId: loi.id, order: si + 1, name: loiDef.stages[si] },
        });
        stageIdLookup[ui][li][si] = stage.id;
      }
    }
  }

  // 3) Classes
  const classRoomBySlug: Record<string, { id: string }> = {};
  for (const c of classes) {
    const passwordHash = await bcrypt.hash(c.password, 10);
    const classRoom = await prisma.classRoom.upsert({
      where: { slug: c.slug },
      update: UPDATE_EXISTING ? { name: c.name, teacherName: c.teacherName || null, passwordHash } : {},
      create: { slug: c.slug, name: c.name, teacherName: c.teacherName || null, passwordHash },
    });
    classRoomBySlug[c.slug] = classRoom;
  }

  // 4) Dummy posts (처음 시드할 때만 추가)
  for (const [slug, posts] of Object.entries(dummyPosts)) {
    const classRoom = classRoomBySlug[slug];
    if (!classRoom) continue;

    const existingCount = await prisma.post.count({ where: { classRoomId: classRoom.id } });
    if (existingCount > 0) continue;

    for (const p of posts) {
      const stageId = stageIdLookup[p.uoi]?.[p.loi]?.[p.stage];
      if (!stageId) continue;
      await prisma.post.create({
        data: {
          classRoomId: classRoom.id,
          stageId,
          content: p.content,
          createdAt: new Date(Date.now() - p.daysAgo * 24 * 60 * 60 * 1000),
          attachments: p.withImage
            ? {
                create: [
                  {
                    url: `https://picsum.photos/seed/${slug}-${p.uoi}-${p.loi}-${p.stage}/800/500`,
                    type: "image",
                    order: 0,
                  },
                ],
              }
            : undefined,
        },
      });
    }
  }

  const uoiCount = await prisma.uoi.count();
  console.log(`설정 1개, 탐구단원(UOI) ${uoiCount}개, 학급 ${classes.length}개 + 더미 게시글 시드 완료`);
  console.log(`관리자 비밀번호(admin 페이지용): ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
