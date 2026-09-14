// 학급 상세 페이지 데이터가 로딩되는 동안 대신 보여주는 뼈대 화면입니다.
export default function ClassPageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mt-3 h-4 w-40 rounded bg-gray-100" />
      <div className="mt-2 h-8 w-1/2 rounded bg-gray-200 sm:h-9" />
      <div className="mt-2 h-4 w-24 rounded bg-gray-100" />

      <div className="mt-8 flex flex-wrap gap-2">
        <div className="h-9 w-24 rounded-full bg-gray-100" />
        <div className="h-9 w-24 rounded-full bg-gray-100" />
        <div className="h-9 w-24 rounded-full bg-gray-100" />
      </div>

      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-gray-100 bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
