type Attachment = {
  id: string;
  url: string;
  type: string; // "image" | "video"
};

type Props = {
  post: {
    id: string;
    content: string;
    attachments: Attachment[];
    createdAt: Date | string;
  };
};

export default function PostCard({ post }: Props) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {post.attachments.length > 0 && (
        <div className={`mb-3 grid gap-2 ${post.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {post.attachments.map((a) =>
            a.type === "video" ? (
              <video
                key={a.id}
                src={a.url}
                controls
                className="max-h-72 w-full rounded-lg border border-gray-100 bg-black"
              />
            ) : (
              // 다양한 이미지 호스트를 별도 설정 없이 지원하기 위해 next/image 대신 img 태그를 사용합니다.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={a.id}
                src={a.url}
                alt=""
                className="max-h-72 w-full rounded-lg border border-gray-100 object-cover"
              />
            )
          )}
        </div>
      )}
      {post.content && <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{post.content}</p>}
      <p className="mt-3 text-xs text-gray-400">{formatDateTime(post.createdAt)}</p>
    </article>
  );
}

function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
