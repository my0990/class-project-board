// 브라우저에서 /api/upload로부터 미리 서명된 URL을 받아
// Cloudflare R2에 파일을 직접 업로드하는 헬퍼입니다.
//
// 실제 휴대폰 환경(약한 신호, 이동 중인 와이파이/데이터 전환 등)에서는
// 아주 짧은 순간의 통신 끊김만으로도 fetch가 "Failed to fetch"를 던지며
// 완전히 실패해버릴 수 있습니다. 이런 일시적인 오류는 서버/설정 문제가
// 아니라 네트워크 자체의 흔들림이므로, 짧은 대기 후 자동으로 재시도합니다.

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = [800, 2000]; // 2번째, 3번째 시도 전 대기 시간

class UploadError extends Error {
  retryable: boolean;
  constructor(message: string, retryable = true) {
    super(message);
    this.retryable = retryable;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(task: () => Promise<T>, friendlyMessage: string): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await task();
    } catch (err) {
      lastErr = err;
      // UploadError가 아니면(네트워크 끊김, 타임아웃 등) 기본적으로 재시도 가능한 오류로 취급합니다.
      const retryable = !(err instanceof UploadError) || err.retryable;
      console.error(
        `${friendlyMessage} - 시도 ${attempt + 1}/${MAX_ATTEMPTS} 실패 (재시도 가능: ${retryable})`,
        err
      );
      if (!retryable || attempt === MAX_ATTEMPTS - 1) break;
      await sleep(RETRY_DELAY_MS[attempt] ?? 2000);
    }
  }

  // 서버가 명확한 이유로 거부한 경우(예: 지원하지 않는 파일 형식)는 그 메시지를 그대로 보여주고,
  // 그 외의(주로 네트워크) 오류는 재시도까지 실패했다는 것을 알기 쉽게 안내합니다.
  if (lastErr instanceof UploadError && !lastErr.retryable) throw lastErr;
  throw new UploadError(`${friendlyMessage} 네트워크가 불안정한 것 같아요. 잠시 후 다시 시도해주세요.`);
}

// 일부 휴대폰 카메라 앱은 File 객체의 type을 비워서 넘기는 경우가 있어,
// 그런 경우 파일 확장자로 최대한 추측해서 채워줍니다.
function guessContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    "3gp": "video/3gpp",
  };
  return map[ext] ?? "application/octet-stream";
}

export async function uploadFileToR2(file: File): Promise<{ url: string }> {
  const contentType = guessContentType(file);

  const { uploadUrl, publicUrl } = await withRetry(async () => {
    const res = await fetchWithTimeout(
      "/api/upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType }),
      },
      15_000
    );

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new UploadError(body?.error ?? "업로드 준비에 실패했습니다.", res.status >= 500);
    }

    return (await res.json()) as { uploadUrl: string; publicUrl: string };
  }, "업로드 준비 중 오류가 발생했습니다.");

  await withRetry(async () => {
    const putRes = await fetchWithTimeout(
      uploadUrl,
      {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      },
      120_000 // 느린 회선에서 큰 동영상을 올릴 때도 끝까지 전송될 시간을 넉넉히 둡니다.
    );

    if (!putRes.ok) {
      throw new UploadError("파일 업로드에 실패했습니다.", putRes.status >= 500);
    }
  }, "파일 업로드에 실패했습니다.");

  return { url: publicUrl };
}
