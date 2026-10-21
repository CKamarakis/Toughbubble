import { getSchema, type JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { noteExtensions } from "./extensions";
import {
  attachmentIds,
  DROPPED_MARKS,
  hasAttachments,
  MARKDOWN_MARKS,
  MARKDOWN_NODES,
  noteToMarkdown,
} from "./markdown";

type Mark = NonNullable<JSONContent["marks"]>[number];
const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });
const text = (value: string, ...marks: Mark[]): JSONContent => ({ type: "text", text: value, ...(marks.length ? { marks } : {}) });
const p = (...content: JSONContent[]): JSONContent => ({ type: "paragraph", content });
const h = (level: number, ...content: JSONContent[]): JSONContent => ({ type: "heading", attrs: { level }, content });
const li = (...content: JSONContent[]): JSONContent => ({ type: "listItem", content });
const bold: Mark = { type: "bold" };
const italic: Mark = { type: "italic" };
const link = (href: string): Mark => ({ type: "link", attrs: { href } });
const md = (...content: JSONContent[]) => noteToMarkdown(doc(...content));

describe("noteToMarkdown: text", () => {
  it("writes headings and paragraphs separated by blank lines", () => {
    expect(md(h(1, text("Title")), p(text("One")), h(3, text("Sub")))).toBe("# Title\n\nOne\n\n### Sub\n");
  });

  it("writes bold, italic, strike and inline code", () => {
    expect(md(p(text("a", bold), text(" "), text("b", italic), text(" "), text("c", { type: "strike" }), text(" "), text("d", { type: "code" })))).toBe(
      "**a** *b* ~~c~~ `d`\n",
    );
  });

  it("keeps spaces outside emphasis", () => {
    expect(md(p(text("go"), text(" now ", bold), text("please")))).toBe("go **now** please\n");
  });

  it("fences inline code longer than the backticks inside", () => {
    expect(md(p(text("a`b", { type: "code" })))).toBe("``a`b``\n");
  });

  it("writes links and joins neighbouring runs of one link", () => {
    expect(md(p(text("see "), text("the ", link("https://x.com")), text("site", link("https://x.com"), bold)))).toBe(
      "see [the **site**](https://x.com)\n",
    );
  });

  it("drops links with a scheme that isn't allowed", () => {
    expect(md(p(text("bad", link("javascript:alert(1)"))))).toBe("bad\n");
  });

  it("writes a hard break as a backslash line end", () => {
    expect(md(p(text("a"), { type: "hardBreak" }, text("b")))).toBe("a\\\nb\n");
  });

  it("escapes characters Markdown would read as formatting", () => {
    expect(md(p(text("2*3 [x] _y_ <b>")))).toBe("2\\*3 \\[x\\] \\_y\\_ \\<b\\>\n");
    expect(md(p(text("# not a heading")))).toBe("\\# not a heading\n");
    expect(md(p(text("- not a list")))).toBe("\\- not a list\n");
    expect(md(p(text("1. not a list")))).toBe("1\\. not a list\n");
  });

  it("leaves out font size, colour, underline and alignment", () => {
    const styled: JSONContent = {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [text("red", { type: "textStyle", attrs: { fontSize: "24px", color: "#f00" } }, { type: "underline" })],
    };
    expect(md(styled)).toBe("red\n");
  });

  it("returns an empty string for an empty note", () => {
    expect(md()).toBe("");
    expect(md(p())).toBe("");
  });
});

describe("noteToMarkdown: blocks", () => {
  it("writes bullet and numbered lists, honouring the start number", () => {
    expect(md({ type: "bulletList", content: [li(p(text("a"))), li(p(text("b")))] })).toBe("- a\n- b\n");
    expect(md({ type: "orderedList", attrs: { start: 3 }, content: [li(p(text("a"))), li(p(text("b")))] })).toBe("3. a\n4. b\n");
  });

  it("writes task lists with their checked state", () => {
    const task = (checked: boolean, value: string): JSONContent => ({ type: "taskItem", attrs: { checked }, content: [p(text(value))] });
    expect(md({ type: "taskList", content: [task(false, "todo"), task(true, "done")] })).toBe("- [ ] todo\n- [x] done\n");
  });

  it("indents nested lists under their item", () => {
    const nested = { type: "bulletList", content: [li(p(text("inner")))] };
    expect(md({ type: "orderedList", content: [li(p(text("outer")), nested)] })).toBe("1. outer\n   - inner\n");
  });

  it("writes a quote and a horizontal rule", () => {
    expect(md({ type: "blockquote", content: [p(text("one")), p(text("two"))] }, { type: "horizontalRule" })).toBe(
      "> one\n>\n> two\n\n---\n",
    );
  });

  it("fences a code block with its language, longer than any fence inside", () => {
    expect(md({ type: "codeBlock", attrs: { language: "ts" }, content: [text("const a = 1;")] })).toBe("```ts\nconst a = 1;\n```\n");
    expect(md({ type: "codeBlock", content: [text("```\nx\n```")] })).toBe("````\n```\nx\n```\n````\n");
  });
});

