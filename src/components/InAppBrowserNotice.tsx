"use client";

import { useEffect, useState } from "react";

// 카카오톡, 인스타그램, 네이버 앱 등에서 링크를 누르면 그 앱 안의 "인앱 브라우저(웹뷰)"로
// 열리는데, 이런 웹뷰는 일부 웹 기능을 제대로 지원하지 못하는 경우가 있어
// 다른 브라우저로 열도록 안내합니다.
function detectInAppBrowser(ua: string): string | null {
  const lower = ua.toLowerCase();
  if (lower.includes("kakaotalk")) return "카카오톡";
  if (lower.includes("instagram")) return "인스타그램";
  if (lower.includes("fban") || lower.includes("fbav")) return "페이스북";
  if (lower.includes("naver(")) return "네이버 앱";
  if (lower.includes("everytimeapp")) return "에브리타임";
  return null;
}

export default function InAppBrowserNotice() {
  const [appName, setAppName] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setAppName(detectInAppBrowser(navigator.userAgent));
  }, []);

  if (!appName || dismissed) return null;

  return (
    <div className="sticky top-0 z-50 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
      <div className="mx-auto flex max-w-3xl items-start gap-2">
        <span className="mt-0.5">⚠️</span>
        <div className="flex-1">
          <p className="font-medium">{appName} 브라우저에서는 사진/동영상 업로드가 되지 않을 수 있어요.</p>
          <p className="mt-1 text-amber-800">
            화면 오른쪽 아래(또는 메뉴 버튼)에서 <b>&quot;다른 브라우저로 열기&quot;</b>를 눌러 크롬이나 삼성 인터넷 같은
            일반 브라우저로 열어주세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-1 text-amber-700 hover:bg-amber-100"
          aria-label="닫기"
        >
          ×
        </button>
      </div>
    </div>
  );
}
