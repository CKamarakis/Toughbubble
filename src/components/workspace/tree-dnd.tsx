"use client";

import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { createContext, useCallback, useContext, useState } from "react";
import { displayTitle, findNode } from "@/lib/tree/build";
import { canReorderNextTo, groupOf, reorderedIds } from "@/lib/tree/reorder";
import type { TreeNode } from "@/lib/tree/types";
import { ItemIcon } from "./item-icon";
import { useWorkspace } from "./workspace-context";

// Drag and drop reorders an item among its siblings: same parent, same kind
// group (sidebar-manual-order D4). A line shows where it will land. Moving to
// another project or folder is "Move to…"; Move up / Move down is the
// keyboard path.

type Side = "above" | "below";
type Indicator = { targetId: string; side: Side } | null;

const IndicatorContext = createContext<Indicator>(null);

/** The pointer's y during a drag: where it started plus how far it moved. */
function pointerY(event: DragMoveEvent | DragEndEvent) {
  const start = event.activatorEvent as PointerEvent | undefined;
  return (start?.clientY ?? 0) + event.delta.y;
}

export function TreeDnd({ children }: { children: React.ReactNode }) {
  const ws = useWorkspace();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<Indicator>(null);
  // A small distance keeps plain clicks working as clicks.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  /** The allowed landing place under the pointer, if any. */
  const placeFor = (event: DragMoveEvent | DragEndEvent): Indicator => {
    const { active, over } = event;
    if (!over) return null;
    const targetId = String(over.id);
    if (!canReorderNextTo(ws.tree, String(active.id), targetId)) return null;
    const middle = over.rect.top + over.rect.height / 2;
    return { targetId, side: pointerY(event) < middle ? "above" : "below" };
  };

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const onDragMove = (event: DragMoveEvent) => {
    const next = placeFor(event);
    setIndicator((prev) => (prev?.targetId === next?.targetId && prev?.side === next?.side ? prev : next));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const place = placeFor(event);
    setActiveId(null);
    setIndicator(null);
    if (!place) return;
    const itemId = String(event.active.id);
    const group = groupOf(ws.tree, itemId);
    const ids = group && reorderedIds(group.ids, itemId, place.targetId, place.side);
    if (group && ids) ws.reorder(group.parentId, group.group, ids);
  };

  const active = activeId ? findNode(ws.tree, activeId) : undefined;
  return (
    <DndContext
      sensors={sensors}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      // The landing row is the one under the pointer, not the one the dragged
      // row overlaps most.
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setIndicator(null);
      }}
    >
      <IndicatorContext value={indicator}>{children}</IndicatorContext>
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

/**
 * Drag and drop wiring for one tree row. Every row is draggable and a possible
 * landing place; `dropSide` says where the line goes when this row is the
 * allowed landing place under the pointer.
 */
export function useTreeRowDnd(node: TreeNode, disabled: boolean) {
  const indicator = useContext(IndicatorContext);
  const drag = useDraggable({ id: node.id, disabled });
  const drop = useDroppable({ id: node.id, disabled });
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
    // would add a tab stop to every row. Move up / Move down is the keyboard path.
    dragProps: drag.listeners ?? {},
    isDragging: drag.isDragging,
    dropSide: indicator?.targetId === node.id ? indicator.side : null,
  };
}
