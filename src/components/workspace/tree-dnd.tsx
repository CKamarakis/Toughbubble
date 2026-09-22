"use client";

import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ArrowUpToLine } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { displayTitle, findNode } from "@/lib/tree/build";
import { canMoveTo } from "@/lib/tree/destinations";
import { isContainer, type TreeNode } from "@/lib/tree/types";
import { ItemIcon } from "./item-icon";
import { useWorkspace } from "./workspace-context";

// Drag and drop moves items into projects, folders, or the top level (design
// D5). The sidebar order is fixed, so there is no reordering; "Move to…" is
// the keyboard path.

const ROOT = "drop:root";
const dropId = (id: string) => `drop:${id}`;
const targetOf = (overId: string | number) =>
  overId === ROOT ? null : String(overId).slice("drop:".length);

const EXPAND_AFTER_MS = 600;

export function TreeDnd({ children }: { children: React.ReactNode }) {
  const ws = useWorkspace();
  const [activeId, setActiveId] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A small distance keeps plain clicks working as clicks.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const clearHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const onDragOver = ({ active, over }: DragOverEvent) => {
    clearHover();
    const target = over ? targetOf(over.id) : null;
    if (!target || ws.isExpanded(target) || !canMoveTo(ws.tree, String(active.id), target)) return;
    hoverTimer.current = setTimeout(() => ws.setExpanded(target, true), EXPAND_AFTER_MS);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    clearHover();
    setActiveId(null);
    if (!over) return;
    const itemId = String(active.id);
    const target = targetOf(over.id);
    if (canMoveTo(ws.tree, itemId, target)) ws.move(itemId, target);
  };

  const active = activeId ? findNode(ws.tree, activeId) : undefined;
  return (
    <DndContext
      sensors={sensors}
      // Re-measure drop targets during the drag: the top-level strip and
      // auto-expanding folders shift rows after the drag starts.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      // The drop target is the row under the pointer, not the one the dragged
      // row overlaps most: that is what a tree drop means.
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        clearHover();
        setActiveId(null);
      }}
    >
      {active && <RootDropZone itemId={active.id} />}
      {children}
      <DragOverlay dropAnimation={null}>
        {active && (
          <div className="flex h-7 max-w-56 items-center gap-2 rounded-md bg-popover px-2 text-sm shadow-md ring-1 ring-foreground/10">
            <ItemIcon item={active} />
            <span className="truncate">{displayTitle(active)}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function RootDropZone({ itemId }: { itemId: string }) {
  const ws = useWorkspace();
  const valid = canMoveTo(ws.tree, itemId, null);
  const { setNodeRef, isOver } = useDroppable({ id: ROOT, disabled: !valid });
  if (!valid) return null;
  return (
    <div
      ref={setNodeRef}
      data-drop-root
      className={cn(
        "mb-1 flex h-7 items-center gap-2 rounded-md border border-dashed px-2 text-xs text-muted-foreground",
        isOver && "border-solid border-ring bg-sidebar-accent text-foreground",
      )}
    >
      <ArrowUpToLine className="size-3.5" aria-hidden />
      Move to top level
    </div>
  );
}

/**
 * Drag and drop wiring for one tree row. Rows are draggable; projects and
 * folders are drop targets and highlight only when the drop is allowed.
 */
export function useTreeRowDnd(node: TreeNode, disabled: boolean) {
  const ws = useWorkspace();
  const { active } = useDndContext();
  const drag = useDraggable({ id: node.id, disabled });
  const activeId = active ? String(active.id) : null;
  const acceptsDrop =
    isContainer(node.kind) && activeId !== null && canMoveTo(ws.tree, activeId, node.id);
  const drop = useDroppable({ id: dropId(node.id), disabled: disabled || !isContainer(node.kind) });
  const { setNodeRef: setDragRef } = drag;
  const { setNodeRef: setDropRef } = drop;
  const setRowRef = useCallback(
    (el: HTMLElement | null) => {
      setDragRef(el);
      setDropRef(el);
    },
    [setDragRef, setDropRef],
  );

  return {
    setRowRef,
    // Pointer listeners only: the draggable attributes (role=button, tabindex)
    // would add a tab stop to every row. "Move to…" is the keyboard path.
    dragProps: drag.listeners ?? {},
    isDragging: drag.isDragging,
    isDropTarget: drop.isOver && acceptsDrop,
  };
}
