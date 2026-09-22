"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createLoi,
  createStage,
  createUoi,
  deleteLoi,
  deleteStage,
  deleteUoi,
  moveLoi,
  moveStage,
  moveUoi,
  renameLoi,
  renameStage,
  renameUoi,
  setDeployNotifyEnabled,
  updateProjectTitle,
} from "@/app/admin/actions";

type Stage = { id: string; name: string; order: number };
type Loi = { id: string; name: string; order: number; stages: Stage[] };
type Uoi = { id: string; name: string; order: number; lois: Loi[] };

type ActionResult = { success: true } | { error: string };

export default function AdminPanel({
  initialTitle,
  initialUois,
  initialDeployNotifyEnabled,
}: {
  initialTitle: string;
  initialUois: Uoi[];
  initialDeployNotifyEnabled: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState(initialTitle);
  const [deployNotifyEnabled, setDeployNotifyEnabledState] = useState(initialDeployNotifyEnabled);

  const [uoiRenaming, setUoiRenaming] = useState<Record<string, string>>({});
  const [loiRenaming, setLoiRenaming] = useState<Record<string, string>>({});
  const [stageRenaming, setStageRenaming] = useState<Record<string, string>>({});

  const [newUoiName, setNewUoiName] = useState("");
  const [newLoiName, setNewLoiName] = useState<Record<string, string>>({});
  const [newStageName, setNewStageName] = useState<Record<string, string>>({});

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function needPassword(): boolean {
    if (!password) {
      setMessage({ type: "error", text: "먼저 관리자 비밀번호를 입력해주세요." });
      return true;
    }
    return false;
  }

  async function run(action: () => Promise<ActionResult>, after?: () => void) {
    setMessage(null);
    setBusy(true);
    try {
      const result = await action();
      if ("error" in result) {
        setMessage({ type: "error", text: result.error });
      } else {
        after?.();
        router.refresh();
      }
    } catch {
      setMessage({ type: "error", text: "처리 중 오류가 발생했습니다." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <label className="block text-sm font-semibold text-gray-700" htmlFor="admin-password">
          관리자 비밀번호
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="아래 작업을 하려면 비밀번호를 입력하세요"
          className="mt-2 w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-2 text-xs text-gray-400">
          한 번 입력해두면 이 화면에 있는 동안 아래 작업에 계속 사용됩니다. (새로고침하면 다시 입력해야 해요.)
        </p>
      </section>

      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-red-500" : "text-green-600"}`}>{message.text}</p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold">프로젝트 제목</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-[14rem] flex-1 rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (needPassword()) return;
              run(() => updateProjectTitle(password, title));
            }}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold">배포 업데이트 알림</h2>
        <p className="mt-1 text-xs text-gray-400">
          켜두면 다음 배포(git push 후 자동 배포) 딱 한 번, &quot;알림 받기&quot;를 눌러둔 모든 사람에게 이번
          커밋 메시지가 업데이트 알림으로 나갑니다. 알림이 나가면 자동으로 다시 꺼지므로, 정말 알리고 싶은
          업데이트가 있을 때만 배포 전에 켜주세요.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={deployNotifyEnabled}
            disabled={busy}
            onClick={() => {
              if (needPassword()) return;
              const next = !deployNotifyEnabled;
              run(
                () => setDeployNotifyEnabled(password, next),
                () => setDeployNotifyEnabledState(next)
              );
            }}
            className={`relative h-6 w-11 flex-none rounded-full transition disabled:opacity-50 ${
              deployNotifyEnabled ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                deployNotifyEnabled ? "left-5" : "left-0.5"
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${deployNotifyEnabled ? "text-blue-600" : "text-gray-500"}`}>
            {deployNotifyEnabled ? "다음 배포에서 알림 나감" : "꺼짐"}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold">탐구 단원(UOI) · 탐구 주제(LOI) · 수업 단계</h2>
        <p className="mt-1 text-xs text-gray-400">
          전체 학급이 공통으로 사용하는 구조입니다. UOI 안에 여러 LOI, LOI 안에 여러 단계를 둘 수 있어요.
        </p>

        <div className="mt-4 space-y-5">
          {initialUois.map((uoi, ui) => (
            <div key={uoi.id} className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
              {/* UOI 헤더 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {ui + 1}
                </span>
                <input
                  value={uoiRenaming[uoi.id] ?? uoi.name}
                  onChange={(e) => setUoiRenaming((r) => ({ ...r, [uoi.id]: e.target.value }))}
                  className="min-w-[6rem] flex-1 rounded-lg border border-gray-300 bg-white p-2 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                />
                <div className="flex flex-none flex-wrap gap-1.5">
                  <button
                    type="button"
                    title="위로 이동"
                    disabled={busy || ui === 0}
                    onClick={() => {
                      if (needPassword()) return;
                      run(() => moveUoi(password, uoi.id, "up"));
                    }}
                    className="flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-sm disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="아래로 이동"
                    disabled={busy || ui === initialUois.length - 1}
                    onClick={() => {
                      if (needPassword()) return;
                      run(() => moveUoi(password, uoi.id, "down"));
                    }}
                    className="flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-sm disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (needPassword()) return;
                      run(() => renameUoi(password, uoi.id, uoiRenaming[uoi.id] ?? uoi.name));
                    }}
                    className="flex h-8 items-center justify-center rounded-md border border-gray-200 bg-white px-2.5 text-xs hover:border-blue-400"
                  >
                    이름 저장
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (needPassword()) return;
                      if (!confirm(`"${uoi.name}" 단원을 삭제할까요? 안의 모든 LOI·단계·게시글도 함께 삭제됩니다.`)) return;
                      run(() => deleteUoi(password, uoi.id));
                    }}
                    className="flex h-8 items-center justify-center rounded-md border border-red-200 bg-white px-2.5 text-xs text-red-500 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {/* LOI 목록 */}
              <div className="mt-3 space-y-3 border-l-2 border-blue-200 pl-3 sm:pl-4">
                {uoi.lois.map((loi, li) => (
                  <div key={loi.id} className="rounded-lg border border-gray-200 bg-white p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">
                        {li + 1}
                      </span>
                      <input
                        value={loiRenaming[loi.id] ?? loi.name}
                        onChange={(e) => setLoiRenaming((r) => ({ ...r, [loi.id]: e.target.value }))}
                        className="min-w-[6rem] flex-1 rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <div className="flex flex-none flex-wrap gap-1.5">
                        <button
                          type="button"
                          title="위로 이동"
                          disabled={busy || li === 0}
                          onClick={() => {
                            if (needPassword()) return;
                            run(() => moveLoi(password, loi.id, "up"));
                          }}
                          className="flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-gray-200 px-2 text-sm disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          title="아래로 이동"
                          disabled={busy || li === uoi.lois.length - 1}
                          onClick={() => {
                            if (needPassword()) return;
                            run(() => moveLoi(password, loi.id, "down"));
                          }}
                          className="flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-gray-200 px-2 text-sm disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (needPassword()) return;
                            run(() => renameLoi(password, loi.id, loiRenaming[loi.id] ?? loi.name));
                          }}
                          className="flex h-8 items-center justify-center rounded-md border border-gray-200 px-2.5 text-xs hover:border-blue-400"
                        >
                          이름 저장
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (needPassword()) return;
                            if (!confirm(`"${loi.name}" 주제를 삭제할까요? 안의 모든 단계·게시글도 함께 삭제됩니다.`)) return;
                            run(() => deleteLoi(password, loi.id));
                          }}
                          className="flex h-8 items-center justify-center rounded-md border border-red-200 px-2.5 text-xs text-red-500 hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    {/* Stage 목록 */}
                    <ul className="mt-2 space-y-1.5 border-l-2 border-gray-100 pl-3 sm:pl-4">
                      {loi.stages.map((stage, si) => (
                        <li
                          key={stage.id}
                          className="flex flex-wrap items-center gap-2 rounded-md border border-gray-100 p-2"
                        >
                          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                            {si + 1}
                          </span>
                          <input
                            value={stageRenaming[stage.id] ?? stage.name}
                            onChange={(e) => setStageRenaming((r) => ({ ...r, [stage.id]: e.target.value }))}
                            className="min-w-[6rem] flex-1 rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <div className="flex flex-none flex-wrap gap-1.5">
                            <button
                              type="button"
                              title="위로 이동"
                              disabled={busy || si === 0}
                              onClick={() => {
                                if (needPassword()) return;
                                run(() => moveStage(password, stage.id, "up"));
                              }}
                              className="flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-gray-200 px-2 text-sm disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              title="아래로 이동"
                              disabled={busy || si === loi.stages.length - 1}
                              onClick={() => {
                                if (needPassword()) return;
                                run(() => moveStage(password, stage.id, "down"));
                              }}
                              className="flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-gray-200 px-2 text-sm disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                if (needPassword()) return;
                                run(() => renameStage(password, stage.id, stageRenaming[stage.id] ?? stage.name));
                              }}
                              className="flex h-8 items-center justify-center rounded-md border border-gray-200 px-2.5 text-xs hover:border-blue-400"
                            >
                              이름 저장
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                if (needPassword()) return;
                                if (!confirm(`"${stage.name}" 단계를 삭제할까요? 이 단계에 등록된 게시글도 함께 삭제됩니다.`)) return;
                                run(() => deleteStage(password, stage.id));
                              }}
                              className="flex h-8 items-center justify-center rounded-md border border-red-200 px-2.5 text-xs text-red-500 hover:bg-red-50"
                            >
                              삭제
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-2 flex flex-wrap gap-2 border-t border-dashed border-gray-200 pt-2">
                      <input
                        value={newStageName[loi.id] ?? ""}
                        onChange={(e) => setNewStageName((r) => ({ ...r, [loi.id]: e.target.value }))}
                        placeholder="새 단계 이름 (예: 조직하기)"
                        className="min-w-[8rem] flex-1 rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (needPassword()) return;
                          const name = newStageName[loi.id] ?? "";
                          if (!name.trim()) {
                            setMessage({ type: "error", text: "단계 이름을 입력해주세요." });
                            return;
                          }
                          run(() => createStage(password, loi.id, name), () =>
                            setNewStageName((r) => ({ ...r, [loi.id]: "" }))
                          );
                        }}
                        className="rounded-lg bg-gray-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      >
                        단계 추가
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  <input
                    value={newLoiName[uoi.id] ?? ""}
                    onChange={(e) => setNewLoiName((r) => ({ ...r, [uoi.id]: e.target.value }))}
                    placeholder="새 탐구 주제(LOI) 이름 (예: LOI4)"
                    className="min-w-[10rem] flex-1 rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (needPassword()) return;
                      const name = newLoiName[uoi.id] ?? "";
                      if (!name.trim()) {
                        setMessage({ type: "error", text: "탐구 주제 이름을 입력해주세요." });
                        return;
                      }
                      run(() => createLoi(password, uoi.id, name), () =>
                        setNewLoiName((r) => ({ ...r, [uoi.id]: "" }))
                      );
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    LOI 추가
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-dashed border-gray-200 pt-4">
          <input
            value={newUoiName}
            onChange={(e) => setNewUoiName(e.target.value)}
            placeholder="새 탐구 단원(UOI) 이름 (예: UOI4)"
            className="min-w-[10rem] flex-1 rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (needPassword()) return;
              if (!newUoiName.trim()) {
                setMessage({ type: "error", text: "탐구 단원 이름을 입력해주세요." });
                return;
              }
              run(() => createUoi(password, newUoiName), () => setNewUoiName(""));
            }}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            UOI 추가
          </button>
        </div>
      </section>
    </div>
  );
}
