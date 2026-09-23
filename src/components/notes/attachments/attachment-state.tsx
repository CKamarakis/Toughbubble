"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AttachmentStatus } from "./store";

/**
 * The message shown in place of an attachment that isn't ready: uploading,
 * failed (Retry, Remove), copying, or couldn't be copied or finished (Remove).
 * Returns null when the attachment is ready.
 */
export function AttachmentStateMessage({
  status,
  onRemove,
  className,
}: {
  status: AttachmentStatus;
  onRemove: () => void;
  className?: string;
}) {
  const remove = (
    <Button type="button" size="sm" variant="outline" onClick={onRemove}>
      Remove
    </Button>
  );
  let body: React.ReactNode;
  switch (status.kind) {
    case "ready":
      return null;
    case "uploading":
    case "copying":
    case "loading":
      body = (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {status.kind === "uploading" ? "Uploading…" : status.kind === "copying" ? "Copying…" : "Loading…"}
        </span>
      );
      break;
    case "failed":
      body = (
        <>
          <span role="alert" className="font-medium text-destructive">
            Upload failed
          </span>
          <span className="flex gap-2">
            <Button type="button" size="sm" onClick={status.retry}>
              Retry
            </Button>
            {remove}
          </span>
        </>
      );
      break;
    case "copy-failed":
      body = (
        <>
          <span role="alert">Couldn&apos;t copy this file.</span>
          {remove}
        </>
      );
      break;
    case "unavailable":
      body = (
        <>
          <span role="alert">This file didn&apos;t finish uploading.</span>
          {remove}
        </>
      );
      break;
  }
  return (
    <div contentEditable={false} className={className ?? "flex flex-wrap items-center gap-3 text-sm"}>
      {body}
    </div>
  );
}
