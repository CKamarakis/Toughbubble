"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { displayTitle } from "@/lib/tree/build";
import { isContainer, type TreeNode } from "@/lib/tree/types";
import { ItemIcon } from "./item-icon";
import { ItemMenu } from "./item-menu";
import { TitleInput } from "./title-input";
import { useTreeRowDnd } from "./tree-dnd";
import { useWorkspace } from "./workspace-context";

/**
 * The sidebar tree. `forceOpen` holds containers shown expanded regardless of
 * the saved state (used while searching).
 */
export function SidebarTree({
  nodes,
  forceOpen,
}: {
  nodes: TreeNode[];
  forceOpen?: Set<string>;
}) {
  return (
    <ul role="tree" aria-label="Workspace" className="flex flex-col gap-px">
      {nodes.map((node) => (
        <TreeItem key={node.id} node={node} depth={0} forceOpen={forceOpen} />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  depth,
  forceOpen,
}: {
  node: TreeNode;
  depth: number;
  forceOpen?: Set<string>;
}) {
  const ws = useWorkspace();
  const container = isContainer(node.kind);
  const open = container && (forceOpen ? forceOpen.has(node.id) : ws.isExpanded(node.id));
  const current = ws.currentId === node.id;
  const renaming = ws.renamingId === node.id;
  const title = displayTitle(node);
  // No dragging while searching (filtered tree) or renaming.
  const { setRowRef, dragProps, isDragging, isDropTarget } = useTreeRowDnd(
    node,
    !!forceOpen || renaming,
  );

  return (
    <li
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={container ? open : undefined}
      aria-selected={current}
      data-item-id={node.id}
    >
      <div
        ref={setRowRef}
        {...dragProps}
        className={cn(
          "group/row flex h-7 items-center gap-1 rounded-md pr-1 text-sm hover:bg-sidebar-accent",
          current && "bg-sidebar-accent font-medium",
          isDragging && "opacity-50",
          isDropTarget && "bg-sidebar-accent ring-2 ring-ring",
        )}
        data-drop-target={isDropTarget || undefined}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {container ? (
          <button
            type="button"
            aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
            onClick={() => ws.setExpanded(node.id, !open)}
            disabled={!!forceOpen}
            className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}

        {renaming ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <ItemIcon item={node} />
            <TitleInput
              initial={node.title}
              placeholder={title}
              aria-label={`Rename ${title}`}
              onSave={(value) => ws.rename(node.id, value)}
              onDone={() => ws.setRenamingId(null)}
            />
          </span>
        ) : (
          <Link
            href={`/items/${node.id}`}
            draggable={false}
            aria-current={current ? "page" : undefined}
            // A project's or folder's name opens and expands it; on the open
            // one it toggles instead (sidebar-collapse-open-path D3). Clicks
            // that open a new tab leave the sidebar alone.
            onClick={(e) => {
              if (!container || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
              if (current) {
                e.preventDefault();
                ws.setExpanded(node.id, !open);
              } else {
                ws.setExpanded(node.id, true);
              }
            }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ItemIcon item={node} />
            <span className={cn("truncate", !node.title.trim() && "text-muted-foreground")}>
              {title}
            </span>
          </Link>
        )}

        {!renaming && (
          <ItemMenu
            item={node}
            onRename={() => ws.setRenamingId(node.id)}
            className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100"
          />
        )}
      </div>

      {open && (
        <ul role="group" className="flex flex-col gap-px">
          {node.children.length === 0 ? (
            <li
              className="h-6 text-xs leading-6 text-muted-foreground"
              style={{ paddingLeft: `${(depth + 1) * 12 + 28}px` }}
            >
              Empty
            </li>
          ) : (
            node.children.map((child) => (
              <TreeItem key={child.id} node={child} depth={depth + 1} forceOpen={forceOpen} />
            ))
          )}
        </ul>
      )}
    </li>
  );
}
