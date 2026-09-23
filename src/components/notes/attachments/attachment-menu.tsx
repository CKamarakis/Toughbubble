"use client";

import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { AlignCenter, AlignLeft, AlignRight, Download, ExternalLink, Text, Trash2, type LucideIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { IMAGE_ALIGNMENTS, type ImageAlign } from "@/lib/notes/attachment-nodes";
import { cn } from "@/lib/utils";
import { downloadAttachment } from "./file-card-view";
import { useAttachmentStore } from "./store";

const ALIGN: Record<ImageAlign, { label: string; Icon: LucideIcon }> = {
  left: { label: "Align left", Icon: AlignLeft },
  center: { label: "Center", Icon: AlignCenter },
  right: { label: "Align right", Icon: AlignRight },
};

/** The attachment node under a node selection, if any. */
function selectedAttachment(editor: Editor) {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) return null;
  const { node } = selection;
  return node.type.name === "image" || node.type.name === "fileAttachment" ? node : null;
}

export const ATTACHMENT_MENU_ID = "tb-attachment-menu";

/** Moves focus into the menu (Tab while an image or file is selected). */
export function focusAttachmentMenu() {
  const first = document.querySelector<HTMLElement>(`#${ATTACHMENT_MENU_ID} [data-menu-item]`);
  if (!first) return false;
  first.focus();
  return true;
}

/**
 * Menu over a selected image (align, alt text, open full size, download,
 * remove) or file card (download, remove); attachments design D9. Arrow keys
 * move between its controls; Escape returns to the note.
 */
export function AttachmentMenu({ editor }: { editor: Editor }) {
  const store = useAttachmentStore();
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const node = selectedAttachment(e);
      return {
        kind: node?.type.name ?? null,
        id: (node?.attrs.attachmentId as string | null) ?? null,
        align: (node?.attrs.align as ImageAlign | undefined) ?? "left",
        alt: (node?.attrs.alt as string | null) ?? "",
      };
    },
  });
  const [editingAlt, setEditingAlt] = useState(false);
  const [altDraft, setAltDraft] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const update = (attrs: Record<string, unknown>) =>
    editor.chain().focus().updateAttributes(s.kind ?? "image", attrs).run();

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setEditingAlt(false);
      editor.commands.focus();
      return;
    }
    if (editingAlt || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  };

  const button = (label: string, Icon: LucideIcon, onClick: () => void, pressed?: boolean) => (
    <button
      key={label}
      type="button"
      data-menu-item
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        pressed && "bg-accent",
      )}
    >
      <Icon className="size-4" />
    </button>
  );

  const openFull = async () => {
    if (!s.id) return;
    // Opened before the await so the browser doesn't treat it as a pop-up.
    const tab = window.open("about:blank", "_blank");
    const link = await store.freshLink(s.id);
    if (link && tab) {
      tab.opener = null;
      tab.location.href = link;
    } else {
      tab?.close();
      toast.error("Couldn't open this image. Try again.");
    }
  };

  const ready = !!s.id && store.status(s.id, null).kind === "ready";
  const divider = <span aria-hidden className="mx-1 h-5 w-px bg-border" />;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="attachmentMenu"
      shouldShow={({ editor: e }) => selectedAttachment(e) !== null}
      options={{ placement: "top" }}
    >
      <div
        id={ATTACHMENT_MENU_ID}
        ref={menuRef}
        role="toolbar"
        aria-label={s.kind === "image" ? "Image" : "File"}
        onKeyDown={onKeyDown}
        className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
      >
        {editingAlt ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              update({ alt: altDraft.trim().slice(0, 500) || null });
              setEditingAlt(false);
            }}
          >
            <input
              autoFocus
              value={altDraft}
              onChange={(e) => setAltDraft(e.target.value)}
              maxLength={500}
              placeholder="Describe the image"
              aria-label="Alt text"
              className="h-8 w-64 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button type="submit" className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
              Save
            </button>
          </form>
        ) : (
          <>
            {s.kind === "image" && (
              <>
                {IMAGE_ALIGNMENTS.map((a) => button(ALIGN[a].label, ALIGN[a].Icon, () => update({ align: a }), s.align === a))}
                {divider}
                {button("Alt text", Text, () => {
                  setAltDraft(s.alt);
                  setEditingAlt(true);
                })}
                {ready && button("Open full size", ExternalLink, () => void openFull())}
              </>
            )}
            {ready && button("Download", Download, () => s.id && void downloadAttachment(s.id))}
            {divider}
            {button("Remove", Trash2, () => editor.chain().focus().deleteSelection().run())}
          </>
        )}
      </div>
    </BubbleMenu>
  );
}
