"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { getConfig } from "@/lib/config";

type Result = { success: true } | { error: string };

async function adminError(password: string): Promise<string | null> {
  const config = await getConfig();
  const ok = await verifyPassword(password, config.adminPasswordHash);
  return ok ? null : "관리자 비밀번호가 올바르지 않습니다.";
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/class/[slug]", "page");
}

export async function updateProjectTitle(password: string, title: string): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };
  if (!title.trim()) return { error: "프로젝트 제목을 입력해주세요." };

  const config = await getConfig();
  await prisma.config.update({ where: { id: config.id }, data: { projectTitle: title.trim() } });

  refresh();
  return { success: true };
}

// ------------------------------------------------------------------
// 탐구 단원 (UOI)
// ------------------------------------------------------------------

export async function createUoi(password: string, name: string): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };
  if (!name.trim()) return { error: "탐구 단원 이름을 입력해주세요." };

  const last = await prisma.uoi.findFirst({ orderBy: { order: "desc" } });
  await prisma.uoi.create({ data: { name: name.trim(), order: (last?.order ?? 0) + 1 } });

  refresh();
  return { success: true };
}

export async function renameUoi(password: string, uoiId: string, name: string): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };
  if (!name.trim()) return { error: "탐구 단원 이름을 입력해주세요." };

  await prisma.uoi.update({ where: { id: uoiId }, data: { name: name.trim() } });

  refresh();
  return { success: true };
}

export async function deleteUoi(password: string, uoiId: string): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };

  // 이 단원에 속한 탐구 주제/단계/게시글도 함께 삭제됩니다.
  await prisma.uoi.delete({ where: { id: uoiId } });

  refresh();
  return { success: true };
}

export async function moveUoi(password: string, uoiId: string, direction: "up" | "down"): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };

  const uois = await prisma.uoi.findMany({ orderBy: { order: "asc" } });
  const idx = uois.findIndex((u) => u.id === uoiId);
  if (idx === -1) return { error: "탐구 단원을 찾을 수 없습니다." };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= uois.length) {
    return { success: true }; // 이미 맨 위/아래
  }

  const a = uois[idx];
  const b = uois[swapIdx];
  await prisma.$transaction([
    prisma.uoi.update({ where: { id: a.id }, data: { order: -1 } }), // 유니크 충돌 방지용 임시값
    prisma.uoi.update({ where: { id: b.id }, data: { order: a.order } }),
    prisma.uoi.update({ where: { id: a.id }, data: { order: b.order } }),
  ]);

  refresh();
  return { success: true };
}

// ------------------------------------------------------------------
// 탐구 주제 (LOI) - 특정 UOI에 속함
// ------------------------------------------------------------------

export async function createLoi(password: string, uoiId: string, name: string): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };
  if (!name.trim()) return { error: "탐구 주제 이름을 입력해주세요." };

  const last = await prisma.loi.findFirst({ where: { uoiId }, orderBy: { order: "desc" } });
  await prisma.loi.create({ data: { uoiId, name: name.trim(), order: (last?.order ?? 0) + 1 } });

  refresh();
  return { success: true };
}

export async function renameLoi(password: string, loiId: string, name: string): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };
  if (!name.trim()) return { error: "탐구 주제 이름을 입력해주세요." };

  await prisma.loi.update({ where: { id: loiId }, data: { name: name.trim() } });

  refresh();
  return { success: true };
}

export async function deleteLoi(password: string, loiId: string): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };

  // 이 주제에 속한 단계/게시글도 함께 삭제됩니다.
  await prisma.loi.delete({ where: { id: loiId } });

  refresh();
  return { success: true };
}

export async function moveLoi(password: string, loiId: string, direction: "up" | "down"): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };

  const current = await prisma.loi.findUnique({ where: { id: loiId } });
  if (!current) return { error: "탐구 주제를 찾을 수 없습니다." };

  const siblings = await prisma.loi.findMany({ where: { uoiId: current.uoiId }, orderBy: { order: "asc" } });
  const idx = siblings.findIndex((l) => l.id === loiId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) {
    return { success: true };
  }

  const a = siblings[idx];
  const b = siblings[swapIdx];
  await prisma.$transaction([
    prisma.loi.update({ where: { id: a.id }, data: { order: -1 } }),
    prisma.loi.update({ where: { id: b.id }, data: { order: a.order } }),
    prisma.loi.update({ where: { id: a.id }, data: { order: b.order } }),
  ]);

  refresh();
  return { success: true };
}

// ------------------------------------------------------------------
// 수업 단계 (Stage) - 특정 LOI에 속함
// ------------------------------------------------------------------

export async function createStage(password: string, loiId: string, name: string): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };
  if (!name.trim()) return { error: "단계 이름을 입력해주세요." };

  const last = await prisma.stage.findFirst({ where: { loiId }, orderBy: { order: "desc" } });
  await prisma.stage.create({ data: { loiId, name: name.trim(), order: (last?.order ?? 0) + 1 } });

  refresh();
  return { success: true };
}

export async function renameStage(password: string, stageId: string, name: string): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };
  if (!name.trim()) return { error: "단계 이름을 입력해주세요." };

  await prisma.stage.update({ where: { id: stageId }, data: { name: name.trim() } });

  refresh();
  return { success: true };
}

export async function deleteStage(password: string, stageId: string): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };

  await prisma.stage.delete({ where: { id: stageId } }); // 해당 단계의 게시글도 함께 삭제됩니다.

  refresh();
  return { success: true };
}

export async function moveStage(password: string, stageId: string, direction: "up" | "down"): Promise<Result> {
  const err = await adminError(password);
  if (err) return { error: err };

  const current = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!current) return { error: "단계를 찾을 수 없습니다." };

  const siblings = await prisma.stage.findMany({ where: { loiId: current.loiId }, orderBy: { order: "asc" } });
  const idx = siblings.findIndex((s) => s.id === stageId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) {
    return { success: true };
  }

  const a = siblings[idx];
  const b = siblings[swapIdx];
  await prisma.$transaction([
    prisma.stage.update({ where: { id: a.id }, data: { order: -1 } }),
    prisma.stage.update({ where: { id: b.id }, data: { order: a.order } }),
    prisma.stage.update({ where: { id: a.id }, data: { order: b.order } }),
  ]);

  refresh();
  return { success: true };
}
