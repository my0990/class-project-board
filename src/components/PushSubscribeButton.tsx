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

  return (
    <div>
      <button
        type="button"
        onClick={handleSubscribe}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        🔔 새 글 알림 받기
      </button>
      {errorMsg && <p className="mt-1 text-xs text-red-500">{errorMsg}</p>}
    </div>
  );
}
