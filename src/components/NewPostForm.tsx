"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPost, updatePost } from "@/app/actions";
import { compressImage, compressVideo } from "@/lib/mediaCompression";
import { uploadFileToR2 } from "@/lib/uploadToR2";

const MAX_FILES = 5;

type FileStatus = "대기" | "압축 중" | "업로드 중" | "완료" | "실패";

type PendingFile = {
  file: File;
  preview: string;
  isVideo: boolean;
  status: FileStatus;
  progress: number; // 0~1, 동영상 압축 진행률
};

type ExistingAttachment = { id: string; url: string; type: string };

type ExistingPost = {
  id: string;
  content: string;
  attachments: ExistingAttachment[];
};

export default function NewPostForm({
  classSlug,
  stageId,
  password,
  existingPost,
  onCancel,
  onSaved,
}: {
  classSlug: string;
  stageId: string;
  password: string;
  existingPost?: ExistingPost;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!existingPost;

  const [content, setContent] = useState(existingPost?.content ?? "");
  const [keptAttachments, setKeptAttachments] = useState<ExistingAttachment[]>(existingPost?.attachments ?? []);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const totalCount = keptAttachments.length + files.length;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    setError(null);
    if (totalCount + selected.length > MAX_FILES) {
      setError(`사진/동영상은 최대 ${MAX_FILES}개까지 첨부할 수 있어요.`);
    }

    const room = Math.max(0, MAX_FILES - totalCount);
    const accepted = selected.slice(0, room);

    const newOnes: PendingFile[] = accepted.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
      status: "대기",
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newOnes]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeKeptAttachment(id: string) {
    setKeptAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function updateFileStatus(index: number, patch: Partial<PendingFile>) {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function resetForm() {
    setContent("");
    setFiles([]);
    setKeptAttachments([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (!content.trim() && keptAttachments.length === 0 && files.length === 0) {
      setError("내용을 입력하거나 사진/동영상을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const attachments: { url: string; type: "image" | "video" }[] = keptAttachments.map((a) => ({
        url: a.url,
        type: a.type === "video" ? "video" : "image",
      }));

      const uploadedNow: { url: string; type: "image" | "video" }[] = [];

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        let processed: File = item.file;

        try {
          updateFileStatus(i, { status: "압축 중", progress: 0 });

          if (item.isVideo) {
            processed = await compressVideo(item.file, (ratio) => updateFileStatus(i, { progress: ratio }));
          } else {
            processed = await compressImage(item.file);
          }

          updateFileStatus(i, { status: "업로드 중" });
          const { url } = await uploadFileToR2(processed);

          const uploaded: { url: string; type: "image" | "video" } = { url, type: item.isVideo ? "video" : "image" };
          uploadedNow.push(uploaded);
          attachments.push(uploaded);
          updateFileStatus(i, { status: "완료", progress: 1 });
        } catch (fileErr) {
          // 어떤 파일에서 실패했는지 목록에 바로 표시해서, 다시 시도할 때 헷갈리지 않게 합니다.
          updateFileStatus(i, { status: "실패" });
          // 원인 파악을 위해, 실제로 업로드를 시도한 파일의 용량/형식을 에러 메시지에 같이 남깁니다.
          const sizeMB = (processed.size / (1024 * 1024)).toFixed(1);
          const typeLabel = processed.type || item.file.type || "알 수 없음";
          const baseMessage = fileErr instanceof Error ? fileErr.message : "업로드에 실패했습니다.";
          throw new Error(`${baseMessage} [${sizeMB}MB, ${typeLabel}]`);
        }
      }

      const result = isEdit
        ? await updatePost(classSlug, existingPost!.id, password, content, attachments)
        : await createPost(classSlug, stageId, password, content, attachments);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      if (isEdit) {
        // 새로 업로드한 파일을 "기존 첨부"로 옮겨서 계속 수정창에 남아있게 합니다.
        setKeptAttachments((prev) => [
          ...prev,
          ...uploadedNow.map((a, i) => ({ id: `local-${Date.now()}-${i}`, url: a.url, type: a.type })),
        ]);
        setFiles([]);
      } else {
        resetForm();
      }
      setDone(true);
      router.refresh();
      onSaved?.();
    } catch (err) {
      // 실제 원인(예: 지원하지 않는 파일 형식, R2 업로드 실패 등)을 그대로 보여줘서
      // 문제를 더 쉽게 진단할 수 있게 합니다.
      const message = err instanceof Error && err.message ? err.message : "등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      setError(message);
      console.error("게시글 등록/수정 실패:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="이 단계에서 진행한 내용을 적어주세요"
        rows={3}
        className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
      />

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          disabled={totalCount >= MAX_FILES || submitting}
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        <p className="mt-1 text-xs text-gray-400">
          사진/동영상을 최대 {MAX_FILES}개까지 첨부할 수 있어요. 동영상은 자동으로 용량을 줄여서 올려요 (용량이 클수록
          시간이 좀 걸려요).
        </p>

        {(keptAttachments.length > 0 || files.length > 0) && (
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {keptAttachments.map((a) => (
              <li key={a.id} className="relative overflow-hidden rounded-lg border border-gray-200">
                {a.type === "video" ? (
                  <video src={a.url} muted className="h-20 w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt="" className="h-20 w-full object-cover" />
                )}
                {!submitting && (
                  <button
                    type="button"
                    onClick={() => removeKeptAttachment(a.id)}
                    className="absolute right-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-base leading-none text-white active:bg-black/80"
                    aria-label="첨부 제거"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {files.map((item, i) => (
              <li key={i} className="relative overflow-hidden rounded-lg border border-gray-200">
                {item.isVideo ? (
                  <video src={item.preview} muted className="h-20 w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.preview} alt="" className="h-20 w-full object-cover" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[10px] leading-tight text-white">
                  {item.status === "압축 중" && item.isVideo
                    ? `압축 중 ${Math.round(item.progress * 100)}%`
                    : item.status}
                </div>
                {!submitting && (
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute right-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-base leading-none text-white active:bg-black/80"
                    aria-label="첨부 제거"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? (isEdit ? "수정 중..." : "등록 중...") : isEdit ? "수정하기" : "등록하기"}
        </button>
        {onCancel && (
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            취소
          </button>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {done && !error && <p className="text-sm text-green-600">{isEdit ? "수정되었습니다." : "등록되었습니다."}</p>}
      </div>
    </form>
  );
}
