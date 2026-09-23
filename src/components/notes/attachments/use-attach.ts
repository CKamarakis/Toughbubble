"use client";

import type { Editor } from "@tiptap/core";
import { Fragment, type Node as PMNode, Slice } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { copyAttachments, finishAttachment, startAttachment } from "@/lib/attachments/actions";
import { prepareFile } from "@/lib/attachments/prepare-image";
import { isInlineImage, MAX_ATTACHMENT_BYTES, tooLargeMessage } from "@/lib/attachments/rules";
import { createClient } from "@/lib/supabase/client";
import type { AttachmentStore } from "./store";

// Adding files to a note (attachments design D3, D7): prepare, record, insert
// at the cursor, upload straight to Storage, then mark ready.

const isAttachmentNode = (node: PMNode) => node.type.name === "image" || node.type.name === "fileAttachment";

async function uploadFile(store: AttachmentStore, id: string, path: string, file: File, preview?: string) {
  store.setUpload(id, { phase: "uploading", preview });
  const bucket = createClient().storage.from("attachments");
  const up = await bucket
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false })
    .catch((error: Error) => ({ error }));
  // "Already exists" means an earlier try got through; finishing checks the file.
  const uploaded = !up.error || /exists|duplicate/i.test(up.error.message);
  const finished = uploaded ? await finishAttachment(id).catch(() => null) : null;
  if (finished?.status === "ready") {
    store.setLink(id, finished.link);
    store.setUpload(id, null);
  } else {
    store.setUpload(id, { phase: "failed", preview, retry: () => void uploadFile(store, id, path, file, preview) });
  }
}

/**
 * Moves the cursor from a just-inserted file to the text after it, adding an
 * empty paragraph when the file is last, so typing doesn't replace the file.
 */
function placeCursorAfter(editor: Editor) {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) return;
  const after = selection.to;
  const tr = editor.state.tr;
  if (!tr.doc.resolve(after).nodeAfter?.isTextblock) {
    tr.insert(after, editor.schema.nodes.paragraph.create());
  }
  editor.view.dispatch(tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView());
}

/** Returns attachFiles(files, at?): prepares, inserts, and uploads each file in order. */
export function useAttachFiles(editor: Editor | null, store: AttachmentStore) {
  // Closing the tab mid-upload asks first (spec: Upload progress and failure).
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (store.uploading === 0) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [store]);

  return useCallback(
    async (files: File[], at?: number) => {
      if (!editor || files.length === 0) return;
      if (at != null) editor.commands.setTextSelection(at);
      for (const original of files) {
        const { file, width, height } = await prepareFile(original);
        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast.error(tooLargeMessage(original.name));
          continue;
        }
        const started = await startAttachment(store.itemId, {
          name: file.name,
          type: file.type,
          size: file.size,
          width,
          height,
        }).catch(() => null);
        if (!started || started.status !== "started") {
          toast.error(
            started?.status === "too-large"
              ? tooLargeMessage(original.name)
              : started?.status === "error"
                ? started.error
                : `Couldn't attach "${original.name}".`,
          );
          continue;
        }
        if (editor.isDestroyed) return;
        const image = isInlineImage(started.mimeType);
        const preview = image ? URL.createObjectURL(file) : undefined;
        store.setUpload(started.id, { phase: "uploading", preview });
        // After the selection: an inserted file stays selected, and inserting
        // over it would replace it with the next one.
        editor
          .chain()
          .focus()
          .insertContentAt(editor.state.selection.to,
            image
              ? { type: "image", attrs: { attachmentId: started.id, align: "left" } }
              : {
                  type: "fileAttachment",
                  attrs: { attachmentId: started.id, name: started.name, mimeType: started.mimeType, size: file.size },
                },
          )
          .run();
        placeCursorAfter(editor);
        void uploadFile(store, started.id, started.path, file, preview);
      }
    },
    [editor, store],
  );
}

/** Rebuilds a fragment, changing attachment node attributes with `fn`. */
function mapAttachments(fragment: Fragment, fn: (node: PMNode) => Record<string, unknown> | null): Fragment {
  const nodes: PMNode[] = [];
  fragment.forEach((node) => {
    if (isAttachmentNode(node)) {
      const attrs = fn(node);
      nodes.push(attrs ? node.type.create({ ...node.attrs, ...attrs }, node.content, node.marks) : node);
    } else {
      // Leaves (text included) have no content to walk.
      nodes.push(node.isLeaf ? node : node.copy(mapAttachments(node.content, fn)));
    }
  });
  return Fragment.from(nodes);
}

/**
 * For pasted or dropped content: attachments that belong to another note are
 * marked as copies in flight (their id moves to `copyOf`). Returns the new
 * slice and the source ids to copy.
 */
export function markForeignAttachments(slice: Slice, store: AttachmentStore): { slice: Slice; sources: string[] } {
  const sources = new Set<string>();
  const content = mapAttachments(slice.content, (node) => {
    const id = node.attrs.attachmentId as string | null;
    if (!id || store.owns(id)) return null;
    sources.add(id);
    return { attachmentId: null, copyOf: id };
  });
  if (sources.size === 0) return { slice, sources: [] };
  return { slice: new Slice(content, slice.openStart, slice.openEnd), sources: [...sources] };
}

/** Copies attachments from other notes and points the pasted nodes at the copies. */
export async function copyForeignAttachments(editor: Editor, store: AttachmentStore, sources: string[]) {
  store.setCopying(sources, true);
  const copied = await copyAttachments(store.itemId, sources).catch(() => null);
  store.setCopying(sources, false);
  if (!copied || editor.isDestroyed) return;
  const tr = editor.state.tr;
  editor.state.doc.descendants((node, pos) => {
    if (!isAttachmentNode(node)) return;
    const from = node.attrs.copyOf as string | null;
    const id = from ? copied[from] : undefined;
    if (id) tr.setNodeMarkup(pos, undefined, { ...node.attrs, attachmentId: id, copyOf: null });
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}
