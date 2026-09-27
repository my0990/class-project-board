// UOI/LOI에 참고 자료 링크(문서/캔바/패들렛)를 한 번에 채워 넣는 스크립트입니다.
// 실행: npx tsx prisma/seed-uoi-resource-links.ts
//
// 이후에 자료를 추가/수정/삭제하려면 이 스크립트를 다시 쓸 필요 없이
// 관리자 페이지(/admin)의 "탐구 단원(UOI) · 탐구 주제(LOI) · 수업 단계" 섹션에서
// 각 UOI/LOI 옆의 문서·캔바·패들렛 입력칸에 바로 채우면 됩니다.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// uoiName / loiName은 seed.ts에서 만든 이름("UOI1", "LOI1" 등)과 같아야 합니다.
const UPDATES: {
  uoiName: string;
  loiName?: string;
  docUrl?: string;
  canvaUrl?: string;
  padletUrl?: string;
}[] = [
  {
    uoiName: "UOI1",
    docUrl:
      "https://docs.google.com/document/d/1VdcHJ70p7HPybuObyC0HUrmtA2Kpv7Jd/edit?usp=sharing&ouid=106695318357625822531&rtpof=true&sd=true",
  },
  { uoiName: "UOI1", loiName: "LOI1", canvaUrl: "https://canva.link/2n4fjw0awnemqms" },
  { uoiName: "UOI1", loiName: "LOI2", canvaUrl: "https://canva.link/l471nnittlow2d6" },
  { uoiName: "UOI1", loiName: "LOI1", padletUrl: "https://padlet.com/cjjungangtap/loi1-6-vlxo44v7m7d93rya" },
  { uoiName: "UOI1", loiName: "LOI2", padletUrl: "https://padlet.com/cjjungangtap/loi2-zunrljbc5280cvst" },
  { uoiName: "UOI1", loiName: "LOI3", padletUrl: "https://padlet.com/cjjungangtap/loi3-118air9jv20a0exq" },
  {
    uoiName: "UOI2",
    docUrl: "https://docs.google.com/document/d/1blTTEPFip2CIJ5GPK1S03Qaw4Q2gYXLY/edit",
  },
  { uoiName: "UOI2", loiName: "LOI1", canvaUrl: "https://canva.link/sfx45eqdzugpwt0" },
];

async function main() {
  for (const u of UPDATES) {
    const uoi = await prisma.uoi.findFirst({ where: { name: u.uoiName } });
    if (!uoi) {
      console.warn(`건너뜀: "${u.uoiName}" 단원을 찾을 수 없습니다.`);
      continue;
    }

    if (u.loiName) {
      const loi = await prisma.loi.findFirst({ where: { uoiId: uoi.id, name: u.loiName } });
      if (!loi) {
        console.warn(`건너뜀: "${u.uoiName}"의 "${u.loiName}"을 찾을 수 없습니다.`);
        continue;
      }
      await prisma.loi.update({
        where: { id: loi.id },
        data: {
          ...(u.canvaUrl ? { canvaUrl: u.canvaUrl } : {}),
          ...(u.padletUrl ? { padletUrl: u.padletUrl } : {}),
        },
      });
      console.log(`업데이트됨: ${u.uoiName} ${u.loiName}`);
    } else if (u.docUrl) {
      await prisma.uoi.update({ where: { id: uoi.id }, data: { docUrl: u.docUrl } });
      console.log(`업데이트됨: ${u.uoiName} 문서 링크`);
    }
  }

  console.log("\n완료되었습니다.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
