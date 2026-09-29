import type { AnyExtension } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Link from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
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
  ];
}
