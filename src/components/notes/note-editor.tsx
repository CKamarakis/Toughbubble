"use client";

import type { JSONContent } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { noteExtensions } from "@/lib/notes/extensions";
import { useSettings } from "@/components/workspace/settings-context";
import { focusLinkCard, LinkCard, openLink } from "./link-card";
import { NoteToolbar } from "./note-toolbar";
import { useNoteAutosave } from "./use-note-autosave";
import { FileCardView } from "./attachments/file-card-view";
import { ImageView } from "./attachments/image-view";
import { AttachmentMenu, focusAttachmentMenu } from "./attachments/attachment-menu";
import { AttachmentStore, AttachmentStoreContext } from "./attachments/store";
import { copyForeignAttachments, markForeignAttachments, useAttachFiles } from "./attachments/use-attach";

/** Files from a paste, unless it also carries text (cells copied from a spreadsheet come with a picture of them). */
function pastedFiles(event: ClipboardEvent): File[] {
  const data = event.clipboardData;
  if (!data || data.files.length === 0 || data.getData("text/plain").trim() !== "") return [];
  return [...data.files];
}

/** The note body: toolbar, editor, autosave, and the conflict banner. */
export function NoteEditor({ itemId, initial }: { itemId: string; initial: { body: JSONContent; version: number; links?: Record<string, string> } }) {
  const { editorVars } = useSettings();
  const [linkOpen, setLinkOpen] = useState(false);
  const extensions = useMemo(
    () =>
      noteExtensions({
        views: { image: ReactNodeViewRenderer(ImageView), fileAttachment: ReactNodeViewRenderer(FileCardView) },
      }),
    [],
  );
  const [store] = useState(() => new AttachmentStore(itemId, initial.links ?? {}));
  useEffect(() => store.start(), [store]);
  // The editor's handlers are created once; they reach the latest callbacks through refs.
  const attachRef = useRef<(files: File[], at?: number) => void>(() => {});
  const copyRef = useRef<(sources: string[]) => void>(() => {});

  const editor = useEditor({
    extensions,
    content: initial.body,
    // Server-rendered React: mount on the client to avoid a hydration mismatch.
    immediatelyRender: false,
    editorProps: {
      attributes: { "aria-label": "Note body", "aria-multiline": "true", role: "textbox" },
      // A plain click opens a link in a new tab (design D10); a drag that
      // selected text doesn't. The link card is the way to edit it.
      handleClick: (view, _pos, event) => {
        if (event.button !== 0 || !view.state.selection.empty) return false;
        const a = (event.target as Element | null)?.closest?.("a[href]");
        const href = a && view.dom.contains(a) ? a.getAttribute("href") : null;
        if (!href) return false;
        openLink(href);
        return true;
      },
      handlePaste: (_view, event) => {
        const files = pastedFiles(event);
        if (files.length === 0) return false;
        event.preventDefault();
        attachRef.current(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = event.dataTransfer?.files;
        if (moved || !files || files.length === 0) return false;
        event.preventDefault();
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        attachRef.current([...files], at);
        return true;
      },
      // Attachments pasted or dropped from another note are copied into this one (design D7).
      transformPasted: (slice) => {
        const marked = markForeignAttachments(slice, store);
        if (marked.sources.length > 0) setTimeout(() => copyRef.current(marked.sources), 0);
        return marked.slice;
      },
      handleKeyDown: (view, event) => {
        // Tab from the cursor in a link goes to its card (design D10).
        if (event.key === "Tab" && !event.shiftKey && view.state.selection.empty && focusLinkCard()) {
          event.preventDefault();
          return true;
        }
        // Tab from a selected image or file card goes to its menu (design D9).
        if (event.key === "Tab" && !event.shiftKey && view.state.selection instanceof NodeSelection) {
          const name = view.state.selection.node.type.name;
          if ((name === "image" || name === "fileAttachment") && focusAttachmentMenu()) {
            event.preventDefault();
            return true;
          }
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          setLinkOpen(true);
          return true;
        }
        return false;
      },
    },
  });

  const autosave = useNoteAutosave(editor, itemId, initial.version);
  const attachFiles = useAttachFiles(editor, store);
  useEffect(() => {
    attachRef.current = (files, at) => void attachFiles(files, at);
    copyRef.current = (sources) => {
      if (editor) void copyForeignAttachments(editor, store, sources);
    };
  }, [attachFiles, editor, store]);

  return (
    <AttachmentStoreContext value={store}>
      <div className="flex flex-col gap-4">
        {editor && (
          <NoteToolbar
            editor={editor}
            status={autosave.status}
            linkOpen={linkOpen}
            onLinkOpenChange={setLinkOpen}
            onAttach={(files) => void attachFiles(files)}
          />
        )}
        {autosave.state.phase === "conflict" && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-foreground"
          >
            <span>
              <strong>This note was changed in another tab or device.</strong> Saving is paused until you choose.
            </span>
            <span className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void autosave.loadLatest()}>
                Load latest
              </Button>
              <Button size="sm" onClick={autosave.keepMine}>
                Keep mine
              </Button>
            </span>
          </div>
        )}
        <EditorContent editor={editor} className="tb-editor" style={editorVars} />
        {editor && <AttachmentMenu editor={editor} />}
        {editor && <LinkCard editor={editor} hidden={linkOpen} onEdit={() => setLinkOpen(true)} />}
      </div>
    </AttachmentStoreContext>
  );
}
