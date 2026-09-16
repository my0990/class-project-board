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

type Status = "checking" | "unsupported" | "idle" | "subscribed" | "denied" | "error";

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
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
        applicationServerKey: urlBase64ToUint8Array(publicKey),
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
