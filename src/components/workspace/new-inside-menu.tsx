"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ItemKind } from "@/lib/tree/types";
import { ItemIcon, KIND_LABELS } from "./item-icon";
import { useWorkspace } from "./workspace-context";

const KINDS: ItemKind[] = ["note", "storm", "folder", "project"];

/** "New" menu creating an item inside a project or folder. */
export function NewInsideMenu({ parentId, label = "New" }: { parentId: string; label?: string }) {
  const ws = useWorkspace();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={ws.pending} />}>
        <Plus />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {KINDS.map((kind) => (
          <DropdownMenuItem key={kind} onClick={() => ws.create(kind, parentId)}>
            <ItemIcon item={{ kind }} />
            {KIND_LABELS[kind]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
