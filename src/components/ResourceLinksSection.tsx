"use client";

import { useState } from "react";

type ResourceLink = { id: string; label: string; url: string };

// 홈 화면에서 "참고 자료"를 접어두었다가 필요할 때만 펼쳐서 보는 영역입니다.
// 구글문서/캔바/패들렛 등 관리자 페이지에서 등록한 링크들을 버튼으로 보여줍니다.
export default function ResourceLinksSection({ links }: { links: ResourceLink[] }) {
  const [open, setOpen] = useState(false);

  if (links.length === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700"
      >
        <span>📎 참고 자료 ({links.length})</span>
        <span className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
