"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TreeRow } from "@/lib/tree/types";
import { ItemIcon, KIND_LABELS } from "./item-icon";
import { useWorkspace } from "./workspace-context";

/**
 * A project's or folder's kind on its page, as a quiet control that switches
 * between Project and Folder (item-menu-actions D3). Folder says what is lost.
 */
export function KindSwitch({ item }: { item: TreeRow & { kind: "project" | "folder" } }) {
  const ws = useWorkspace();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Kind: ${KIND_LABELS[item.kind]}, change`}
        className="flex items-center gap-1 rounded-md px-1 -mx-1 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[popup-open]:bg-accent pointer-coarse:min-h-10"
      >
        {KIND_LABELS[item.kind]}
        <ChevronDown aria-hidden className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuRadioGroup
          value={item.kind}
          onValueChange={(to: "project" | "folder") => {
            if (to !== item.kind) ws.convert(item.id, to);
          }}
        >
          <DropdownMenuRadioItem value="project" closeOnClick>
            <ItemIcon item={{ kind: "project", icon: null, color: null }} />
            Project
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="folder" closeOnClick className="items-start">
            <ItemIcon item={{ kind: "folder" }} className="mt-0.5" />
            <span className="flex flex-col">
              Folder
              <span className="text-xs text-muted-foreground">Folders have no icon or colour</span>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
