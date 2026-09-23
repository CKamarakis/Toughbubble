"use client";

import { getMarkRange, type Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { ExternalLink, Pencil, Unlink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The card under a link (attachments design D10): its address with Open,
// Edit, and Remove. Shown while the pointer is over a link or the card, and
// while the cursor is in a link, so links stay editable now that a click
// opens them.

type LinkInfo = { from: number; to: number; href: string };

export const LINK_CARD_ID = "tb-link-card";

/** Moves focus into the card (Tab while the cursor is in a link). */
export function focusLinkCard() {
  const first = document.querySelector<HTMLElement>(`#${LINK_CARD_ID} button`);
  if (!first) return false;
  first.focus();
  return true;
}

/** The link around a document position, if any. */
function linkAt(editor: Editor, pos: number): LinkInfo | null {
  const type = editor.schema.marks.link;
  const $pos = editor.state.doc.resolve(pos);
  const range = getMarkRange($pos, type);
  if (!range) return null;
  const mark = editor.state.doc.nodeAt(range.from)?.marks.find((m) => m.type === type);
  return mark ? { from: range.from, to: range.to, href: String(mark.attrs.href) } : null;
}

export const openLink = (href: string) => window.open(href, "_blank", "noopener,noreferrer");

export function LinkCard({ editor, hidden, onEdit }: { editor: Editor; hidden: boolean; onEdit: () => void }) {
  const [hovered, setHovered] = useState<LinkInfo | null>(null);
  const [pinned, setPinned] = useState<LinkInfo | null>(null);
  const [, setTick] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // The link under the cursor, when the editor has focus and nothing is selected.
  const atCursor = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { selection } = e.state;
      if (!e.isFocused || !selection.empty || !e.isActive("link")) return null;
      const info = linkAt(e, selection.from);
      return info ? `${info.from}:${info.to}:${info.href}` : null;
    },
  });

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }, []);
  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimer.current = setTimeout(() => setHovered(null), 250);
  }, [cancelHide]);

  useEffect(() => {
    const dom = editor.view.dom;
    const over = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || !dom.contains(a)) return;
      cancelHide();
      let pos: number;
      try {
        pos = editor.view.posAtDOM(a, 0);
      } catch {
        return;
      }
      const info = linkAt(editor, pos) ?? linkAt(editor, pos + 1);
      if (info) setHovered(info);
    };
    const out = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.("a[href]")) scheduleHide();
    };
    // Positions are computed on render; re-render on scroll and resize.
    const reposition = () => setTick((t) => t + 1);
    dom.addEventListener("mouseover", over);
    dom.addEventListener("mouseout", out);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      dom.removeEventListener("mouseover", over);
      dom.removeEventListener("mouseout", out);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      cancelHide();
    };
  }, [editor, cancelHide, scheduleHide]);

  const cursorLink: LinkInfo | null = atCursor
    ? (() => {
        const [from, to, ...rest] = atCursor.split(":");
        return { from: Number(from), to: Number(to), href: rest.join(":") };
      })()
    : null;
  const shown = pinned ?? hovered ?? cursorLink;
  if (hidden || !shown || editor.isDestroyed || shown.to > editor.state.doc.content.size) return null;

  const start = editor.view.coordsAtPos(shown.from);
  const done = () => {
    setPinned(null);
    setHovered(null);
  };
  const select = () => editor.chain().focus().setTextSelection({ from: shown.from, to: shown.to });

  const button = (label: string, Icon: typeof Pencil, onClick: () => void) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the editor's selection
      onClick={onClick}
      className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );

  return createPortal(
    <div
      id={LINK_CARD_ID}
      ref={cardRef}
      role="group"
      aria-label="Link"
      onMouseEnter={cancelHide}
      onMouseLeave={scheduleHide}
      onFocus={() => setPinned(shown)}
      onBlur={(e) => {
        if (!cardRef.current?.contains(e.relatedTarget as Node)) setPinned(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          done();
          editor.commands.focus();
        }
      }}
      style={{ position: "fixed", left: start.left, top: start.bottom + 6 }}
      className="z-50 flex max-w-sm items-center gap-1 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
    >
      <span className="min-w-0 truncate px-1.5 text-xs text-muted-foreground" title={shown.href}>
        {shown.href}
      </span>
      {button("Open", ExternalLink, () => openLink(shown.href))}
      {button("Edit", Pencil, () => {
        select().run();
        done();
        onEdit();
      })}
      {button("Remove", Unlink, () => {
        select().unsetLink().run();
        done();
      })}
    </div>,
    document.body,
  );
}
