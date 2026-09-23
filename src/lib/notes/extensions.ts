import type { AnyExtension } from "@tiptap/core";
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
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        protocols: ["mailto"],
        // Applies to typed, pasted, and auto-detected links.
        isAllowedUri: (url, ctx) => ctx.defaultValidate(url) && isAllowedHref(url),
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      },
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
