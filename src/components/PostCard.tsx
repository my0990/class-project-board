"use client";

import { useEffect, useState } from "react";

type Attachment = {
  id: string;
  url: string;
  type: string; // "image" | "video"
};

type Props = {
  post: {
    id: string;
    content: string;
    attachments: Attachment[];
    createdAt: Date | string;
  };
};

export default function PostCard({ post }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // 확대창이 열려 있을 때 ESC 키로 닫을 수 있게 합니다.
  useEffect(() => {
    if (!lightboxUrl) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxUrl]);

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {post.attachments.length > 0 && (
        <div className={`mb-3 grid gap-2 ${post.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {post.attachments.map((a) =>
            a.type === "video" ? (
              <video
                key={a.id}
                src={a.url}
                controls
                className="max-h-72 w-full rounded-lg border border-gray-100 bg-black"
              />
            ) : (
              // 다양한 이미지 호스트를 별도 설정 없이 지원하기 위해 next/image 대신 img 태그를 사용합니다.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={a.id}
                src={a.url}
                alt=""
                onClick={() => setLightboxUrl(a.url)}
                className="max-h-72 w-full cursor-zoom-in rounded-lg border border-gray-100 object-cover transition hover:opacity-90"
              />
            )
          )}
        </div>
      )}
      {post.content && <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{post.content}</p>}
      <p className="mt-3 text-xs text-gray-400">{formatDateTime(post.createdAt)}</p>

      {lightboxUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label="닫기"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </article>
  );
}

function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
