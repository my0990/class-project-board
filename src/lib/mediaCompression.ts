// 브라우저에서 사진/동영상을 업로드 전에 가볍게 압축하는 유틸리티입니다.
// - 이미지: <canvas>로 리사이즈 + JPEG 재인코딩 (표준 브라우저 API만 사용, 가볍고 안전)
// - 동영상: ffmpeg.wasm으로 해상도/비트레이트를 낮춰 재인코딩 (첫 사용 시 ffmpeg 엔진을 CDN에서 내려받음)

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const FFMPEG_CORE_VERSION = "0.12.6";
const FFMPEG_CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}

const SKIP_VIDEO_COMPRESSION_UNDER_BYTES = 15 * 1024 * 1024; // 15MB 이하는 압축하지 않음
const SKIP_IMAGE_COMPRESSION_UNDER_BYTES = 1.5 * 1024 * 1024; // 1.5MB 이하는 압축하지 않음

export async function compressVideo(file: File, onProgress?: (ratio: number) => void): Promise<File> {
  if (file.size <= SKIP_VIDEO_COMPRESSION_UNDER_BYTES) {
    return file;
  }

  try {
    const ffmpeg = await getFFmpeg();

    const handleProgress = ({ progress }: { progress: number }) => {
      onProgress?.(Math.min(1, Math.max(0, progress)));
    };
    ffmpeg.on("progress", handleProgress);

    const inputExt = file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? ".mp4";
    const inputName = `input${inputExt}`;
    const outputName = "output.mp4";

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    await ffmpeg.exec([
      "-i",
      inputName,
      "-vf",
      // 원본보다 커지지 않게, 가로/세로 중 긴 쪽을 최대 1280px로 축소 (짝수 크기 보장)
      "scale=w=1280:h=1280:force_original_aspect_ratio=decrease:force_divisible_by=2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    ffmpeg.off("progress", handleProgress);

    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    const compressedBlob = new Blob([data], { type: "video/mp4" });

    // 압축 결과가 오히려 더 크면(이미 고효율로 인코딩된 영상 등) 원본을 그대로 사용합니다.
    if (compressedBlob.size === 0 || compressedBlob.size >= file.size) {
      return file;
    }

    return new File([compressedBlob], file.name.replace(/\.[^.]+$/, "") + ".mp4", {
      type: "video/mp4",
    });
  } catch (err) {
    // 압축에 실패해도 업로드 자체는 계속 진행할 수 있도록 원본 파일을 반환합니다.
    console.error("동영상 압축 실패, 원본으로 업로드합니다.", err);
    return file;
  }
}

export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<File> {
  if (file.size <= SKIP_IMAGE_COMPRESSION_UNDER_BYTES) {
    return file;
  }

  try {
    const imageBitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(imageBitmap.width, imageBitmap.height));
    const width = Math.max(1, Math.round(imageBitmap.width * scale));
    const height = Math.max(1, Math.round(imageBitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(imageBitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch (err) {
    console.error("이미지 압축 실패, 원본으로 업로드합니다.", err);
    return file;
  }
}
