"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { sendPushToAll } from "@/lib/webpush";

type Result = { success: true } | { error: string };

const MAX_ATTACHMENTS = 15;

export async function loginWithClassCode(
  code: string
): Promise<{ success: true; slug: string; name: string } | { error: string }> {
  if (!code) {
    return { error: "반 코드를 입력해주세요." };
  }

  const classes = await prisma.classRoom.findMany();
  for (const c of classes) {
    const match = await verifyPassword(code, c.passwordHash);
    if (match) {
      return { success: true, slug: c.slug, name: c.name };
    }
  }

  return { error: "일치하는 반 코드가 없습니다." };
}

export async function createPost(
  classSlug: string,
  stageId: string,
  password: string,
  content: string,
  attachments: { url: string; type: "image" | "video" }[]
): Promise<Result> {
  const classRoom = await prisma.classRoom.findUnique({ where: { slug: classSlug } });
  if (!classRoom) {
    return { error: "학급을 찾을 수 없습니다." };
  }

  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) {
    return { error: "수업 단계를 찾을 수 없습니다." };
  }

  if (!password) {
    return { error: "학급 비밀번호를 입력해주세요." };
  }

  const valid = await verifyPassword(password, classRoom.passwordHash);
  if (!valid) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  const trimmedContent = content?.trim() ?? "";
  if (!trimmedContent && attachments.length === 0) {
    return { error: "내용을 입력하거나 사진/동영상을 선택해주세요." };
  }
  if (attachments.length > MAX_ATTACHMENTS) {
    return { error: `사진/동영상은 최대 ${MAX_ATTACHMENTS}개까지 첨부할 수 있습니다.` };
  }

  await prisma.post.create({
    data: {
      classRoomId: classRoom.id,
      stageId: stage.id,
      content: trimmedContent,
      attachments: {
        create: attachments.map((a, i) => ({ url: a.url, type: a.type, order: i })),
      },
    },
  });

  revalidatePath(`/class/${classSlug}`);
  revalidatePath("/");

  // 이 반의 알림이 꺼져 있으면(관리자 설정) 조용히 등록만 하고 알림은 보내지 않습니다.
  // 알림 전송에 실패해도 게시글 등록 자체는 이미 성공했으니 계속 진행합니다.
  if (classRoom.pushNotifyEnabled) {
    await sendPushToAll({
      title: `${classRoom.name} 새 글`,
      body: trimmedContent || "사진/동영상이 등록되었습니다.",
      url: `/class/${classSlug}`,
    }).catch((err) => console.error("푸시 알림 전송 실패:", err));
  }

  return { success: true };
}

export async function updatePost(
  classSlug: string,
  postId: string,
  password: string,
  content: string,
  attachments: { url: string; type: "image" | "video" }[]
): Promise<Result> {
  const classRoom = await prisma.classRoom.findUnique({ where: { slug: classSlug } });
  if (!classRoom) {
    return { error: "학급을 찾을 수 없습니다." };
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.classRoomId !== classRoom.id) {
    return { error: "게시글을 찾을 수 없습니다." };
  }

  if (!password) {
    return { error: "학급 비밀번호를 입력해주세요." };
  }

  const valid = await verifyPassword(password, classRoom.passwordHash);
  if (!valid) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  const trimmedContent = content?.trim() ?? "";
  if (!trimmedContent && attachments.length === 0) {
    return { error: "내용을 입력하거나 사진/동영상을 선택해주세요." };
  }
  if (attachments.length > MAX_ATTACHMENTS) {
    return { error: `사진/동영상은 최대 ${MAX_ATTACHMENTS}개까지 첨부할 수 있습니다.` };
  }

  await prisma.$transaction([
    prisma.attachment.deleteMany({ where: { postId } }),
    prisma.post.update({
      where: { id: postId },
      data: {
        content: trimmedContent,
        attachments: {
          create: attachments.map((a, i) => ({ url: a.url, type: a.type, order: i })),
        },
      },
    }),
  ]);

  revalidatePath(`/class/${classSlug}`);
  revalidatePath("/");

  // 이 반의 알림이 꺼져 있으면(관리자 설정) 조용히 수정만 하고 알림은 보내지 않습니다.
  // 알림 전송에 실패해도 게시글 수정 자체는 이미 성공했으니 계속 진행합니다.
  if (classRoom.pushNotifyEnabled) {
    await sendPushToAll({
      title: `${classRoom.name} 글 수정`,
      body: trimmedContent || "사진/동영상이 수정되었습니다.",
      url: `/class/${classSlug}`,
    }).catch((err) => console.error("푸시 알림 전송 실패:", err));
  }

  return { success: true };
}
