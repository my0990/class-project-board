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
// UOI 탭 → 그 안의 LOI 탭 순서로 눌러가며 문서/캔바/패들렛 자료를 찾아볼 수 있습니다.
export default function ResourceLinksSection({ uois }: { uois: Uoi[] }) {
  const [open, setOpen] = useState(false);

  const totalCount = uois.reduce(
    (sum, u) =>
      sum + (u.docUrl ? 1 : 0) + u.lois.reduce((s, l) => s + (l.canvaUrl ? 1 : 0) + (l.padletUrl ? 1 : 0), 0),
    0
  );

  const [activeUoiId, setActiveUoiId] = useState<string | null>(uois[0]?.id ?? null);
  const [activeLoiId, setActiveLoiId] = useState<string | null>(uois[0]?.lois[0]?.id ?? null);

  if (totalCount === 0 || uois.length === 0) return null;

  const activeUoi = uois.find((u) => u.id === activeUoiId) ?? uois[0];
  const activeLoi = activeUoi.lois.find((l) => l.id === activeLoiId) ?? activeUoi.lois[0] ?? null;

  function selectUoi(uoi: Uoi) {
    setActiveUoiId(uoi.id);
    setActiveLoiId(uoi.lois[0]?.id ?? null);
  }

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
        <div className="border-t border-gray-100">
          {/* UOI 탭 */}
          <div className="flex flex-wrap gap-1 px-4 pt-3">
            {uois.map((uoi) => (
              <button
                key={uoi.id}
                type="button"
                onClick={() => selectUoi(uoi)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  activeUoi.id === uoi.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {uoi.name}
              </button>
            ))}
          </div>

          <div className="px-4 py-3">
            {activeUoi.docUrl && (
              <a
                href={activeUoi.docUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span aria-hidden="true">📄</span>
                {activeUoi.name} 통합문서
              </a>
            )}

            {activeUoi.lois.length > 0 && (
              <>
                {/* LOI 탭 */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeUoi.lois.map((loi) => (
                    <button
                      key={loi.id}
                      type="button"
                      onClick={() => setActiveLoiId(loi.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                        activeLoi?.id === loi.id
                          ? "bg-gray-700 text-white"
                          : "border border-gray-200 text-gray-500 hover:border-gray-400"
                      }`}
                    >
                      {loi.name}
                    </button>
                  ))}
                </div>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {activeLoi?.canvaUrl && (
                    <a
                      href={activeLoi.canvaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <span aria-hidden="true">🎨</span>
                      캔바
                    </a>
                  )}
                  {activeLoi?.padletUrl && (
                    <a
                      href={activeLoi.padletUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <span aria-hidden="true">📌</span>
                      패들렛
                    </a>
                  )}
                  {!activeLoi?.canvaUrl && !activeLoi?.padletUrl && (
                    <p className="text-xs text-gray-400">등록된 자료가 없습니다.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
