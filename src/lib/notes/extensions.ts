import type { AnyExtension } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Link from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { type AttachmentViews, fileAttachment, noteImage } from "./attachment-nodes";
import { parseFontSize, toCssSize } from "./font-size";
import { isAllowedHref } from "./links";

// The one extension list for notes, shared by the editor (client) and the
// save validation (server) so both agree on what a note may contain (design D1/D2).

export const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;
export const ALIGNMENTS = ["left", "center", "right", "justify"] as const;

/**
 * Links end at their last character: text typed after a link is plain.
 * Tiptap makes the mark inclusive whenever autolink is on; autolink still
 * detects typed and pasted addresses through its own plugin
 * (editor-link-end-and-note-size D1).
 */
const NoteLink = Link.extend({ inclusive: () => false });

/**
 * The note's own size for body text (paragraphs, lists, quotes), or null for
 * the Settings size. Kept in the body JSON so it saves and versions with the
 * note (editor-link-end-and-note-size D2).
 */
const NoteDocument = Document.extend({
  addAttributes() {
    return { bodySize: { default: null } };
  },
});

/** Font size limited to 8–96 px, also for pasted inline styles (design D2). */
const SafeFontSize = FontSize.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const px = parseFontSize(element.style.fontSize);
              return px ? toCssSize(px) : null;
            },
            renderHTML: (attributes: { fontSize?: string | null }) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
          },
        },
      },
    ];
  },
});

/** Limits on table cells, shared with the save validation (tables-in-notes D5). */
export const MAX_CELL_SPAN = 100;
export const MIN_COLUMN_WIDTH = 25;
export const MAX_COLUMN_WIDTH = 5000;
export const CELL_ALIGNMENTS = ["left", "center", "right"] as const;

/**
 * What a table cell may hold: every text block, but no images, file cards or
 * tables (tables-in-notes D2).
 */
const CELL_CONTENT = "(paragraph | heading | bulletList | orderedList | taskList | blockquote | codeBlock | horizontalRule)+";

const clampSpan = (value: string | null) => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), MAX_CELL_SPAN) : 1;
};
const clampWidth = (n: number) => Math.min(Math.max(Math.round(n), MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH);

/** Pasted spans and widths are brought into range, so a paste never makes a note that can't be saved. */
function safeCellAttributes<T extends Record<string, unknown>>(attributes: T) {
  const colwidth = attributes.colwidth as { parseHTML?: (el: HTMLElement) => unknown } | undefined;
  return {
    ...attributes,
    colspan: { default: 1, parseHTML: (el: HTMLElement) => clampSpan(el.getAttribute("colspan")) },
    rowspan: { default: 1, parseHTML: (el: HTMLElement) => clampSpan(el.getAttribute("rowspan")) },
    colwidth: {
      ...colwidth,
      parseHTML: (el: HTMLElement) => {
        const widths = colwidth?.parseHTML?.(el);
        if (!Array.isArray(widths)) return null;
        const span = clampSpan(el.getAttribute("colspan"));
        const clean = widths.slice(0, span).map((w) => (Number.isFinite(w) && w > 0 ? clampWidth(w) : 0));
        return clean.length === span && clean.every((w) => w > 0) ? clean : null;
      },
    },
  };
}

const NoteTableCell = TableCell.extend({
  content: CELL_CONTENT,
  addAttributes() {
    return safeCellAttributes(this.parent?.() ?? {});
  },
});
const NoteTableHeader = TableHeader.extend({
  content: CELL_CONTENT,
  addAttributes() {
    return safeCellAttributes(this.parent?.() ?? {});
  },
});

/**
 * `views` adds the editor's React views for attachments; the server leaves
 * them out, since validation only needs the schema.
 */
export function noteExtensions({
  placeholder = "Start writing…",
  views = {},
}: { placeholder?: string; views?: AttachmentViews } = {}): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [...HEADING_LEVELS] },
      document: false,
      link: false,
    }),
    NoteDocument,
    NoteLink.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: "https",
      protocols: ["mailto"],
      // Applies to typed, pasted, and auto-detected links.
      isAllowedUri: (url, ctx) => ctx.defaultValidate(url) && isAllowedHref(url),
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TextAlign.configure({ types: ["heading", "paragraph"], alignments: [...ALIGNMENTS] }),
    TextStyle,
    SafeFontSize,
    Placeholder.configure({ placeholder }),
    noteImage(views.image),
    fileAttachment(views.fileAttachment),
    // Column widths are dragged and saved in each cell's `colwidth` (tables-in-notes D4).
    Table.configure({ resizable: true, cellMinWidth: MIN_COLUMN_WIDTH }),
    TableRow,
    NoteTableHeader,
    NoteTableCell,
  ];
}
