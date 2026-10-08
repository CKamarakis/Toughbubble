"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
