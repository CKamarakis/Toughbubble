"use client";

import { ArchiveRestore, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as actions from "@/lib/tree/actions";
import { displayTitle } from "@/lib/tree/build";
import type { StatusRoot } from "@/lib/tree/operations";
import { FormatDate } from "./format-date";
import { ItemIcon, KIND_LABELS } from "./item-icon";

/** The Archive or Trash view: items archived or trashed directly, newest first. */
export function StatusList({ status, items }: { status: "archived" | "trashed"; items: StatusRoot[] }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<StatusRoot | null>(null);

  const run = (action: () => Promise<actions.ActionResult<unknown>>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.error);
    });

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {status === "archived" ? "Nothing is archived." : "Trash is empty."}
      </p>
    );
  }

  return (
    <>
      <ul className="overflow-hidden rounded-xl border" aria-busy={pending}>
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-3 border-b px-3 py-2 last:border-b-0"
          >
            <ItemIcon item={item} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{displayTitle(item)}</span>
              <span className="text-xs text-muted-foreground">
                {KIND_LABELS[item.kind]} · {status === "archived" ? "Archived" : "Trashed"}{" "}
                <FormatDate iso={item.statusChangedAt} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => run(() => actions.restoreItem(item.id), `Restored “${displayTitle(item)}”`)}
              >
                <ArchiveRestore />
                Restore
              </Button>
              {status === "archived" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => actions.trashItem(item.id), "Moved to Trash")}
                >
                  <Trash2 />
                  Move to Trash
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() => setConfirming(item)}
                >
                  <Trash2 />
                  Delete forever
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!confirming} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{confirming && displayTitle(confirming)}” forever?</DialogTitle>
            <DialogDescription>
              This permanently deletes it and everything inside it, including items you moved to
              Trash separately. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                const item = confirming;
                setConfirming(null);
                if (item) run(() => actions.deleteForever(item.id), "Deleted forever");
              }}
            >
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
