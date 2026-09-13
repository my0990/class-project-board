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
          <div className="mt-4 space-y-2.5">
            {uois.map((u) => {
              const stages = u.lois.flatMap((l) => l.stages);
              const total = stages.length;
              const done = stages.filter((s) => s.done).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={u.id}>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate">{u.name}</span>
                    <span className="flex-none pl-2">
                      {done}/{total}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
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
