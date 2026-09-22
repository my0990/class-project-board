"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ClassCard, { type UoiProgress } from "@/components/ClassCard";

type ClassItem = {
  slug: string;
  name: string;
  teacherName: string | null;
  uois: UoiProgress[];
};

type Props = {
  classes: ClassItem[];
};

const STORAGE_KEY = "classOrder";

// localStorage에는 slug(학급 고유 코드) 배열만 저장합니다. - 나중에 학급이 추가/삭제돼도
// 안전하게 순서를 맞추기 위해서입니다.
function loadOrder(): string[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return null;
  }
}

function saveOrder(order: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // 저장 실패(시크릿 모드 등)해도 화면 사용에는 문제 없도록 조용히 무시합니다.
  }
}

// 저장된 순서(slug 배열)를 실제 학급 목록에 적용합니다. 저장된 순서에 없는
// 학급(새로 추가된 학급)은 맨 뒤에 붙입니다.
function applyOrder(classes: ClassItem[], order: string[] | null): ClassItem[] {
  if (!order || order.length === 0) return classes;
  const bySlug = new Map(classes.map((c) => [c.slug, c]));
  const ordered: ClassItem[] = [];
  for (const slug of order) {
    const item = bySlug.get(slug);
    if (item) {
      ordered.push(item);
      bySlug.delete(slug);
    }
  }
  // 저장된 순서에 없던(새로 생긴) 학급은 뒤에 그대로 붙입니다.
  for (const item of classes) {
    if (bySlug.has(item.slug)) ordered.push(item);
  }
  return ordered;
}

function DragHandle(props: { listeners: ReturnType<typeof useSortable>["listeners"]; attributes: ReturnType<typeof useSortable>["attributes"] }) {
  return (
    <button
      type="button"
      aria-label="순서 변경"
      className="touch-none flex-none cursor-grab select-none rounded-lg p-2 text-gray-300 transition hover:bg-gray-100 hover:text-gray-500 active:cursor-grabbing"
      {...props.attributes}
      {...props.listeners}
      onClick={(e) => e.preventDefault()}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <circle cx="6" cy="5" r="1.5" />
        <circle cx="6" cy="10" r="1.5" />
        <circle cx="6" cy="15" r="1.5" />
        <circle cx="14" cy="5" r="1.5" />
        <circle cx="14" cy="10" r="1.5" />
        <circle cx="14" cy="15" r="1.5" />
      </svg>
    </button>
  );
}

function SortableCard({ item }: { item: ClassItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.slug,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-1 rounded-xl ${isDragging ? "z-10 opacity-90 shadow-lg" : ""}`}
    >
      <div className="mt-1">
        <DragHandle listeners={listeners} attributes={attributes} />
      </div>
      <div className="min-w-0 flex-1">
        <ClassCard slug={item.slug} name={item.name} teacherName={item.teacherName} uois={item.uois} />
      </div>
    </div>
  );
}

// 홈 화면 학급 목록: 드래그로 순서를 바꿀 수 있고, 바꾼 순서는 이 브라우저에만
// (localStorage) 저장됩니다. 다른 사람 화면이나 서버 데이터는 전혀 바뀌지 않습니다.
//
// 서버에서 렌더링된 화면과 처음 화면이 다르면(hydration mismatch) 에러가 나므로,
// 처음에는 서버와 똑같은 순서로 그리고, 화면이 뜬 뒤(useEffect)에 localStorage를
// 읽어서 그때 순서를 바꿉니다.
export default function HomeClassList({ classes }: Props) {
  const [items, setItems] = useState<ClassItem[]>(classes);

  useEffect(() => {
    const order = loadOrder();
    setItems(applyOrder(classes, order));
    // classes 내용(진행 상황)이 바뀔 때마다 저장된 순서를 다시 적용합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.slug === active.id);
      const newIndex = prev.findIndex((i) => i.slug === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      saveOrder(next.map((i) => i.slug));
      return next;
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.slug)} strategy={verticalListSortingStrategy}>
        <div className="mt-8 grid grid-cols-1 gap-4" suppressHydrationWarning>
          {items.map((item) => (
            <SortableCard key={item.slug} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
