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
// UOI별로 묶어서, 그 안에 통합문서 → LOI별 캔바/패들렛 순서로 한 번에 모두 보여줍니다.
export default function ResourceLinksSection({ uois }: { uois: Uoi[] }) {
  const [open, setOpen] = useState(false);

  const groups = uois
    .map((uoi) => ({
      uoi,
      lois: uoi.lois.filter((loi) => loi.canvaUrl || loi.padletUrl),
    }))
    .filter((g) => g.uoi.docUrl || g.lois.length > 0);

  const totalCount = groups.reduce(
    (sum, g) =>
      sum + (g.uoi.docUrl ? 1 : 0) + g.lois.reduce((s, l) => s + (l.canvaUrl ? 1 : 0) + (l.padletUrl ? 1 : 0), 0),
    0
  );

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
        <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-3">
          {groups.map(({ uoi, lois }) => (
            <div key={uoi.id}>
              <span className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {uoi.name}
              </span>

              <div className="mt-2 flex flex-col gap-1.5">
                {uoi.docUrl && (
                  <a
                    href={uoi.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <span aria-hidden="true">📄</span>
                    통합문서
                  </a>
                )}

                {lois.map((loi) => (
                  <div key={loi.id} className="flex flex-wrap items-center gap-2">
                    <span className="w-14 flex-none text-xs font-semibold text-gray-500">{loi.name}</span>
                    {loi.canvaUrl && (
                      <a
                        href={loi.canvaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <span aria-hidden="true">🎨</span>
                        캔바
                      </a>
                    )}
                    {loi.padletUrl && (
                      <a
                        href={loi.padletUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <span aria-hidden="true">📌</span>
                        패들렛
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