const cell = (type: "tableCell" | "tableHeader", attrs: Record<string, unknown>, ...content: JSONContent[]): JSONContent => ({
  type,
  attrs: { colspan: 1, rowspan: 1, ...attrs },
  content: content.length ? content : [p()],
});
const td = (value: string, attrs = {}) => cell("tableCell", attrs, p(text(value)));
const th = (value: string, attrs = {}) => cell("tableHeader", attrs, p(text(value)));
const tr = (...cells: JSONContent[]): JSONContent => ({ type: "tableRow", content: cells });
const tableOf = (...rows: JSONContent[]): JSONContent => ({ type: "table", content: rows });

describe("noteToMarkdown: tables", () => {
  it("writes a table with a header row as a pipe table", () => {
    expect(md(tableOf(tr(th("Mode"), th("Price")), tr(td("FTL"), td("high")), tr(td("LTL"), td("a|b"))))).toBe(
      "| Mode | Price |\n| --- | --- |\n| FTL | high |\n| LTL | a\\|b |\n",
    );
  });

  it("gives a table without a header row an empty header", () => {
    expect(md(tableOf(tr(td("a"), td("b"))))).toBe("| | |\n| --- | --- |\n| a | b |\n");
  });

  it("writes a table with a merged cell as HTML", () => {
    const out = md(tableOf(tr(th("Both", { colspan: 2 })), tr(td("a"), td("b"))));
    expect(out).toContain("<table>");
    expect(out).toContain('<th colspan="2"><p>Both</p></th>');
    expect(out).toContain("<td><p>a</p></td>");
  });

  it("writes a table with a multi-paragraph cell or a header column as HTML", () => {
    expect(md(tableOf(tr(cell("tableCell", {}, p(text("one")), p(text("two"))))))).toContain("<td><p>one</p><p>two</p></td>");
    expect(md(tableOf(tr(th("A"), th("B")), tr(th("row"), td("x"))))).toContain("<th><p>row</p></th>");
  });

  it("escapes HTML inside HTML tables", () => {
    expect(md(tableOf(tr(td('<script>"&', { rowspan: 2 }))))).toContain("<td rowspan=\"2\"><p>&lt;script&gt;&quot;&amp;</p></td>");
  });
});

const image = (attachmentId: string | null, alt: string | null = null, copyOf: string | null = null): JSONContent => ({
  type: "image",
  attrs: { attachmentId, alt, copyOf },
});
const fileCard = (attachmentId: string, name: string): JSONContent => ({ type: "fileAttachment", attrs: { attachmentId, name } });

describe("noteToMarkdown: attachments", () => {
  it("links images and files to their place in assets/", () => {
    const out = noteToMarkdown(doc(image("i1", "Map of route"), fileCard("f1", "tickets.pdf")), {
      i1: { path: "assets/map.png", name: "map.png" },
      f1: { path: "assets/tickets.pdf", name: "tickets.pdf" },
    });
    expect(out).toBe("![Map of route](assets/map.png)\n\n[tickets.pdf](assets/tickets.pdf)\n");
  });

  it("uses the file name when an image has no alt text", () => {
    expect(noteToMarkdown(doc(image("i1")), { i1: { path: "assets/map.png", name: "map.png" } })).toBe("![map.png](assets/map.png)\n");
  });

  it("URL-encodes names with spaces and brackets", () => {
    const out = noteToMarkdown(doc(fileCard("f1", "My (old) plan.pdf")), { f1: { path: "assets/My (old) plan.pdf", name: "My (old) plan.pdf" } });
    expect(out).toBe("[My (old) plan.pdf](assets/My%20%28old%29%20plan.pdf)\n");
  });

  it("names missing files in their place", () => {
    const out = noteToMarkdown(doc(p(text("before")), image("i1"), fileCard("f2", "notes.txt"), image(null, null, "src")), {
      i1: { missing: "map.png" },
    });
    expect(out).toBe("before\n\n> Missing file: map.png\n\n> Missing file: notes.txt\n\n> Missing file: image\n");
  });

  it("lists attachment ids once, skipping nodes still being copied", () => {
    const body = doc(image("i1"), p(text("x")), fileCard("f1", "a.pdf"), image("i1"), image(null, null, "src"));
    expect(attachmentIds(body)).toEqual(["i1", "f1"]);
    expect(hasAttachments(body)).toBe(true);
    expect(hasAttachments(doc(p(text("plain"))))).toBe(false);
  });
});

describe("noteToMarkdown: coverage of the note schema", () => {
  it("handles every node and mark a note can hold", () => {
    const schema = getSchema(noteExtensions());
    const known = new Set<string>(MARKDOWN_NODES);
    expect(Object.keys(schema.nodes).filter((name) => !known.has(name))).toEqual([]);
    const marks = new Set<string>([...MARKDOWN_MARKS, ...DROPPED_MARKS]);
    expect(Object.keys(schema.marks).filter((name) => !marks.has(name))).toEqual([]);
  });

  it("keeps the text of a node it doesn't know", () => {
    expect(md({ type: "mystery", content: [text("kept")] })).toBe("kept\n");
  });
});
