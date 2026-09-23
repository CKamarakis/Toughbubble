import { describe, expect, it } from "vitest";
import { parseFontSize } from "./font-size";
import { isAllowedHref, normalizeLink } from "./links";
import { MAX_NOTE_BYTES, validateNoteBody } from "./validate";

const text = (t: string, marks?: unknown[]) => ({ type: "text", text: t, ...(marks ? { marks } : {}) });

/** A document using every supported node and mark. */
const FULL_DOC = {
  type: "doc",
  content: [
    ...[1, 2, 3, 4, 5, 6].map((level) => ({
      type: "heading",
      attrs: { level, textAlign: "center" },
      content: [text(`Heading ${level}`)],
    })),
    {
      type: "paragraph",
      attrs: { textAlign: "justify" },
      content: [
        text("bold", [{ type: "bold" }]),
        text("italic", [{ type: "italic" }]),
        text("under", [{ type: "underline" }]),
        text("strike", [{ type: "strike" }]),
        text("code", [{ type: "code" }]),
        text("link", [{ type: "link", attrs: { href: "https://example.com" } }]),
        text("mail", [{ type: "link", attrs: { href: "mailto:me@example.com" } }]),
        text("big", [{ type: "textStyle", attrs: { fontSize: "24px" } }]),
        { type: "hardBreak" },
        text("after break"),
      ],
    },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("b")] }] }] },
    { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("o")] }] }] },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [
            { type: "paragraph", content: [text("done")] },
            { type: "taskList", content: [{ type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [text("nested")] }] }] },
          ],
        },
      ],
    },
    { type: "blockquote", content: [{ type: "paragraph", content: [text("quote")] }] },
    { type: "codeBlock", content: [text("const x = 1;")] },
    { type: "horizontalRule" },
    { type: "paragraph" },
  ],
};

describe("parseFontSize", () => {
  it.each([
    ["24", 24],
    ["24px", 24],
    [" 13 px ", 13],
    [16, 16],
    ["12pt", 16],
    ["8", 8],
    ["96px", 96],
  ])("accepts %j as %d px", (input, px) => expect(parseFontSize(input)).toBe(px));

  it.each([["7"], ["97"], ["200"], ["3"], ["1.5em"], ["large"], [""], [null]])("rejects %j", (input) =>
    expect(parseFontSize(input)).toBeNull(),
  );
});

describe("links", () => {
  it.each([
    ["example.com", "https://example.com"],
    ["https://example.com/a?b=1", "https://example.com/a?b=1"],
    ["http://example.com", "http://example.com"],
    ["me@example.com", "mailto:me@example.com"],
    ["mailto:me@example.com", "mailto:me@example.com"],
    ["www.example.com/path", "https://www.example.com/path"],
  ])("normalises %j", (input, href) => expect(normalizeLink(input)).toBe(href));

  it.each([["javascript:alert(1)"], ["data:text/html,hi"], ["ftp://example.com"], [""], ["not a link"], ["plainword"]])(
    "refuses %j",
    (input) => expect(normalizeLink(input)).toBeNull(),
  );

  it("checks stored hrefs", () => {
    expect(isAllowedHref("https://example.com")).toBe(true);
    expect(isAllowedHref("javascript:alert(1)")).toBe(false);
    expect(isAllowedHref("vbscript:x")).toBe(false);
  });
});

describe("validateNoteBody", () => {
  it("accepts a document with every supported node and mark, unchanged", () => {
    const result = validateNoteBody(FULL_DOC);
    expect(result.ok).toBe(true);
    if (result.ok) expect(JSON.stringify(result.doc)).toContain("Heading 6");
  });

  it("rejects unknown node and mark types", () => {
    expect(validateNoteBody({ type: "doc", content: [{ type: "image", attrs: { src: "x" } }] }).ok).toBe(false);
    expect(
      validateNoteBody({ type: "doc", content: [{ type: "paragraph", content: [text("x", [{ type: "highlight" }])] }] }).ok,
    ).toBe(false);
  });

  it("rejects invalid nesting", () => {
    expect(validateNoteBody({ type: "doc", content: [{ type: "listItem", content: [] }] }).ok).toBe(false);
  });

  it("rejects unsafe links and out-of-range sizes", () => {
    const withMark = (mark: unknown) => ({ type: "doc", content: [{ type: "paragraph", content: [text("x", [mark])] }] });
    expect(validateNoteBody(withMark({ type: "link", attrs: { href: "javascript:alert(1)" } }))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/link/),
    });
    expect(validateNoteBody(withMark({ type: "textStyle", attrs: { fontSize: "300px" } }))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/font size/),
    });
  });

  it("rejects non-documents and oversized bodies", () => {
    expect(validateNoteBody(null).ok).toBe(false);
    expect(validateNoteBody({ type: "paragraph" }).ok).toBe(false);
    const huge = { type: "doc", content: [{ type: "paragraph", content: [text("x".repeat(MAX_NOTE_BYTES))] }] };
    expect(validateNoteBody(huge)).toMatchObject({ ok: false, error: expect.stringMatching(/too long/) });
  });
});
