"use client";

import { useState } from "react";
import { getNeonUsage } from "@/app/admin/actions";
import type { NeonUsage } from "@/lib/neonUsage";

type MeterProps = {
  label: string;
  value: number;
  limit: number;
  unit: string;
  decimals?: number;
};

// 정상/주의/초과는 색상만이 아니라 글자로도 표시합니다 (색만으로 구분하지 않기 위해).
function statusFor(pct: number): { bar: string; text: string; label: string } {
  if (pct >= 100) return { bar: "bg-red-500", text: "text-red-600", label: "한도 초과" };
  if (pct >= 80) return { bar: "bg-amber-500", text: "text-amber-600", label: "주의" };
  return { bar: "bg-green-500", text: "text-green-600", label: "정상" };
}

function UsageMeter({ label, value, limit, unit, decimals = 1 }: MeterProps) {
  const pct = limit > 0 ? Math.round((value / limit) * 100) : 0;
  const barPct = Math.min(100, pct);
  const status = statusFor(pct);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`text-xs font-semibold ${status.text}`}>{status.label}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-gray-200">
        <div className={`h-2 rounded-full ${status.bar}`} style={{ width: `${barPct}%` }} />
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {value.toFixed(decimals)} / {limit.toLocaleString()} {unit} ({pct}%)
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ko-KR");
  } catch {
    return iso;
  }
}

export default function UsageDashboard() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [neon, setNeon] = useState<NeonUsage | null>(null);

  async function handleFetch() {
    if (!password) {
      setError("관리자 비밀번호를 입력해주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await getNeonUsage(password);
      if ("error" in result) {
        setError(result.error);
        setNeon(null);
      } else {
        setNeon(result.data);
      }
    } catch {
      setError("조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <label className="block text-sm font-semibold text-gray-700" htmlFor="usage-password">
          관리자 비밀번호
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="usage-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFetch();
            }}
            placeholder="비밀번호 입력 후 조회"
            className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={busy}
            className="flex-none rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "조회 중..." : "조회"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </section>

      {neon && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">Neon (데이터베이스)</h2>
          {neon.periodStart && neon.periodEnd && (
            <p className="mt-0.5 text-xs text-gray-400">
              이번 결제 주기: {formatDate(neon.periodStart)} ~ {formatDate(neon.periodEnd)}
            </p>
          )}
          <div className="mt-4 space-y-4">
            <UsageMeter label="Compute 사용 시간" value={neon.computeHours} limit={neon.computeHoursLimit} unit="시간" />
            <UsageMeter label="저장 용량" value={neon.storageGb} limit={neon.storageGbLimit} unit="GB" decimals={2} />
            <UsageMeter label="데이터 전송량" value={neon.transferGb} limit={neon.transferGbLimit} unit="GB" decimals={2} />
          </div>
        </section>
      )}

      <p className="text-xs text-gray-400">Vercel · Cloudflare R2 사용량은 다음 단계에서 추가될 예정입니다.</p>
    </div>
  );
}
