import { mergeAttributes, Node, type NodeViewRenderer } from "@tiptap/core";
import Image from "@tiptap/extension-image";

// Note attachments in the body (attachments design D4). Nodes store the
// attachment's id, never a URL: the editor resolves signed links at render
// time, and pasted web images (plain <img src>) match no parse rule, so they
// are dropped. `copyOf` holds the source id while a copy from another note
// is in flight (design D7).

export const IMAGE_ALIGNMENTS = ["left", "center", "right"] as const;
export type ImageAlign = (typeof IMAGE_ALIGNMENTS)[number];
export const MIN_IMAGE_WIDTH = 48;
export const MAX_IMAGE_WIDTH = 2000;

const idAttribute = (name: string, dataName: string) => ({
  [name]: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute(dataName),
    renderHTML: (attrs: Record<string, unknown>) => (attrs[name] ? { [dataName]: attrs[name] } : {}),
  },
});

const attachmentIds = () => ({
  ...idAttribute("attachmentId", "data-attachment-id"),
  ...idAttribute("copyOf", "data-copy-of"),
});

const toWidth = (v: string | null) => {
  const n = v == null ? NaN : Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(MAX_IMAGE_WIDTH, Math.max(MIN_IMAGE_WIDTH, n)) : null;
};

export type AttachmentViews = { image?: NodeViewRenderer; fileAttachment?: NodeViewRenderer };

/** Images shown in the text. Extends Tiptap's Image for its block/draggable behaviour. */
export const noteImage = (view?: NodeViewRenderer) =>
  Image.extend({
    addAttributes() {
      return {
        ...attachmentIds(),
        alt: {
          default: null,
          parseHTML: (el: HTMLElement) => el.getAttribute("alt") || null,
          renderHTML: (attrs: { alt?: string | null }) => (attrs.alt ? { alt: attrs.alt } : {}),
        },
        width: {
          default: null,
          parseHTML: (el: HTMLElement) => toWidth(el.getAttribute("width")),
          renderHTML: (attrs: { width?: number | null }) => (attrs.width ? { width: attrs.width } : {}),
        },
        align: {
          default: "left",
          parseHTML: (el: HTMLElement) => {
            const align = el.getAttribute("data-align");
            return (IMAGE_ALIGNMENTS as readonly string[]).includes(align ?? "") ? align : "left";
          },
          renderHTML: (attrs: { align?: string }) => ({ "data-align": attrs.align ?? "left" }),
        },
      };
    },
    parseHTML() {
      return [{ tag: "img[data-attachment-id]" }, { tag: "img[data-copy-of]" }];
    },
    renderHTML({ HTMLAttributes }) {
      return ["img", mergeAttributes(HTMLAttributes)];
    },
    // No Markdown image syntax: images only come from attachments.
    addInputRules() {
      return [];
    },
    addNodeView() {
      return view ?? null;
    },
  }).configure({ inline: false, allowBase64: false, resize: false });

/** Any other file, shown as a card that downloads the file. */
export const fileAttachment = (view?: NodeViewRenderer) =>
  Node.create({
    name: "fileAttachment",
    group: "block",
    atom: true,
    draggable: true,
    selectable: true,
    addAttributes() {
      const data = (name: string, dataName: string, parse: (v: string | null) => unknown = (v) => v) => ({
        [name]: {
          default: null,
          parseHTML: (el: HTMLElement) => parse(el.getAttribute(dataName)),
          renderHTML: (attrs: Record<string, unknown>) => (attrs[name] != null ? { [dataName]: String(attrs[name]) } : {}),
        },
      });
      return {
        ...attachmentIds(),
        ...data("name", "data-name"),
        ...data("mimeType", "data-mime-type"),
        ...data("size", "data-size", (v) => {
          const n = v == null ? NaN : Number(v);
          return Number.isInteger(n) && n >= 0 ? n : null;
        }),
      };
    },
    parseHTML() {
      return [{ tag: "div[data-file-attachment][data-attachment-id]" }, { tag: "div[data-file-attachment][data-copy-of]" }];
    },
    renderHTML({ HTMLAttributes, node }) {
      return ["div", mergeAttributes({ "data-file-attachment": "" }, HTMLAttributes), node.attrs.name ?? "file"];
    },
    addNodeView() {
      return view ?? null;
    },
  });
