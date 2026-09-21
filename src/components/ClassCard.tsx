import Link from "next/link";

type StageProgress = { id: string; name: string; done: boolean };
type LoiProgress = { id: string; name: string; stages: StageProgress[] };
type UoiProgress = { id: string; name: string; lois: LoiProgress[] };

type Props = {
  slug: string;
  name: string;
  teacherName: string | null;
  uois: UoiProgress[];
};

export default function ClassCard({ slug, name, teacherName, uois }: Props) {
  // 전체를 순서대로 펼친 목록 (현재 진행 위치를 찾기 위함)
  const flat = uois.flatMap((u) =>
    u.lois.flatMap((l) => l.stages.map((s) => ({ uoiName: u.name, loiName: l.name, stageName: s.name, done: s.done })))
  );
  const doneCount = flat.filter((f) => f.done).length;
  const current = [...flat].reverse().find((f) => f.done);

  return (
    <Link
      href={`/class/${slug}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{name}</h2>
        <span className="text-sm text-gray-500">{teacherName ? `${teacherName} 선생님` : ""}</span>
      </div>

      {flat.length > 0 ? (
        <>
          <div className="mt-4 space-y-3">
            {uois.map((u) => {
              const uoiStages = u.lois.flatMap((l) => l.stages);
              const uoiTotal = uoiStages.length;
              const uoiDone = uoiStages.filter((s) => s.done).length;
              return (
                <div key={u.id}>
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                    <span className="truncate">{u.name}</span>
                    <span className="flex-none pl-2 font-normal text-gray-400">
                      {uoiDone}/{uoiTotal}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1.5 border-l-2 border-gray-100 pl-2.5">
                    {u.lois.map((l) => {
                      const total = l.stages.length;
                      const done = l.stages.filter((s) => s.done).length;
                      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                      const complete = total > 0 && done === total;
                      return (
                        <div key={l.id}>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span className="truncate">
                              {l.name}
                              {complete && <span className="ml-1 text-blue-500">완료</span>}
                            </span>
                            <span className="flex-none pl-2">
                              {done}/{total}
                            </span>
                          </div>
                          <div className="mt-0.5 h-1.5 rounded-full bg-gray-200">
                            <div
                              className={`h-1.5 rounded-full ${complete ? "bg-blue-500" : "bg-blue-400"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            {doneCount}/{flat.length}단계 진행 · 현재:{" "}
            {current ? `${current.uoiName} > ${current.loiName} > ${current.stageName}` : "시작 전"}
          </p>
        </>
      ) : (
        <p className="mt-4 text-xs text-gray-400">등록된 수업 단계가 없습니다.</p>
      )}
    </Link>
  );
}
