"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { noteExtensions } from "@/lib/notes/extensions";
import { useSettings } from "@/components/workspace/settings-context";
import { NoteToolbar } from "./note-toolbar";
import { useNoteAutosave } from "./use-note-autosave";

/** The note body: toolbar, editor, autosave, and the conflict banner. */
export function NoteEditor({ itemId, initial }: { itemId: string; initial: { body: JSONContent; version: number } }) {
  const { editorVars } = useSettings();
  const [linkOpen, setLinkOpen] = useState(false);
  const extensions = useMemo(() => noteExtensions(), []);

  const editor = useEditor({
    extensions,
    content: initial.body,
    // Server-rendered React: mount on the client to avoid a hydration mismatch.
    immediatelyRender: false,
    editorProps: {
      attributes: { "aria-label": "Note body", "aria-multiline": "true", role: "textbox" },
      handleKeyDown: (_view, event) => {
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

  return (
    <div className="flex flex-col gap-4">
      {editor && (
        <NoteToolbar editor={editor} status={autosave.status} linkOpen={linkOpen} onLinkOpenChange={setLinkOpen} />
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
    </div>
  );
}
