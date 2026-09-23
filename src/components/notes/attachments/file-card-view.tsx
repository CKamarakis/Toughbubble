"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Download, FileText } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { getDownloadLink } from "@/lib/attachments/actions";
import { formatFileSize } from "@/lib/attachments/rules";
import { cn } from "@/lib/utils";
import { AttachmentStateMessage } from "./attachment-state";
import { useAttachmentStore } from "./store";

/** "PDF", "ZIP", … from the file name, else from the MIME type. */
function typeLabel(name: string | null, mimeType: string | null) {
  const ext = name?.includes(".") ? name.split(".").pop() : null;
  if (ext && ext.length <= 5) return ext.toUpperCase();
  const sub = mimeType?.split("/")[1]?.split(/[+.;]/)[0];
  return sub ? sub.toUpperCase() : "File";
}

/** Starts a browser download under the file's original name. */
export async function downloadAttachment(id: string) {
  const link = await getDownloadLink(id).catch(() => null);
  if (!link) {
    toast.error("Couldn't download this file. Try again.");
    return;
  }
  const a = document.createElement("a");
  a.href = link;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** A non-image file in the note (attachments design D4): name, type, size; opening it downloads it. */
export function FileCardView({ node, deleteNode, selected }: NodeViewProps) {
  const store = useAttachmentStore();
  const { attachmentId, copyOf, name, mimeType, size } = node.attrs as {
    attachmentId: string | null;
    copyOf: string | null;
    name: string | null;
    mimeType: string | null;
    size: number | null;
  };

  useEffect(() => {
    if (attachmentId) store.ensure(attachmentId);
  }, [attachmentId, store]);

  const status = store.status(attachmentId, copyOf);
  const ready = status.kind === "ready" && attachmentId;
  const details = [typeLabel(name, mimeType), size != null ? formatFileSize(size) : null].filter(Boolean).join(" · ");

  return (
    <NodeViewWrapper className="my-3">
      <div
        data-drag-handle
        className={cn(
          "flex max-w-md items-center gap-3 rounded-lg border bg-card px-3 py-2",
          selected && "outline-2 outline-offset-2 outline-ring",
        )}
      >
        <FileText className="size-8 flex-none text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          {ready ? (
            <button
              type="button"
              contentEditable={false}
              onClick={() => void downloadAttachment(attachmentId)}
              className="block max-w-full truncate text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              title={`Download ${name ?? "file"}`}
            >
              {name ?? "file"}
            </button>
          ) : (
            <span className="block truncate font-medium">{name ?? "file"}</span>
          )}
          <span className="block text-xs text-muted-foreground">{details}</span>
          <AttachmentStateMessage status={status} onRemove={deleteNode} className="mt-1 flex flex-wrap items-center gap-3 text-sm" />
        </div>
        {ready && (
          <button
            type="button"
            contentEditable={false}
            aria-label={`Download ${name ?? "file"}`}
            onClick={() => void downloadAttachment(attachmentId)}
            className="flex size-8 flex-none items-center justify-center rounded-md hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Download className="size-4" />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}
