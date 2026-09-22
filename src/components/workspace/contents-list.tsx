"use client";

import { ArrowDownUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { displayTitle } from "@/lib/tree/build";
import {
  CONTENTS_SORT_LABELS,
  CONTENTS_SORTS,
  contentsCompare,
  isContentsSort,
  kindGroup,
  sortTree,
} from "@/lib/tree/order";
import { isContainer, type TreeNode } from "@/lib/tree/types";
import { useStoredValue } from "@/lib/use-stored-value";
import { FormatDate } from "./format-date";
import { ItemIcon } from "./item-icon";
import { NewInsideMenu } from "./new-inside-menu";

const SORT_KEY = "tb:contents-sort";
const GROUP_LABELS = ["Projects", "Folders", "Notes and Storms"];

/**
 * The contents of a project or folder, grouped like the sidebar and sorted by
 * the viewer's choice (remembered per browser, shared by all such pages, and
 * never applied to the sidebar). Subfolders expand in place.
 */
export function ContentsList({ node }: { node: TreeNode }) {
  const [stored, setStored] = useStoredValue(SORT_KEY, "newest");
  const sort = isContentsSort(stored) ? stored : "newest";
  const children = useMemo(
    () => sortTree(node.children, contentsCompare(sort, displayTitle)),
    [node.children, sort],
  );

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
        <p className="text-sm text-muted-foreground">This {node.kind} is empty.</p>
        <NewInsideMenu parentId={node.id} label="Add an item" />
      </div>
    );
  }

  const groups = [0, 1, 2]
    .map((g) => children.filter((c) => kindGroup(c.kind) === g))
    .map((items, g) => ({ label: GROUP_LABELS[g], items }))
    .filter((g) => g.items.length > 0);

  return (
    <section aria-label="Contents" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {node.children.length} {node.children.length === 1 ? "item" : "items"}
        </h2>
        <div className="flex items-center gap-2">
          <NewInsideMenu parentId={node.id} />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <ArrowDownUp />
              <span>
                <span className="sr-only">Sort: </span>
                {CONTENTS_SORT_LABELS[sort]}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setStored(String(v))}>
                {CONTENTS_SORTS.map((s) => (
                  <DropdownMenuRadioItem key={s} value={s} closeOnClick>
                    {CONTENTS_SORT_LABELS[s]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="hidden grid-cols-[1fr_8rem_8rem] gap-2 border-b bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground sm:grid">
          <span>Title</span>
          <span>Created</span>
          <span>Last edited</span>
        </div>
        {groups.map((group) => (
          <div key={group.label} role="group" aria-label={group.label}>
            <div className="border-b bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              {group.label}
            </div>
            <ul>
              {group.items.map((child) => (
                <ContentsRow key={child.id} node={child} depth={0} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContentsRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(false);
  const container = isContainer(node.kind);
  const title = displayTitle(node);

  return (
    <li className="border-b last:border-b-0">
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent sm:grid-cols-[1fr_8rem_8rem]">
        <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
          {container ? (
            <button
              type="button"
              aria-expanded={open}
              aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
              onClick={() => setOpen(!open)}
              className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
            </button>
          ) : (
            <span className="size-5 shrink-0" aria-hidden />
          )}
          <Link
            href={`/items/${node.id}`}
            className="flex min-w-0 items-center gap-2 rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ItemIcon item={node} />
            <span className={cn("truncate", !node.title.trim() && "text-muted-foreground")}>{title}</span>
          </Link>
        </div>
        <FormatDate iso={node.createdAt} className="hidden text-muted-foreground sm:block" />
        <FormatDate iso={node.editedAt} className="text-muted-foreground" />
      </div>
      {open && (
        <ul className="border-t">
          {node.children.length === 0 ? (
            <li
              className="px-3 py-1.5 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(depth + 1) * 20 + 38}px` }}
            >
              Empty
            </li>
          ) : (
            node.children.map((child) => <ContentsRow key={child.id} node={child} depth={depth + 1} />)
          )}
        </ul>
      )}
    </li>
  );
}
