"use client";

import { MousePointer2, Redo2, StickyNote, Undo2, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { StormStore } from "./engine/store";

/** Tooltips portal to <body>, outside the always-light board, so they carry `light` themselves. */
export function BoardTip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent className="light">{label}</TooltipContent>
    </Tooltip>
  );
}

type ToolButton = {
  label: string;
  Icon: LucideIcon;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolbarButton({ label, Icon, pressed, disabled, onClick }: ToolButton) {
  return (
    <BoardTip label={label}>
      <Button
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

/** Bottom-centre toolbar: Select, Sticky, Undo, Redo. */
export function StormToolbar({ store }: { store: StormStore }) {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return (
    <div
      role="toolbar"
      aria-label="Storm tools"
      className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-md"
    >
      <ToolbarButton
        label="Select (V)"
        Icon={MousePointer2}
        pressed={snap.tool === "select"}
        onClick={() => store.setTool("select")}
      />
      <ToolbarButton
        label="Sticky note (N)"
        Icon={StickyNote}
        pressed={snap.tool === "sticky"}
        onClick={() => store.setTool("sticky")}
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
  );
}
