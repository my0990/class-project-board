"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const SWIPE_THRESHOLD_PX = 40;
const SLIDE_TRANSITION = "transition-transform duration-300 ease-out";

export default function PostCard({ post }: Props) {
  const attachments = post.attachments;
  // 확대창(라이트박스)에서는 사진끼리만 넘겨보게 합니다 (동영상은 원래 재생 컨트롤을 그대로 사용).
  const images = useMemo(() => attachments.filter((a) => a.type !== "video"), [attachments]);

  // 게시글 카드 안의 미리보기 슬라이드 (클릭하기 전에도 좌우로 넘겨볼 수 있음)
  const [previewIndex, setPreviewIndex] = useState(0);
  // 사진을 클릭했을 때 뜨는 확대창
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const showPrevPreview = () => setPreviewIndex((i) => (i - 1 + attachments.length) % attachments.length);
  const showNextPreview = () => setPreviewIndex((i) => (i + 1) % attachments.length);

  const showPrevLightbox = () => setLightboxIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length));
  const showNextLightbox = () => setLightboxIndex((i) => (i === null ? i : (i + 1) % images.length));

  // 확대창이 열려 있을 때 키보드로 조작할 수 있게 합니다 (ESC 닫기, 좌우 화살표 넘기기).
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowLeft") showPrevLightbox();
      else if (e.key === "ArrowRight") showNextLightbox();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, images.length]);

  // 미리보기 영역에서 손가락으로 좌우 스와이프해도 넘어가게 합니다 (휴대폰 사용 대비).
  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) < SWIPE_THRESHOLD_PX) return;
    if (diff > 0) showPrevPreview();
    else showNextPreview();
  };

  const lightboxTouchStartX = useRef(0);
  const onLightboxTouchStart = (e: React.TouchEvent) => {
    lightboxTouchStartX.current = e.touches[0].clientX;
  };
  const onLightboxTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - lightboxTouchStartX.current;
    if (Math.abs(diff) < SWIPE_THRESHOLD_PX) return;
    if (diff > 0) showPrevLightbox();
    else showNextLightbox();
  };

  function openLightboxFor(attachmentId: string) {
    const idx = images.findIndex((img) => img.id === attachmentId);
    if (idx !== -1) setLightboxIndex(idx);
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {attachments.length === 1 && (
        <div className="mb-3">{renderMedia(attachments[0], openLightboxFor, "max-h-72 w-full object-cover")}</div>
      )}

      {attachments.length > 1 && (
        <div
          className="relative mb-3 h-72 select-none overflow-hidden rounded-lg bg-gray-50"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* 사진/동영상을 가로로 나란히 놓고 전체를 밀어서(translateX) 슬라이드 애니메이션을 만듭니다. */}
          <div
            className={`flex h-full ${SLIDE_TRANSITION}`}
            style={{
              width: `${attachments.length * 100}%`,
              transform: `translateX(-${(100 / attachments.length) * previewIndex}%)`,
            }}
          >
            {attachments.map((a) => (
              <div key={a.id} className="h-full flex-shrink-0" style={{ width: `${100 / attachments.length}%` }}>
                {renderMedia(a, openLightboxFor, "h-full w-full object-cover")}
              </div>
            ))}
          </div>

          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            {previewIndex + 1} / {attachments.length}
          </span>

          <button
            type="button"
            onClick={showPrevPreview}
            aria-label="이전 사진"
            className="absolute left-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg leading-none text-white hover:bg-black/70"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={showNextPreview}
            aria-label="다음 사진"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg leading-none text-white hover:bg-black/70"
          >
            ›
          </button>
        </div>
      )}

      {post.content && <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{post.content}</p>}
      <p className="mt-3 text-xs text-gray-400">{formatDateTime(post.createdAt)}</p>

      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxIndex(null)}
          onTouchStart={onLightboxTouchStart}
          onTouchEnd={onLightboxTouchEnd}
          className="fixed inset-0 z-50 overflow-hidden bg-black/80"
        >
          {images.length > 1 && (
            <p className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
              {lightboxIndex + 1} / {images.length}
            </p>
          )}

          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="닫기"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20"
          >
            ×
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showPrevLightbox();
                }}
                aria-label="이전 사진"
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:left-4"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showNextLightbox();
                }}
                aria-label="다음 사진"
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:right-4"
              >
                ›
              </button>
            </>
          )}

          {/* 확대창도 마찬가지로 사진들을 가로로 나란히 놓고 밀어서 슬라이드 애니메이션을 만듭니다. */}
          <div
            className={`flex h-full ${SLIDE_TRANSITION}`}
            style={{
              width: `${images.length * 100}%`,
              transform: `translateX(-${(100 / images.length) * lightboxIndex}%)`,
            }}
          >
            {images.map((img) => (
              <div key={img.id} className="flex h-full flex-shrink-0 items-center justify-center p-4" style={{ width: `${100 / images.length}%` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  onClick={(e) => e.stopPropagation()}
                  className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function renderMedia(a: Attachment, onImageClick: (attachmentId: string) => void, className: string) {
  if (a.type === "video") {
    return <video src={a.url} controls className={`rounded-lg bg-black ${className}`} />;
  }
  return (
    // 다양한 이미지 호스트를 별도 설정 없이 지원하기 위해 next/image 대신 img 태그를 사용합니다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={a.url}
      alt=""
      onClick={() => onImageClick(a.id)}
      className={`cursor-zoom-in rounded-lg transition hover:opacity-90 ${className}`}
    />
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
