"use client";

import { useState } from "react";
import NewPostForm from "@/components/NewPostForm";
import PostCard from "@/components/PostCard";
import { useSiteAuth } from "@/components/SiteGate";

type Attachment = { id: string; url: string; type: string };

type PostItem = {
  id: string;
  content: string;
  attachments: Attachment[];
  createdAt: Date | string;
};

type StageItem = {
  id: string;
  name: string;
  posts: PostItem[];
};

type LoiItem = {
  id: string;
  name: string;
  stages: StageItem[];
};

type UoiItem = {
  id: string;
  name: string;
  lois: LoiItem[];
};

export default function ClassBoard({ classSlug, uois }: { classSlug: string; uois: UoiItem[] }) {
  const auth = useSiteAuth();
  const isOwnClass = auth.slug === classSlug;

  const [selectedUoiId, setSelectedUoiId] = useState<string | null>(uois[0]?.id ?? null);
  const [selectedLoiId, setSelectedLoiId] = useState<string | null>(uois[0]?.lois[0]?.id ?? null);
  const selectedUoi = uois.find((u) => u.id === selectedUoiId) ?? uois[0] ?? null;
  const selectedLoi = selectedUoi?.lois.find((l) => l.id === selectedLoiId) ?? selectedUoi?.lois[0] ?? null;

  // 단계별로 각각 독립적으로 "수정 모드"를 켤 수 있도록 stageId 집합으로 관리합니다.
  const [editingStageIds, setEditingStageIds] = useState<Set<string>>(new Set());

  function selectUoi(uoiId: string) {
    setSelectedUoiId(uoiId);
    const uoi = uois.find((u) => u.id === uoiId);
    setSelectedLoiId(uoi?.lois[0]?.id ?? null);
  }

  function openEdit(stageId: string) {
    setEditingStageIds((prev) => new Set(prev).add(stageId));
  }

  function closeEdit(stageId: string) {
    setEditingStageIds((prev) => {
      const next = new Set(prev);
      next.delete(stageId);
      return next;
    });
  }

  return (
    <div className="mt-10">
      {!isOwnClass && (
        <p className="mb-6 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
          다른 반의 진행 상황을 보고 있어요. 글 등록은 해당 반 코드로 로그인했을 때만 가능해요.
        </p>
      )}

      {/* UOI 탭: 하나를 선택하면 그 UOI 내용만 아래에 표시됩니다 */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {uois.map((uoi, ui) => {
          const active = uoi.id === selectedUoi?.id;
          return (
            <button
              key={uoi.id}
              type="button"
              onClick={() => selectUoi(uoi.id)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                active ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span
                className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
                  active ? "bg-white/20" : "bg-white text-gray-500"
                }`}
              >
                {ui + 1}
              </span>
              {uoi.name}
            </button>
          );
        })}
      </div>

      {!selectedUoi ? (
        <p className="mt-6 text-sm text-gray-400">아직 등록된 탐구 단원(UOI)이 없습니다.</p>
      ) : (
        <section className="mt-6" key={selectedUoi.id}>
          {selectedUoi.lois.length === 0 ? (
            <p className="text-xs text-gray-400">아직 등록된 탐구 주제(LOI)가 없습니다.</p>
          ) : (
            <div className="border-l-2 border-blue-100 pl-4 sm:pl-6">
              {/* LOI 탭: 하나를 선택하면 그 LOI의 단계만 아래에 표시됩니다 */}
              <div className="flex flex-wrap gap-2">
                {selectedUoi.lois.map((loi, li) => {
                  const active = loi.id === selectedLoi?.id;
                  return (
                    <button
                      key={loi.id}
                      type="button"
                      onClick={() => setSelectedLoiId(loi.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        active ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] font-bold ${
                          active ? "bg-white/20" : "bg-white text-gray-500"
                        }`}
                      >
                        {li + 1}
                      </span>
                      {loi.name}
                    </button>
                  );
                })}
              </div>

              {selectedLoi && (
                <div className="mt-5" key={selectedLoi.id}>
                  {selectedLoi.stages.length === 0 ? (
                    <p className="text-xs text-gray-400">아직 등록된 수업 단계가 없습니다.</p>
                  ) : (
                    <div className="space-y-8 border-l-2 border-gray-100 pl-4 sm:pl-6">
                      {selectedLoi.stages.map((stage, si) => (
                        <section key={stage.id}>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                              {si + 1}
                            </span>
                            <h3 className="min-w-0 break-words text-sm font-bold text-gray-900">{stage.name}</h3>
                            <span className="text-xs text-gray-400">{stage.posts.length}개 게시글</span>
                          </div>

                          {isOwnClass ? (
                            (() => {
                              const post = stage.posts[0];
                              const isEditing = editingStageIds.has(stage.id);

                              if (post && !isEditing) {
                                // 글이 이미 있으면: 게시글 형태로 보여주고, "수정" 버튼을 눌렀을 때만 수정창이 나옵니다.
                                return (
                                  <div className="mt-3 space-y-2">
                                    <PostCard post={post} />
                                    <button
                                      type="button"
                                      onClick={() => openEdit(stage.id)}
                                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                      수정
                                    </button>
                                  </div>
                                );
                              }

                              // 글이 없으면 바로 입력창, 글이 있고 수정 모드면 수정창을 보여줍니다.
                              return (
                                <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
                                  <NewPostForm
                                    key={post?.id ?? "new"}
                                    classSlug={classSlug}
                                    stageId={stage.id}
                                    password={auth.password}
                                    existingPost={
                                      post ? { id: post.id, content: post.content, attachments: post.attachments } : undefined
                                    }
                                    onCancel={post ? () => closeEdit(stage.id) : undefined}
                                    onSaved={() => closeEdit(stage.id)}
                                  />
                                </div>
                              );
                            })()
                          ) : stage.posts.length > 0 ? (
                            <div className="mt-4 space-y-4">
                              {stage.posts.map((post) => (
                                <PostCard key={post.id} post={post} />
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-gray-400">아직 등록된 게시글이 없습니다.</p>
                          )}
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
