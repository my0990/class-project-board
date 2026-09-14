// 홈 화면 데이터(제목, 학급 카드)가 로딩되는 동안 대신 보여주는 뼈대 화면입니다.
// 화면 구조는 먼저 보여주고, 실제 내용은 준비되는 대로 이 자리에 채워집니다.
export default function HomeSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mt-1 h-8 w-2/3 rounded bg-gray-200 sm:h-9" />

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="h-7 w-20 rounded-full bg-gray-100" />
        <div className="h-7 w-20 rounded-full bg-gray-100" />
        <div className="h-7 w-20 rounded-full bg-gray-100" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl border border-gray-100 bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
