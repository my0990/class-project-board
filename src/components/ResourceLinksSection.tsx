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

type Chip = { key: string; label: string; url: string };

// 홈 화면에서 "참고 자료"를 접어두었다가 필요할 때만 펼쳐서 보는 영역입니다.
// 전체를 한 곳에 모아두되, 그 안을 종류별(UOI 통합문서 / LOI별 캔바 / LOI별 패들렛)로 나눠서 보여줍니다.
export default function ResourceLinksSection({ uois }: { uois: Uoi[] }) {
  const [open, setOpen] = useState(false);

  const docChips: Chip[] = uois
    .filter((u) => u.docUrl)
    .map((u) => ({ key: `${u.id}-doc`, label: u.name, url: u.docUrl as string }));

  const canvaChips: Chip[] = uois.flatMap((u) =>
    u.lois
      .filter((l) => l.canvaUrl)
      .map((l) => ({ key: `${l.id}-canva`, label: `${u.name} ${l.name}`, url: l.canvaUrl as string }))
  );

  const padletChips: Chip[] = uois.flatMap((u) =>
    u.lois
      .filter((l) => l.padletUrl)
      .map((l) => ({ key: `${l.id}-padlet`, label: `${u.name} ${l.name}`, url: l.padletUrl as string }))
  );

  const totalCount = docChips.length + canvaChips.length + padletChips.length;

  if (totalCount === 0) return null;

  const sections: { icon: string; title: string; chips: Chip[] }[] = [
    { icon: "📄", title: "UOI 통합문서", chips: docChips },
    { icon: "🎨", title: "LOI별 캔바", chips: canvaChips },
    { icon: "📌", title: "LOI별 패들렛", chips: padletChips },
  ].filter((s) => s.chips.length > 0);

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
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-gray-500">
                <span aria-hidden="true">{section.icon}</span>
                {section.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {section.chips.map((chip) => (
                  <a
                    key={chip.key}
                    href={chip.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {chip.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
