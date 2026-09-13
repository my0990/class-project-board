import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteGate from "@/components/SiteGate";

export const metadata: Metadata = {
  title: "프로젝트 수업 진행 현황",
  description: "학급별 프로젝트 수업 진행 상황 공유 게시판",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <SiteGate>{children}</SiteGate>
      </body>
    </html>
  );
}
