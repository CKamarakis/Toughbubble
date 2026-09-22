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

/**
 * "New" menu creating an item at the root level. `round` is the compact
 * sidebar version: a yellow "+" on a black circle, named "New" for screen readers.
 */
export function NewItemMenu({
  label = "New",
  size = "sm",
  round = false,
}: {
  label?: string;
  size?: "sm" | "default";
  round?: boolean;
}) {
  const ws = useWorkspace();
  const trigger = round ? (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={ws.pending}
      className="flex size-7 items-center justify-center rounded-full bg-warm-950 text-brand-yellow ring-1 ring-warm-700 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
    />
  ) : (
    <Button size={size} disabled={ws.pending} />
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger}>
        <Plus className={round ? "size-4" : undefined} strokeWidth={round ? 2.75 : undefined} />
        {!round && label}
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
