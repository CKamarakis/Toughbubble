"use client";

import {
  Archive,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { displayTitle } from "@/lib/tree/build";
import { groupOf, movedOneStep } from "@/lib/tree/reorder";
import { isContainer, type ItemKind, type TreeRow } from "@/lib/tree/types";
import { KIND_LABELS } from "./item-icon";
import { useWorkspace } from "./workspace-context";

const CREATE_ORDER: ItemKind[] = ["note", "storm", "folder", "project"];

/** "⋯" menu for an item row. `onRename` starts inline rename where the menu lives. */
export function ItemMenu({
  item,
  onRename,
  className,
}: {
  item: TreeRow;
  onRename: () => void;
  className?: string;
}) {
  const ws = useWorkspace();
  const container = isContainer(item.kind);
  // Keyboard reorder within the item's group (sidebar-manual-order D5).
  const group = groupOf(ws.tree, item.id);
  const moveStep = (direction: "up" | "down") => {
    const ids = group && movedOneStep(group.ids, item.id, direction);
    if (group && ids) ws.reorder(group.parentId, group.group, ids);
  };
  const canMoveUp = !!group && movedOneStep(group.ids, item.id, "up") !== null;
  const canMoveDown = !!group && movedOneStep(group.ids, item.id, "down") !== null;
  // Rename and Move put focus somewhere else; don't pull it back to the trigger.
  const keepFocusAway = useRef(false);

  return (
    <DropdownMenu onOpenChange={(open) => open && (keepFocusAway.current = false)}>
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
            {CREATE_ORDER.map((kind) => (
              <DropdownMenuItem key={kind} onClick={() => ws.create(kind, item.id)}>
                <Plus />
                New {KIND_LABELS[kind].toLowerCase()} inside
              </DropdownMenuItem>
            ))}
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
        <DropdownMenuItem
          onClick={() => {
            keepFocusAway.current = true;
            ws.setMovingId(item.id);
          }}
        >
          <FolderInput />
          Move to…
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canMoveUp} onClick={() => moveStep("up")}>
          <ArrowUp />
          Move up
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canMoveDown} onClick={() => moveStep("down")}>
          <ArrowDown />
          Move down
        </DropdownMenuItem>
        {container && (
          <DropdownMenuItem
            onClick={() => ws.convert(item.id, item.kind === "folder" ? "project" : "folder")}
          >
            <ArrowRightLeft />
            Convert to {item.kind === "folder" ? "project" : "folder"}
          </DropdownMenuItem>
        )}
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
