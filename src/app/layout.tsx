import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteGate from "@/components/SiteGate";
import InAppBrowserNotice from "@/components/InAppBrowserNotice";

export const metadata: Metadata = {
  title: "프로젝트 수업 진행 현황",
  description: "학급별 프로젝트 수업 진행 상황 공유 게시판",
  manifest: "/manifest.json",
  // 아이콘을 바꿀 때마다 주소 끝의 ?v= 숫자를 올려주세요. 그래야 브라우저가 예전에
  // 캐시해둔 아이콘을 계속 쓰지 않고 새 아이콘을 다시 받아옵니다.
  icons: {
    icon: [
      { url: "/icons/icon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png?v=2",
  },
  appleWebApp: {
    // 아이폰 Safari에서 "홈 화면에 추가"로 실행했을 때 앱처럼(주소창 없이) 보이게 합니다.
    capable: true,
    statusBarStyle: "default",
    // 홈 화면 아이콘 아래 표시되는 이름
    title: "IB STUDIO",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffc24b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <InAppBrowserNotice />
        <SiteGate>{children}</SiteGate>
      </body>
    </html>
  );
}
