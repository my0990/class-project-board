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

type Status = "checking" | "unsupported" | "idle" | "subscribed" | "denied" | "error" | "ios-need-install";

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

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // "다음에"를 누르면 이번에 화면을 보는 동안만 팝업을 숨깁니다. 새로고침하거나
  // 나중에 다시 방문하면(=컴포넌트가 새로 마운트되면) 허용하기 전까지 다시 뜹니다.
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
      if (permission !== "granted") {
        setStatus("denied");
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
    return <p className="text-xs text-gray-400">🔔 새 글 알림이 켜져 있어요.</p>;
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-gray-400">
        알림이 차단되어 있어요. 브라우저 사이트 설정에서 알림 권한을 허용해주세요.
      </p>
    );
  }

  // 아직 알림을 허용도, 차단도 하지 않은 상태(idle)입니다. 놓치기 쉬운 작은
  // 버튼 대신, 방문할 때마다 화면 가운데에 큰 팝업으로 알림 허용을 권합니다.
  // "다음에"를 눌러도 다음 방문 때 다시 뜨고, 실제로 허용하면 더는 뜨지 않습니다.
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
        {errorMsg && <p className="mt-2 text-xs text-red-500">{errorMsg}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setPopupDismissed(true)}
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
