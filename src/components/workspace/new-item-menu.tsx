"use client";

import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { ItemKind } from "@/lib/tree/types";
import { ItemIcon, KIND_LABELS } from "./item-icon";
import { useWorkspace } from "./workspace-context";

const KINDS: ItemKind[] = ["project", "folder", "note", "storm"];

/** "New" menu creating an item at the root level. */
export function NewItemMenu({ label = "New", size = "sm" }: { label?: string; size?: "sm" | "default" }) {
  const ws = useWorkspace();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size={size} variant="outline" disabled={ws.pending} />}>
        <Plus />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {KINDS.map((kind) => (
          <DropdownMenuItem key={kind} onClick={() => ws.create(kind, null)}>
            <ItemIcon item={{ kind }} />
            {KIND_LABELS[kind]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
