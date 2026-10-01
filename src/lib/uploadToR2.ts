// 브라우저에서 /api/upload로부터 미리 서명된 URL을 받아
// Cloudflare R2에 파일을 직접 업로드하는 헬퍼입니다.
//
// 실제 휴대폰 환경(약한 신호, 이동 중인 와이파이/데이터 전환 등)에서는
// 아주 짧은 순간의 통신 끊김만으로도 fetch가 "Failed to fetch"를 던지며
// 완전히 실패해버릴 수 있습니다. 이런 일시적인 오류는 서버/설정 문제가
// 아니라 네트워크 자체의 흔들림이므로, 짧은 대기 후 자동으로 재시도합니다.
//
// 또한 일부 학교/기관 와이파이는 방화벽/콘텐츠 필터가 낯선 클라우드 저장소
// 도메인(R2)로 가는 연결을 거부 응답 없이 그냥 묵묵히 막아버리는 경우가 있어,
// 연결이 "느린 것"이 아니라 "완전히 멈춘 것"처럼 아무 반응 없이 계속 대기하게
// 됩니다. 이를 구분하기 위해 업로드 진행률(progress)을 직접 감시하다가, 일정
// 시간 동안 1바이트도 더 전송되지 않으면(=멈춘 것으로 판단) 그 즉시 실패
// 처리하고, 실제로 느리지만 꾸준히 전송 중이면(progress가 계속 움직이면)
// 끝까지 기다립니다.

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = [800, 2000]; // 2번째, 3번째 시도 전 대기 시간

// 업로드 진행률이 이 시간(ms) 동안 전혀 움직이지 않으면 "연결이 막혔다"고
// 판단해서 바로 실패 처리합니다 (학교 와이파이의 방화벽 차단 등).
const UPLOAD_STALL_TIMEOUT_MS = 20_000;
// 느리지만 꾸준히 전송 중이어도, 한 번의 시도가 이 시간(ms)을 넘기면
// 안전장치로 중단합니다.
const UPLOAD_MAX_DURATION_MS = 5 * 60_000;

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

// 브라우저가 실제로 던진 원본 에러(이름/메시지)를 최대한 짧게 문자열로 남깁니다.
// 화면에 그대로 노출해서, "네트워크 불안정"이라는 뭉뚱그린 설명 뒤에 숨겨진
// 진짜 원인(TypeError, AbortError, CORS 관련 문구 등)을 확인할 수 있게 합니다.
function describeRawError(err: unknown): string {
  if (err instanceof DOMException) return `${err.name}: ${err.message}`;
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
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

// fetch는 업로드 진행 상황(progress)을 알려주지 않아서 "멈춘 것"과 "느린 것"을
// 구분할 수 없습니다. XMLHttpRequest는 progress 이벤트를 주기 때문에, 진행률이
// 움직이는 동안은 계속 기다리고, 일정 시간 전혀 움직이지 않으면(=연결이
// 막힌 것으로 추정) 바로 실패 처리할 수 있습니다.
function putWithProgress(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress?: (ratio: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let stallTimer: ReturnType<typeof setTimeout>;
    const maxTimer = setTimeout(() => finish(() => {
      throw new UploadError("업로드가 너무 오래 걸려서 중단했어요. 네트워크 상태를 확인하고 다시 시도해주세요.");
    }), UPLOAD_MAX_DURATION_MS);

    function cleanup() {
      clearTimeout(stallTimer);
      clearTimeout(maxTimer);
    }

    function finish(buildError: () => never) {
      if (settled) return;
      settled = true;
      cleanup();
      xhr.abort();
      try {
        buildError();
      } catch (err) {
        reject(err);
      }
    }

    function resetStallTimer() {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        finish(() => {
          throw new UploadError(
            "업로드 연결이 멈춰 있어요. 학교/기관 와이파이가 파일 저장소 접속을 막고 있을 수 있어요 — 데이터(LTE/5G)로 전환해서 다시 시도해보세요."
          );
        });
      }, UPLOAD_STALL_TIMEOUT_MS);
    }

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onloadstart = resetStallTimer;
    xhr.upload.onprogress = (e) => {
      resetStallTimer();
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        const bodyText = xhr.responseText || "";
        reject(
          new UploadError(
            `파일 업로드에 실패했습니다. (HTTP ${xhr.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ""})`,
            xhr.status >= 500
          )
        );
      }
    };
    xhr.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new UploadError(`네트워크 오류로 업로드에 실패했습니다. (${describeRawError(new Error("XHR error"))})`));
    };

    resetStallTimer(); // 전송 시작(onloadstart) 전, 연결 자체가 막히는 경우까지 대비한 초기 타이머입니다.
    xhr.send(blob);
  });
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
  // 그 외의 오류는 원본 메시지(연결 멈춤/타임아웃 등 구체적인 안내가 이미 담겨 있음)를 그대로 보여줍니다.
  if (lastErr instanceof UploadError) throw lastErr;
  throw new UploadError(
    `${friendlyMessage} 네트워크가 불안정한 것 같아요. 잠시 후 다시 시도해주세요. (${describeRawError(lastErr)})`
  );
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

export async function uploadFileToR2(file: File, onProgress?: (ratio: number) => void): Promise<{ url: string }> {
  const contentType = guessContentType(file);

  // 크롬(특히 안드로이드)에서는 File 객체를 그대로 fetch의 body로 넘기면, 실제 전송
  // 시점에 "선택했을 때와 파일이 달라진 것 같다"고 판단해 net::ERR_UPLOAD_FILE_CHANGED로
  // 업로드 자체를 거부하는 경우가 있습니다 (안드로이드의 content:// 임시 파일 접근 특성 때문).
  // 이를 피하기 위해 지금 이 시점에 파일 내용을 메모리에 완전히 읽어들여서, 원본 파일
  // 경로와는 무관한 순수 데이터 덩어리(Blob)로 만들어 전송합니다.
  const fileBytes = await file.arrayBuffer();
  const uploadBlob = new Blob([fileBytes], { type: contentType });

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
    onProgress?.(0);
    await putWithProgress(uploadUrl, uploadBlob, contentType, onProgress);
    onProgress?.(1);
  }, "파일 업로드에 실패했습니다.");

  return { url: publicUrl };
}
