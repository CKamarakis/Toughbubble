// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Editor, getSchema, type JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { noteExtensions } from "./extensions";
import { validateNoteBody } from "./validate";

// ProseMirror reads `styleSheet.rules` for pasted <style> blocks (Sheets and
// Excel send one); browsers have it, happy-dom only has `cssRules`.
if (typeof CSSStyleSheet !== "undefined" && !("rules" in CSSStyleSheet.prototype)) {
  Object.defineProperty(CSSStyleSheet.prototype, "rules", {
    get(this: CSSStyleSheet) {
      return this.cssRules;
    },
  });
}

const fixture = (name: string) => readFileSync(join(__dirname, "__fixtures__", "tables", name), "utf8");
const p = (t: string): JSONContent => ({ type: "paragraph", content: [{ type: "text", text: t }] });
const cell = (type: "tableCell" | "tableHeader", content: JSONContent[]): JSONContent => ({ type, content });
const docWith = (cellContent: JSONContent[]): JSONContent => ({
  type: "doc",
  content: [{ type: "table", content: [{ type: "tableRow", content: [cell("tableCell", cellContent)] }] }],
});

describe("note schema: tables", () => {
  const schema = getSchema(noteExtensions());

  it("knows the four table nodes", () => {
    for (const name of ["table", "tableRow", "tableHeader", "tableCell"]) expect(schema.nodes[name]).toBeDefined();
  });

  it("accepts headings and lists in a cell", () => {
    const doc = docWith([
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Title" }] },
      { type: "bulletList", content: [{ type: "listItem", content: [p("one")] }] },
    ]);
    expect(() => schema.nodeFromJSON(doc).check()).not.toThrow();
  });

  it.each([
    ["an image", { type: "image", attrs: { attachmentId: "00000000-0000-4000-8000-000000000000" } }],
    ["a file card", { type: "fileAttachment", attrs: { attachmentId: "00000000-0000-4000-8000-000000000000" } }],
    ["a table", docWith([p("x")]).content![0]],
  ])("rejects %s inside a cell", (_label, node) => {
    expect(() => schema.nodeFromJSON(docWith([node as JSONContent])).check()).toThrow();
  });
});

describe("validateNoteBody: tables", () => {
  const table = (attrs: Record<string, unknown>): JSONContent => ({
    type: "doc",
    content: [
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableHeader", attrs: { colspan: 2, rowspan: 1, colwidth: [120, 80], align: null }, content: [p("Head")] },
            ],
          },
          { type: "tableRow", content: [cell("tableCell", [p("a")]), { type: "tableCell", attrs, content: [p("b")] }] },
        ],
      },
    ],
  });

  it("accepts a valid table and returns it unchanged", () => {
    const body = table({ colspan: 1, rowspan: 1, colwidth: [200], align: "center" });
    const result = validateNoteBody(body);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc).toEqual(getSchema(noteExtensions()).nodeFromJSON(body).toJSON());
  });

  it.each([
    ["a span of 0", { colspan: 0 }],
    ["a span over 100", { rowspan: 101 }],
    ["a width of 100,000 px", { colwidth: [100000] }],
    ["a width below 25 px", { colwidth: [3] }],
    ["widths that don't match the span", { colwidth: [100, 100] }],
    ["an unknown alignment", { align: "left; background: red" }],
  ])("refuses %s", (_label, attrs) => {
    expect(validateNoteBody(table({ colspan: 1, rowspan: 1, colwidth: null, align: null, ...attrs }))).toMatchObject({
      ok: false,
      error: "The note contains a table setting that isn't allowed.",
    });
  });
});

describe("pasting tables", () => {
  let editor: Editor | undefined;
  afterEach(() => editor?.destroy());

  /** Pastes `html` into an empty note and returns the first table. */
  function paste(html: string) {
    editor = new Editor({ extensions: noteExtensions(), content: { type: "doc", content: [{ type: "paragraph" }] } });
    editor.view.pasteHTML(html);
    const json = editor.getJSON();
    const table = json.content?.find((n) => n.type === "table");
    expect(table, JSON.stringify(json)).toBeDefined();
    return table!;
  }
  const rows = (table: JSONContent) => table.content ?? [];
  const textOf = (node: JSONContent): string =>
    node.text ?? (node.content ?? []).map(textOf).join(node.type === "paragraph" ? "" : " ").trim();
  const shape = (table: JSONContent) => rows(table).map((r) => (r.content ?? []).map((c) => c.type));

  it("keeps a web table's rows, columns, header row and cell formatting", () => {
    const table = paste(fixture("web-ftl-ltl.html"));
    expect(rows(table)).toHaveLength(4);
    expect(shape(table)[0]).toEqual(["tableHeader", "tableHeader", "tableHeader", "tableHeader"]);
    expect(shape(table)[1]).toEqual(["tableCell", "tableCell", "tableCell", "tableCell"]);
    const json = JSON.stringify(table);
    expect(json).toContain('"type":"bold"');
    expect(json).toContain("https://example.com/groupage");
    expect(json).toContain('"type":"bulletList"');
    expect(textOf(rows(table)[0].content![1])).toBe("FTL (Full Truckload)");
  });

  it("keeps a Google Sheets range as 3 by 3 with its text and column widths", () => {
    const table = paste(fixture("google-sheets.html"));
    expect(shape(table)).toEqual([
      ["tableCell", "tableCell", "tableCell"],
      ["tableCell", "tableCell", "tableCell"],
      ["tableCell", "tableCell", "tableCell"],
    ]);
    expect(rows(table).map((r) => r.content!.map(textOf))).toEqual([
      ["Item", "Qty", "Price"],
      ["Apples", "3", "1.20"],
      ["Pears", "5", "0.90"],
    ]);
    expect(rows(table)[0].content!.map((c) => c.attrs?.colwidth)).toEqual([[100], [120], [80]]);
  });

  it("keeps an Excel range's rows, columns and text", () => {
    const table = paste(fixture("excel.html"));
    expect(rows(table).map((r) => r.content!.map(textOf))).toEqual([
      ["Region", "Q1", "Q2"],
      ["North", "10", "12"],
      ["South", "7", "9"],
    ]);
  });

  it("drops an image in a cell and keeps the text", () => {
    const table = paste(fixture("web-image-in-cell.html"));
    expect(JSON.stringify(table)).not.toContain('"type":"image"');
    expect(textOf(rows(table)[1].content![1])).toBe("Desk lamp");
  });

  it("keeps merged cells", () => {
    const table = paste(fixture("web-colspan.html"));
    expect(rows(table)[0].content![0].attrs?.colspan).toBe(2);
    expect(rows(table)[1].content).toHaveLength(3);
  });

  it("keeps a header column", () => {
    const table = paste(fixture("web-header-column.html"));
    expect(shape(table)).toEqual([
      ["tableHeader", "tableCell", "tableCell"],
      ["tableHeader", "tableCell", "tableCell"],
    ]);
  });

  it("brings pasted spans and widths into range", () => {
    const table = paste('<table><tr><td colspan="0" colwidth="3">a</td><td rowspan="9999" colwidth="99999">b</td></tr></table>');
    const [a, b] = rows(table)[0].content!;
    expect(a.attrs?.colspan).toBe(1);
    expect(a.attrs?.colwidth).toEqual([25]);
    expect(b.attrs?.colwidth).toEqual([5000]);
    expect(b.attrs?.rowspan).toBeLessThanOrEqual(100);
  });
});
