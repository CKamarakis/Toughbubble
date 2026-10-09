"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CREATE_ORDER, ItemIcon, KIND_LABELS } from "./item-icon";
import { useWorkspace } from "./workspace-context";

/** "New" menu creating an item inside a project or folder. */
export function NewInsideMenu({ parentId, label = "New" }: { parentId: string; label?: string }) {
  const ws = useWorkspace();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" disabled={ws.creating} />}>
        <Plus />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {CREATE_ORDER.map((kind) => (
          <DropdownMenuItem key={kind} onClick={() => ws.create(kind, parentId)}>
            <ItemIcon item={{ kind }} />
            {KIND_LABELS[kind]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The "+" on a project or folder row in the sidebar (item-menu-actions D2):
 * the same kinds as New inside, one tap away. Shaped like the row's "⋯".
 */
export function RowNewMenu({ parentId, title, className }: { parentId: string; title: string; className?: string }) {
  const ws = useWorkspace();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`New inside ${title}`}
        disabled={ws.creating}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50",
          className,
        )}
      >
        <Plus className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {CREATE_ORDER.map((kind) => (
          <DropdownMenuItem key={kind} onClick={() => ws.create(kind, parentId)}>
            <ItemIcon item={{ kind }} />
            {KIND_LABELS[kind]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
