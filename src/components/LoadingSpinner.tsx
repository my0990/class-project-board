export default function LoadingSpinner({ label = "불러오는 중..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
