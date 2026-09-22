"use client";

import { Layers } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { displayTitle, findNode } from "@/lib/tree/build";
import { moveDestinations } from "@/lib/tree/destinations";
import { ItemIcon } from "./item-icon";
import { useWorkspace } from "./workspace-context";

/** Keyboard-operable destination picker (the accessible alternative to dragging). */
export function MoveDialog() {
  const ws = useWorkspace();
  const item = ws.movingId ? findNode(ws.tree, ws.movingId) : undefined;

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && ws.setMovingId(null)}>
      <DialogContent className="sm:max-w-md">
        {item && (
          <MovePicker
            key={item.id}
            itemId={item.id}
            title={displayTitle(item)}
            onDone={() => ws.setMovingId(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MovePicker({ itemId, title, onDone }: { itemId: string; title: string; onDone: () => void }) {
  const ws = useWorkspace();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const options = useMemo(() => {
    const all = moveDestinations(ws.tree, itemId);
    const needle = query.trim().toLocaleLowerCase();
    return needle ? all.filter((d) => d.title.toLocaleLowerCase().includes(needle)) : all;
  }, [ws.tree, itemId, query]);
  const current = Math.min(active, Math.max(options.length - 1, 0));

  const choose = (index: number) => {
    const target = options[index];
    if (!target) return;
    ws.move(itemId, target.id);
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Move “{title}”</DialogTitle>
        <DialogDescription>Choose a project or folder, or the top level.</DialogDescription>
      </DialogHeader>
      <input
        autoFocus
        role="combobox"
        aria-expanded
        aria-controls="move-destinations"
        aria-activedescendant={options.length ? `move-option-${current}` : undefined}
        aria-label="Filter destinations"
        placeholder="Filter destinations"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(Math.min(current + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(current - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(current);
          }
        }}
        className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <ul
        id="move-destinations"
        role="listbox"
        aria-label="Destinations"
        className="-mx-1 max-h-72 overflow-y-auto"
      >
        {options.length === 0 && (
          <li className="px-2 py-1.5 text-sm text-muted-foreground">No other destinations</li>
        )}
        {options.map((d, i) => (
          <li
            key={d.id ?? "root"}
            id={`move-option-${i}`}
            role="option"
            aria-selected={i === current}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(i)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              i === current && "bg-accent",
            )}
            style={{ paddingLeft: `${8 + d.depth * 14}px` }}
          >
            {d.kind ? (
              <ItemIcon item={{ kind: d.kind, ...iconFields(ws.rows, d.id) }} />
            ) : (
              <Layers aria-hidden className="size-4 text-muted-foreground" />
            )}
            <span className="truncate">{d.title}</span>
            {d.path.length > 0 && query && (
              <span className="ml-auto truncate text-xs text-muted-foreground">{d.path.join(" / ")}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function iconFields(rows: { id: string; icon: string | null; color: string | null }[], id: string | null) {
  const row = rows.find((r) => r.id === id);
  return { icon: row?.icon ?? null, color: row?.color ?? null };
}
