// 브라우저에서 /api/upload로부터 미리 서명된 URL을 받아
// Cloudflare R2에 파일을 직접 업로드하는 헬퍼입니다.
export async function uploadFileToR2(file: File): Promise<{ url: string }> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "업로드 URL 발급에 실패했습니다.");
  }

  const { uploadUrl, publicUrl } = (await res.json()) as { uploadUrl: string; publicUrl: string };

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error("파일 업로드에 실패했습니다.");
  }

  return { url: publicUrl };
}
