"use client";

import { useState } from "react";
import { getNeonUsage, getVercelUsage, getVercelSpendSnapshot } from "@/app/admin/actions";
import type { VercelSpendSnapshot } from "@/app/admin/actions";
import type { NeonUsage } from "@/lib/neonUsage";
import type { VercelUsage } from "@/lib/vercelUsage";

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

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
}

export default function UsageDashboard() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [neon, setNeon] = useState<NeonUsage | null>(null);
  const [neonError, setNeonError] = useState<string | null>(null);

  const [vercel, setVercel] = useState<VercelUsage | null>(null);
  const [vercelError, setVercelError] = useState<string | null>(null);
  const [vercelUnavailable, setVercelUnavailable] = useState<string | null>(null);

  const [vercelSnapshot, setVercelSnapshot] = useState<VercelSpendSnapshot | null>(null);
  const [vercelSnapshotError, setVercelSnapshotError] = useState<string | null>(null);
  const [vercelSnapshotChecked, setVercelSnapshotChecked] = useState(false);

  async function handleFetch() {
    if (!password) {
      setFormError("관리자 비밀번호를 입력해주세요.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const [neonResult, vercelResult, vercelSnapshotResult] = await Promise.all([
        getNeonUsage(password),
        getVercelUsage(password),
        getVercelSpendSnapshot(password),
      ]);

      if ("error" in neonResult) {
        setNeonError(neonResult.error);
        setNeon(null);
      } else {
        setNeonError(null);
        setNeon(neonResult.data);
      }

      if ("unavailable" in vercelResult) {
        setVercelUnavailable(vercelResult.unavailable);
        setVercelError(null);
        setVercel(null);
      } else if ("error" in vercelResult) {
        setVercelError(vercelResult.error);
        setVercelUnavailable(null);
        setVercel(null);
      } else {
        setVercelError(null);
        setVercelUnavailable(null);
        setVercel(vercelResult.data);
      }

      setVercelSnapshotChecked(true);
      if ("error" in vercelSnapshotResult) {
        setVercelSnapshotError(vercelSnapshotResult.error);
        setVercelSnapshot(null);
      } else {
        setVercelSnapshotError(null);
        setVercelSnapshot(vercelSnapshotResult.data);
      }
    } catch {
      setFormError("조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
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
        {formError && <p className="mt-2 text-sm text-red-500">{formError}</p>}
      </section>

      {(neon || neonError) && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">Neon (데이터베이스)</h2>
          {neonError && <p className="mt-2 text-sm text-red-500">{neonError}</p>}
          {neon && (
            <>
              {neon.periodStart && neon.periodEnd && (
                <p className="mt-0.5 text-xs text-gray-400">
                  이번 결제 주기: {formatDate(neon.periodStart)} ~ {formatDate(neon.periodEnd)}
                </p>
              )}
              <div className="mt-4 space-y-4">
                <UsageMeter
                  label="Compute 사용 시간"
                  value={neon.computeHours}
                  limit={neon.computeHoursLimit}
                  unit="시간"
                />
                <UsageMeter label="저장 용량" value={neon.storageGb} limit={neon.storageGbLimit} unit="GB" decimals={2} />
                <UsageMeter
                  label="데이터 전송량"
                  value={neon.transferGb}
                  limit={neon.transferGbLimit}
                  unit="GB"
                  decimals={2}
                />
              </div>
            </>
          )}
        </section>
      )}

      {(vercel || vercelError || vercelUnavailable || vercelSnapshotChecked) && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">Vercel (호스팅)</h2>

          {vercelSnapshotError && <p className="mt-2 text-sm text-red-500">{vercelSnapshotError}</p>}

          {vercelSnapshotChecked && vercelSnapshot && (
            <div className="mt-3">
              <UsageMeter
                label="이번 결제 주기 지출액"
                value={vercelSnapshot.currentUsd}
                limit={vercelSnapshot.budgetUsd}
                unit="USD"
                decimals={0}
              />
              <p className="mt-2 text-xs text-gray-400">
                마지막 업데이트: {formatDateTime(vercelSnapshot.updatedAt)} (예산의 {vercelSnapshot.thresholdPercent}%
                도달 시점 기준)
              </p>
              <p className="mt-1 text-xs text-gray-400">
                이 수치는 실시간이 아니라, Vercel이 예산의 50%/75%/100%에 새로 도달할 때마다 알려주는 값이에요.
              </p>
            </div>
          )}

          {vercelSnapshotChecked && !vercelSnapshot && !vercelSnapshotError && (
            <p className="mt-2 text-sm text-gray-500">
              아직 Vercel로부터 받은 사용량 정보가 없습니다. Vercel 대시보드에서 Spend Management(지출 관리) 기능을
              켜고 예산과 웹훅 주소를 설정하면, 예산의 50%/75%/100%에 도달할 때 이 화면에 자동으로 표시됩니다.
            </p>
          )}

          {vercelError && <p className="mt-3 text-sm text-red-500">{vercelError}</p>}
          {vercelUnavailable && (
            <p className="mt-3 text-sm text-gray-400">
              {vercelUnavailable}{" "}
              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                Vercel 대시보드 열기 →
              </a>
            </p>
          )}
          {vercel && (
            <>
              <p className="mt-3 text-xs text-gray-400">
                이번 달: {formatDate(vercel.periodStart)} ~ {formatDate(vercel.periodEnd)} · 예상 청구 금액 $
                {vercel.estimatedCostUsd.toFixed(2)}
              </p>
              {vercel.items.length === 0 ? (
                <p className="mt-3 text-xs text-gray-400">이번 달 사용 내역이 아직 없습니다.</p>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100 text-sm">
                  {vercel.items.map((item) => (
                    <li key={`${item.serviceName}-${item.unit}`} className="flex items-center justify-between py-1.5">
                      <span className="text-gray-600">{item.serviceName}</span>
                      <span className="font-medium text-gray-800">
                        {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      <p className="text-xs text-gray-400">Cloudflare R2 사용량은 다음 단계에서 추가될 예정입니다.</p>
    </div>
  );
}
