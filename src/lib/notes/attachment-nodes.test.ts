// @vitest-environment happy-dom
import { getSchema, type JSONContent } from "@tiptap/core";
import { DOMParser as PMDOMParser, DOMSerializer, type Node as PMNode } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";
import { noteExtensions } from "./extensions";
import { attachmentIdsIn, validateNoteBody, withAttachmentIds } from "./validate";

const schema = getSchema(noteExtensions());
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const DOC: JSONContent = {
  type: "doc",
  attrs: { bodySize: null },
  content: [
    { type: "image", attrs: { attachmentId: A, copyOf: null, alt: "Sales chart", width: 300, align: "center" } },
    { type: "fileAttachment", attrs: { attachmentId: B, copyOf: null, name: "report.pdf", mimeType: "application/pdf", size: 1234 } },
    { type: "paragraph", attrs: { textAlign: null } },
  ],
};

const parseHtml = (html: string) => {
  const el = document.createElement("div");
  el.innerHTML = html;
  return PMDOMParser.fromSchema(schema).parse(el);
};

const types = (doc: PMNode) => {
  const found: string[] = [];
  doc.descendants((n) => {
    found.push(n.type.name);
  });
  return found;
};

describe("attachment nodes", () => {
  it("round-trips a document with an image and a file card", () => {
    const result = validateNoteBody(DOC);
    expect(result).toEqual({ ok: true, doc: DOC });
  });

  it("round-trips through clipboard HTML with every attribute", () => {
    const doc = schema.nodeFromJSON(DOC);
    const el = document.createElement("div");
    el.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
    expect(el.innerHTML).not.toContain("src=");
    expect(parseHtml(el.innerHTML).toJSON()).toEqual(DOC);
  });

  it("drops images from pasted web page HTML", () => {
    const doc = parseHtml(
      '<h2>Title</h2><p><b>bold</b></p><img src="https://example.com/cat.png" alt="cat"><img src="data:image/png;base64,AAAA">',
    );
    expect(types(doc)).not.toContain("image");
    expect(doc.textContent).toBe("Titlebold");
  });

  it("keeps the source id of a copy in flight", () => {
    const doc = parseHtml(`<img data-copy-of="${A}" width="10" data-align="bogus">`);
    expect(doc.firstChild?.attrs).toMatchObject({ attachmentId: null, copyOf: A, width: 48, align: "left" });
  });
});

describe("attachment validation", () => {
  const withNode = (node: JSONContent) => ({ type: "doc", content: [node] });
  const image = (attrs: Record<string, unknown>) => withNode({ type: "image", attrs: { attachmentId: A, ...attrs } });

  it("rejects an image with only an outside address", () => {
    expect(validateNoteBody(withNode({ type: "image", attrs: { src: "https://example.com/x.png" } })).ok).toBe(false);
  });

  it("rejects ids that aren't uuids, and nodes naming no attachment", () => {
    expect(validateNoteBody(image({ attachmentId: "../../etc" })).ok).toBe(false);
    expect(validateNoteBody(image({ attachmentId: null })).ok).toBe(false);
    expect(validateNoteBody(image({ attachmentId: null, copyOf: B })).ok).toBe(true);
    expect(validateNoteBody(withNode({ type: "fileAttachment", attrs: { attachmentId: "x" } })).ok).toBe(false);
  });

  it("rejects image sizes and alignments out of range", () => {
    expect(validateNoteBody(image({ width: 47 })).ok).toBe(false);
    expect(validateNoteBody(image({ width: 2001 })).ok).toBe(false);
    expect(validateNoteBody(image({ width: 48 })).ok).toBe(true);
    expect(validateNoteBody(image({ align: "justify" })).ok).toBe(false);
    expect(validateNoteBody(image({ alt: "x".repeat(501) })).ok).toBe(false);
  });

  it("rejects file cards with invalid details", () => {
    const file = (attrs: Record<string, unknown>) => withNode({ type: "fileAttachment", attrs: { attachmentId: B, ...attrs } });
    expect(validateNoteBody(file({ size: -1 })).ok).toBe(false);
    expect(validateNoteBody(file({ name: "x".repeat(201) })).ok).toBe(false);
    expect(validateNoteBody(file({ name: "a.pdf", size: 10, mimeType: "application/pdf" })).ok).toBe(true);
  });

  it("lists the attachment ids a body refers to, once each, without copies in flight", () => {
    const doc = { type: "doc", content: [...DOC.content!, DOC.content![0], { type: "image", attrs: { copyOf: A } }] };
    expect(attachmentIdsIn(doc).sort()).toEqual([A, B]);
  });
});

describe("rewriting attachment ids for a copied note", () => {
  const C = "33333333-3333-4333-8333-333333333333";
  const D = "44444444-4444-4444-8444-444444444444";

  it("replaces each id with its copy and leaves the original body untouched", () => {
    const before = JSON.stringify(DOC);
    const out = withAttachmentIds(DOC, { [A]: C, [B]: D });
    expect(out.content![0].attrs).toMatchObject({ attachmentId: C, alt: "Sales chart", width: 300 });
    expect(out.content![1].attrs).toMatchObject({ attachmentId: D, name: "report.pdf" });
    expect(out.content![2]).toEqual(DOC.content![2]);
    expect(JSON.stringify(DOC)).toBe(before);
    expect(validateNoteBody(out).ok).toBe(true);
  });

  it("drops nodes whose attachment was not copied", () => {
    const out = withAttachmentIds(DOC, { [B]: D });
    expect(out.content!.map((n) => n.type)).toEqual(["fileAttachment", "paragraph"]);
  });

  it("keeps a container valid when its only node is dropped", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "blockquote", content: [{ type: "image", attrs: { attachmentId: A } }] }],
    };
    const out = withAttachmentIds(doc, {});
    expect(out.content).toEqual([{ type: "blockquote", content: [{ type: "paragraph" }] }]);
    expect(validateNoteBody(out).ok).toBe(true);
    expect(withAttachmentIds({ type: "doc", content: [DOC.content![0]] }, {}).content).toEqual([{ type: "paragraph" }]);
  });

  it("leaves copies in flight as they are", () => {
    const inFlight = { type: "image", attrs: { attachmentId: null, copyOf: A } };
    expect(withAttachmentIds({ type: "doc", content: [inFlight] }, {}).content).toEqual([inFlight]);
  });
});
