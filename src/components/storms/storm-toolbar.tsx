"use client";

import { Redo2, StickyNote, Undo2, type LucideIcon } from "lucide-react";
import { useRef, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { StormStore } from "./engine/store";
import { StickyToolPalette } from "./sticky-tool-palette";

/** Tooltips portal to <body>, outside the always-light board, so they carry `light` themselves. */
export function BoardTip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent className="light">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Stops a mouse press from moving focus off the board; Tab and Enter/Space still work. */
export const keepFocus = (e: React.MouseEvent) => e.preventDefault();

type ToolButton = {
  ref?: React.Ref<HTMLButtonElement>;
  label: string;
  Icon: LucideIcon;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolbarButton({ ref, label, Icon, pressed, disabled, onClick }: ToolButton) {
  return (
    <BoardTip label={label}>
      <Button
        ref={ref}
        variant={pressed ? "secondary" : "ghost"}
        size="icon"
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onClick}
      >
        <Icon />
      </Button>
    </BoardTip>
  );
}

/**
 * Bottom-centre toolbar: Sticky, Undo, Redo; with the Sticky tool on, the palette for new
 * stickies sits above the Sticky button.
 */
export function StormToolbar({ store, focusBoard = () => {} }: { store: StormStore; focusBoard?: () => void }) {
  const stickyRef = useRef<HTMLButtonElement>(null);
  // Primitives only, so panning and zooming do not re-render the toolbar.
  const tool = useSyncExternalStore(store.subscribe, () => store.getSnapshot().tool, () => store.getSnapshot().tool);
  const canUndo = useSyncExternalStore(store.subscribe, () => store.getSnapshot().canUndo, () => store.getSnapshot().canUndo);
  const canRedo = useSyncExternalStore(store.subscribe, () => store.getSnapshot().canRedo, () => store.getSnapshot().canRedo);
  const snap = { tool, canUndo, canRedo };
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
      {snap.tool === "sticky" && <StickyToolPalette store={store} anchor={stickyRef} focusBoard={focusBoard} />}
      <div
        onMouseDown={keepFocus}
        role="toolbar"
        aria-label="Storm tools"
        className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-md"
      >
        <ToolbarButton
          ref={stickyRef}
          label="Sticky note (N)"
          Icon={StickyNote}
          pressed={snap.tool === "sticky"}
          onClick={() => store.setTool(snap.tool === "sticky" ? "select" : "sticky")}
        />
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
        <ToolbarButton
          label="Undo (Ctrl+Z)"
          Icon={Undo2}
          disabled={!snap.canUndo}
          onClick={() => store.undo()}
        />
        <ToolbarButton
          label="Redo (Ctrl+Shift+Z)"
          Icon={Redo2}
          disabled={!snap.canRedo}
          onClick={() => store.redo()}
        />
      </div>
    </div>
  );
}
