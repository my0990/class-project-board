"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type Status =
  | "checking"
  | "unsupported"
  | "idle"
  | "subscribed"
  | "denied"
  | "not-decided"
  | "error"
  | "ios-need-install";

// "다음에"를 누르면 이 기간 동안은 알림 권유 팝업을 다시 띄우지 않습니다.
const DISMISS_KEY = "pushPromptDismissedAt";
const DISMISS_DAYS = 7;

function wasDismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // localStorage를 못 쓰는 환경이면 그냥 이번 화면에서만 숨겨집니다.
  }
}

// 아이폰/아이패드의 사파리(및 사파리 엔진을 쓰는 다른 브라우저들)는 "홈 화면에 추가"로
// 설치한 앱(PWA) 형태로 열었을 때만 웹 푸시 알림을 지원합니다. 그냥 브라우저 탭으로
// 열려 있으면 알림 권한 자체를 요청할 수 없습니다.
function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIphoneOrIpad = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ 는 종종 데스크톱 Mac인 것처럼 UA를 보고하므로 터치 지원 여부로 보완 확인합니다.
  const isIpadOSDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIphoneOrIpad || isIpadOSDesktopMode;
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

// 브라우저별로 "알림 차단 풀기" 메뉴 위치가 달라서, 사용자가 헤매지 않도록
// 브라우저를 구분해서 구체적인 경로를 안내합니다.
function getBrowserSettingsHint(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent || "";
  const isSafari = /safari/i.test(ua) && !/chrome|crios|android/i.test(ua);
  const isEdge = /edg\//i.test(ua);
  const isChrome = /chrome|crios/i.test(ua) && !isEdge;

  if (isSafari) {
    return '왼쪽 위 "Safari" 메뉴 → "설정" → "웹 사이트" 탭 → "알림"에서 이 사이트를 찾아 "허용"으로 바꿔주세요. (아이폰/아이패드는 "설정" 앱 → "Safari" → "웹 사이트 설정"에서 바꿀 수 있어요.)';
  }
  if (isEdge) {
    return '주소창 왼쪽의 자물쇠(🔒) 아이콘을 눌러 "이 사이트에 대한 권한" → "알림"을 "허용"으로 바꿔주세요.';
  }
  if (isChrome) {
    return '주소창 왼쪽의 자물쇠(🔒) 또는 정보 아이콘을 눌러 "권한" → "알림"을 "허용"으로 바꿔주세요.';
  }
  return "브라우저 주소창 근처의 자물쇠(🔒) 또는 사이트 정보 아이콘을 눌러 알림 권한을 허용으로 바꿔주세요.";
}

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // "다음에"를 누르면 7일 동안 팝업을 숨깁니다. 7일이 지나거나 브라우저 저장공간이
  // 지워지면(=쿠키/데이터 삭제) 허용하기 전까지 다시 뜹니다.
  const [popupDismissed, setPopupDismissed] = useState(false);

  useEffect(() => {
    async function check() {
      if (typeof window === "undefined") {
        setStatus("unsupported");
        return;
      }
      if (isIosDevice() && !isStandaloneMode()) {
        setStatus("ios-need-install");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          setStatus("subscribed");
        } else if (typeof Notification !== "undefined" && Notification.permission === "denied") {
          setStatus("denied");
        } else {
          setStatus("idle");
          setPopupDismissed(wasDismissedRecently());
        }
      } catch (err) {
        console.error("서비스 워커 등록 실패:", err);
        setStatus("error");
      }
    }

    check();

    // 브라우저 설정 화면에서 알림 권한을 바꾸고 다시 이 탭으로 돌아왔을 때,
    // 새로고침 없이도 상태(차단/허용 여부)를 다시 확인합니다.
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        check();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", check);
    };
  }, []);

  async function handleUnsubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // 서버에 저장된 구독 정보부터 지워서, 이 기기가 더 이상 알림 대상 목록에 없게 합니다.
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {});
        // 브라우저 쪽 구독도 함께 해제합니다.
        await subscription.unsubscribe();
      }

      setStatus("idle");
    } catch (err) {
      console.error("알림 끄기 실패:", err);
      setErrorMsg(err instanceof Error ? err.message : "알림을 끄는 데 실패했습니다.");
      setStatus("error");
    }
  }

  async function handleSubscribe() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setErrorMsg("알림 기능이 아직 설정되지 않았어요.");
      setStatus("error");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("denied");
        return;
      }
      if (permission !== "granted") {
        // 브라우저 팝업에서 허용/차단 중 아무것도 선택하지 않고 닫은 경우입니다.
        setStatus("not-decided");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "구독 저장에 실패했습니다.");
      }

      setStatus("subscribed");
    } catch (err) {
      console.error("알림 구독 실패:", err);
      setErrorMsg(err instanceof Error ? err.message : "알림 구독에 실패했습니다.");
      setStatus("error");
    }
  }

  if (status === "checking" || status === "unsupported") return null;

  if (status === "ios-need-install") {
    return (
      <p className="text-xs text-gray-500">
        📱 iPhone/iPad에서 새 글 알림을 받으려면: Safari 하단(또는 상단)의 공유 버튼(⬆️)을 누른 뒤
        “홈 화면에 추가”를 선택해 앱처럼 설치하고, 홈 화면에 생긴 아이콘으로 다시 열어주세요.
      </p>
    );
  }

  if (status === "subscribed") {
    return (
      <div className="flex items-center gap-2">
        <p className="text-xs text-gray-400">🔔 새 글 알림이 켜져 있어요.</p>
        <button
          type="button"
          onClick={handleUnsubscribe}
          className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          🔕 알림 끄기
        </button>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <p className="max-w-xs text-xs text-gray-400">
        🔕 알림이 차단되어 있어요. {getBrowserSettingsHint()}
      </p>
    );
  }

  if (status === "not-decided") {
    return (
      <p className="max-w-xs text-xs text-gray-400">
        아직 알림 허용 여부를 선택하지 않으셨어요. 아래 버튼을 다시 누르면 브라우저가 다시 물어보는데, 그때{" "}
        <strong className="text-gray-600">“허용”</strong>을 눌러주세요.{" "}
        <button type="button" onClick={handleSubscribe} className="font-medium text-blue-600 underline">
          다시 시도
        </button>
      </p>
    );
  }

  // 아직 알림을 허용도, 차단도 하지 않은 상태(idle)입니다. 놓치기 쉬운 작은
  // 버튼 대신, 방문할 때마다 화면 가운데에 큰 팝업으로 알림 허용을 권합니다.
  // "다음에"를 누르면 7일간 다시 뜨지 않고, 실제로 허용하면 더는 뜨지 않습니다.
  if (popupDismissed) {
    return (
      <button
        type="button"
        onClick={handleSubscribe}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        🔔 새 글 알림 받기
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <p className="text-base font-semibold text-gray-900">🔔 새 글 알림을 받아보시겠어요?</p>
        <p className="mt-1.5 text-sm text-gray-500">
          우리 반 프로젝트에 새 글이 올라올 때마다 바로 알려드려요.
        </p>
        <p className="mt-2 text-xs text-blue-600">
          ℹ️ &quot;알림 받기&quot;를 누르면 브라우저가 별도로 알림 허용 여부를 물어봐요. 그때 꼭{" "}
          <strong>“허용”</strong>을 눌러주셔야 알림이 켜집니다.
        </p>
        {errorMsg && <p className="mt-2 text-xs text-red-500">{errorMsg}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              rememberDismissed();
              setPopupDismissed(true);
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            다음에
          </button>
          <button
            type="button"
            onClick={handleSubscribe}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            🔔 알림 받기
          </button>
        </div>
      </div>
    </div>
  );
}
