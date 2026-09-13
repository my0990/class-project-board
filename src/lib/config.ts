import { prisma } from "./prisma";

export async function getConfig() {
  const config = await prisma.config.findFirst();
  if (!config) {
    throw new Error(
      "설정 데이터가 없습니다. 터미널에서 `npm run db:seed`를 실행해 초기 데이터를 생성해주세요."
    );
  }
  return config;
}
