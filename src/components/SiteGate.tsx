"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { loginWithClassCode } from "@/app/actions";

const STORAGE_KEY = "class-login";

type StoredAuth = { slug: string; name: string; password: string };
type AuthValue = StoredAuth & { logout: () => void };

const SiteAuthContext = createContext<AuthValue | null>(null);

export function useSiteAuth(): AuthValue {
  const ctx = useContext(SiteAuthContext);
  if (!ctx) {
    throw new Error("useSiteAuth는 SiteGate 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}

export default function SiteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAuth(JSON.parse(raw));
    } catch {
      // localStorage를 사용할 수 없는 환경이면 매번 다시 로그인합니다.
    }
    setReady(true);
  }, []);

  function logout() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 무시
    }
    setAuth(null);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!code) {
      setError("반 코드를 입력해주세요.");
      return;
    }

    setChecking(true);
    try {
      const result = await loginWithClassCode(code);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const next: StoredAuth = { slug: result.slug, name: result.name, password: code };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 저장에 실패해도 이번 화면에서는 로그인 상태를 유지합니다.
      }
      setAuth(next);
      setCode("");
    } catch {
      setError("확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setChecking(false);
    }
  }

  // 관리자 페이지는 별도의 관리자 비밀번호로 보호되므로 반 코드 로그인과 무관하게 통과시킵니다.
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  // localStorage 확인 전에는 아무 것도 보여주지 않아 화면 깜빡임을 줄입니다.
  if (!ready) {
    return <div className="min-h-screen" />;
  }

  if (!auth) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <h1 className="text-xl font-bold">반 코드 로그인</h1>
        <p className="mt-1 text-sm text-gray-500">
          우리 반 코드를 입력하면 프로젝트 진행 현황을 보고 새 소식을 등록할 수 있어요. 한 번 로그인하면 이
          브라우저에 저장되어 다음에는 다시 입력하지 않아도 됩니다.
        </p>
        <form onSubmit={handleLogin} className="mt-5 space-y-2.5">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="반 코드"
            autoFocus
            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={checking}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {checking ? "확인 중..." : "입장하기"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </main>
    );
  }

  return (
    <SiteAuthContext.Provider value={{ ...auth, logout }}>
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 text-xs text-gray-500">
        <span>{auth.name} 로그인됨</span>
        <button type="button" onClick={logout} className="hover:text-gray-700 hover:underline">
          로그아웃
        </button>
      </div>
      {children}
    </SiteAuthContext.Provider>
  );
}
