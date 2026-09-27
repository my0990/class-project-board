"use client";

import { useState } from "react";

type Loi = {
  id: string;
  name: string;
  canvaUrl: string | null;
  padletUrl: string | null;
};
type Uoi = {
  id: string;
  name: string;
  docUrl: string | null;
  lois: Loi[];
};

// 홈 화면에서 "참고 자료"를 접어두었다가 필요할 때만 펼쳐서 보는 영역입니다.
// UOI 전체 문서(📄) / LOI 캔바 자료(🎨) / LOI 패들렛 자료(📌)를
// UOI 단위로 묶어서 보여줍니다.
export default function ResourceLinksSection({ uois }: { uois: Uoi[] }) {
  const [open, setOpen] = useState(false);

  const groups = uois
    .map((uoi) => ({
      uoi,
      chips: [
        uoi.docUrl ? { key: `${uoi.id}-doc`, icon: "📄", label: `${uoi.name} 수정본`, url: uoi.docUrl } : null,
        ...uoi.lois.flatMap((loi) => [
          loi.canvaUrl ? { key: `${loi.id}-canva`, icon: "🎨", label: `${loi.name} 캔바`, url: loi.canvaUrl } : null,
          loi.padletUrl
            ? { key: `${loi.id}-padlet`, icon: "📌", label: `${loi.name} 패들렛`, url: loi.padletUrl }
            : null,
        ]),
      ].filter((c): c is { key: string; icon: string; label: string; url: string } => c !== null),
    }))
    .filter((g) => g.chips.length > 0);

  const totalCount = groups.reduce((sum, g) => sum + g.chips.length, 0);

  if (totalCount === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700"
      >
        <span>📎 참고 자료 ({totalCount})</span>
        <span className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3">
          {groups.map(({ uoi, chips }) => (
            <div key={uoi.id} className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {uoi.name}
              </span>
              {chips.map((chip) => (
                <a
                  key={chip.key}
                  href={chip.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <span aria-hidden="true">{chip.icon}</span>
                  {chip.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
