// 참고 자료 링크 초기 데이터를 한 번만 넣어주는 스크립트입니다.
// 실행: npx tsx prisma/seed-resource-links.ts
//
// 이후에 자료를 추가/수정/삭제하려면 이 스크립트를 다시 쓸 필요 없이
// 관리자 페이지(/admin)의 "참고 자료 링크" 섹션에서 바로 하면 됩니다.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LINKS: { label: string; url: string }[] = [
  {
    label: "UOI1 수정본",
    url: "https://docs.google.com/document/d/1VdcHJ70p7HPybuObyC0HUrmtA2Kpv7Jd/edit?usp=sharing&ouid=106695318357625822531&rtpof=true&sd=true",
  },
  { label: "UOI1 LOI1 캔바", url: "https://canva.link/2n4fjw0awnemqms" },
  { label: "UOI1 LOI2 캔바", url: "https://canva.link/l471nnittlow2d6" },
  { label: "UOI1 LOI1 자료 패들렛", url: "https://padlet.com/cjjungangtap/loi1-6-vlxo44v7m7d93rya" },
  { label: "UOI1 LOI2 자료 패들렛", url: "https://padlet.com/cjjungangtap/loi2-zunrljbc5280cvst" },
  { label: "UOI1 LOI3 자료 패들렛", url: "https://padlet.com/cjjungangtap/loi3-118air9jv20a0exq" },
  { label: "UOI2 수정본", url: "https://docs.google.com/document/d/1blTTEPFip2CIJ5GPK1S03Qaw4Q2gYXLY/edit" },
  { label: "UOI2 LOI1 캔바", url: "https://canva.link/sfx45eqdzugpwt0" },
];

async function main() {
  const last = await prisma.resourceLink.findFirst({ orderBy: { order: "desc" } });
  let order = last?.order ?? 0;

  for (const link of LINKS) {
    order += 1;
    await prisma.resourceLink.create({ data: { ...link, order } });
    console.log(`추가됨: ${link.label}`);
  }

  console.log(`\n총 ${LINKS.length}개 자료 링크를 추가했습니다.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
