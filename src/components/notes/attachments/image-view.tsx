"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { MAX_IMAGE_WIDTH, MIN_IMAGE_WIDTH, type ImageAlign } from "@/lib/notes/attachment-nodes";
import { cn } from "@/lib/utils";
import { AttachmentStateMessage } from "./attachment-state";
import { useAttachmentStore } from "./store";

const JUSTIFY: Record<ImageAlign, string> = { left: "justify-start", center: "justify-center", right: "justify-end" };

/**
 * An image in the note (attachments design D4, D9): shown from its signed
 * link (or the local preview while uploading), aligned, and resizable by
 * dragging its side handles, keeping the aspect ratio.
 */
export function ImageView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const store = useAttachmentStore();
  const { attachmentId, copyOf, alt, width } = node.attrs as {
    attachmentId: string | null;
    copyOf: string | null;
    alt: string | null;
    width: number | null;
  };
  const align = (node.attrs.align as ImageAlign) ?? "left";

  useEffect(() => {
    if (attachmentId) store.ensure(attachmentId);
  }, [attachmentId, store]);

  const status = store.status(attachmentId, copyOf);
  const src =
    status.kind === "ready" ? status.url : status.kind === "uploading" || status.kind === "failed" ? status.preview : undefined;

  const figureRef = useRef<HTMLDivElement>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const shownWidth = dragWidth ?? width;

  const startResize = (side: "left" | "right") => (e: React.PointerEvent) => {
    const figure = figureRef.current;
    const column = figure?.parentElement;
    if (!figure || !column) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = figure.getBoundingClientRect().width;
    const maxWidth = Math.min(MAX_IMAGE_WIDTH, column.clientWidth);
    // A centered image grows on both sides, so the pointer moves half as far.
    const factor = (side === "right" ? 1 : -1) * (align === "center" ? 2 : 1);
    let latest = startWidth;
    const move = (ev: PointerEvent) => {
      latest = Math.round(Math.min(maxWidth, Math.max(MIN_IMAGE_WIDTH, startWidth + (ev.clientX - startX) * factor)));
      setDragWidth(latest);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragWidth(null);
      updateAttributes({ width: latest });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const handle = (side: "left" | "right") => (
    <span
      aria-hidden
      onPointerDown={startResize(side)}
      className={cn(
        "absolute top-1/2 h-10 w-2 -translate-y-1/2 cursor-ew-resize rounded-full border border-background bg-foreground/70 shadow",
        side === "left" ? "-left-1" : "-right-1",
      )}
    />
  );

  return (
    <NodeViewWrapper className={cn("tb-image my-3 flex", JUSTIFY[align])} data-align={align}>
      <div
        ref={figureRef}
        className={cn(
          "relative max-w-full rounded-md",
          selected && "outline-2 outline-offset-2 outline-ring",
          !src && "w-full",
        )}
        style={src && shownWidth ? { width: shownWidth } : undefined}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URLs change per issue (design D5)
          <img
            src={src}
            alt={alt ?? ""}
            draggable={false}
            data-drag-handle
            onError={() => attachmentId && status.kind === "ready" && store.refresh(attachmentId)}
            className={cn("block h-auto w-full rounded-md", status.kind !== "ready" && "opacity-60")}
          />
        ) : (
          <div className="flex min-h-24 items-center rounded-md border border-dashed bg-muted/40 p-4" data-drag-handle />
        )}
        {status.kind !== "ready" && (
          <AttachmentStateMessage
            status={status}
            onRemove={deleteNode}
            className={cn(
              "flex flex-wrap items-center gap-3 text-sm",
              src ? "absolute inset-x-2 bottom-2 rounded-md bg-background/90 px-3 py-2 shadow" : "absolute inset-0 px-4",
            )}
          />
        )}
        {selected && src && editor.isEditable && (
          <>
            {handle("left")}
            {handle("right")}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
