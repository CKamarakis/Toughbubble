"use client";

import {
  Archive,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpDown,
  ArrowUpToLine,
  Copy,
  Ellipsis,
  FolderInput,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { displayTitle } from "@/lib/tree/build";
import { groupOf, movedOneStep, movedToEnd } from "@/lib/tree/reorder";
import { isContainer, type TreeRow } from "@/lib/tree/types";
import { CREATE_ORDER, ItemIcon, KIND_LABELS } from "./item-icon";
import { useWorkspace } from "./workspace-context";

/**
 * "⋯" menu for an item row. `onRename` starts inline rename where the menu
 * lives. `open` / `onOpenChange` let a row open it from a long press
 * (shell-hardening D3).
 */
export function ItemMenu({
  item,
  onRename,
  className,
  open,
  onOpenChange,
}: {
  item: TreeRow;
  onRename: () => void;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const ws = useWorkspace();
  const container = isContainer(item.kind);
  // Keyboard reorder within the item's group (sidebar-manual-order D5).
  const group = groupOf(ws.tree, item.id);
  const moveStep = (direction: "up" | "down") => {
    const ids = group && movedOneStep(group.ids, item.id, direction);
    if (group && ids) ws.reorder(group.parentId, group.group, ids);
  };
  const moveToEnd = (end: "top" | "bottom") => {
    const ids = group && movedToEnd(group.ids, item.id, end);
    if (group && ids) ws.reorder(group.parentId, group.group, ids);
  };
  const canMoveUp = !!group && movedOneStep(group.ids, item.id, "up") !== null;
  const canMoveDown = !!group && movedOneStep(group.ids, item.id, "down") !== null;
  // Rename and Move put focus somewhere else; don't pull it back to the trigger.
  const keepFocusAway = useRef(false);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        if (next) keepFocusAway.current = false;
        onOpenChange?.(next);
      }}
    >
      <DropdownMenuTrigger
        aria-label={`Actions for ${displayTitle(item)}`}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          className,
        )}
      >
        <Ellipsis className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48" finalFocus={() => !keepFocusAway.current}>
        {container && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Plus />
                New inside
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {CREATE_ORDER.map((kind) => (
                  <DropdownMenuItem key={kind} onClick={() => ws.create(kind, item.id)}>
                    <ItemIcon item={{ kind, icon: null, color: null }} className="size-4" />
                    {KIND_LABELS[kind]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={() => {
            keepFocusAway.current = true;
            onRename();
          }}
        >
          <Pencil />
          Rename
        </DropdownMenuItem>
        {item.kind === "storm" && (
          <DropdownMenuItem onClick={() => ws.duplicate(item.id)}>
            <Copy />
            Duplicate
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            keepFocusAway.current = true;
            ws.setMovingId(item.id);
          }}
        >
          <FolderInput />
          Move to…
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowUpDown />
            Reorder
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem disabled={!canMoveUp} onClick={() => moveToEnd("top")}>
              <ArrowUpToLine />
              Move to top
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canMoveUp} onClick={() => moveStep("up")}>
              <ArrowUp />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canMoveDown} onClick={() => moveStep("down")}>
              <ArrowDown />
              Move down
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canMoveDown} onClick={() => moveToEnd("bottom")}>
              <ArrowDownToLine />
              Move to bottom
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => ws.archive(item.id)}>
          <Archive />
          Archive
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => ws.trash(item.id)}>
          <Trash2 />
          Move to Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
