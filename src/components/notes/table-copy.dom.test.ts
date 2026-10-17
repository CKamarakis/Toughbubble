// @vitest-environment happy-dom
import { Editor, type JSONContent } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { afterEach, describe, expect, it } from "vitest";
import { noteExtensions } from "@/lib/notes/extensions";

// Copying tables between notes (tables-in-notes D8): what one note puts on the
// clipboard, pasted into another note, gives the same table.

const editors: Editor[] = [];
afterEach(() => editors.splice(0).forEach((e) => e.destroy()));
const make = (content: JSONContent[]) => {
  const e = new Editor({ extensions: noteExtensions(), content: { type: "doc", content } });
  editors.push(e);
  return e;
};
const text = (t: string, marks?: JSONContent["marks"]): JSONContent => ({ type: "text", text: t, ...(marks ? { marks } : {}) });
const cell = (type: string, content: JSONContent[], attrs: Record<string, unknown> = {}): JSONContent => ({
  type,
  attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null, ...attrs },
  content: [{ type: "paragraph", content }],
});
const tableOf = (e: Editor) => (e.getJSON().content as JSONContent[]).find((n) => n.type === "table");

/** Copies `from`'s selection the way a real copy does and pastes it into `to`. */
function copyPaste(from: Editor, to: Editor) {
  const { dom } = from.view.serializeForClipboard(from.state.selection.content());
  to.view.pasteHTML(dom.innerHTML);
}
/** Selects cells from the cell containing `a` to the cell containing `b`. */
function selectCells(e: Editor, a: string, b: string) {
  const at = (t: string) => {
    let pos = -1;
    e.state.doc.descendants((node, p) => {
      if (pos < 0 && node.type.spec.tableRole?.includes("cell") && node.textContent === t) pos = p;
    });
    return pos;
  };
  e.view.dispatch(e.state.tr.setSelection(CellSelection.create(e.state.doc, at(a), at(b))));
}

describe("copying tables between notes", () => {
  it("a whole table arrives unchanged: header row, merged cell, column width, formatting", () => {
    const original: JSONContent = {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            cell("tableHeader", [text("Feature", [{ type: "textStyle", attrs: { fontSize: "20px" } }])], { colwidth: [180] }),
            cell("tableHeader", [text("Both")], { colspan: 2, colwidth: [90, 120] }),
          ],
        },
        {
          type: "tableRow",
          content: [
            cell("tableCell", [text("Cost", [{ type: "bold" }])], { colwidth: [180] }),
            cell("tableCell", [text("a")], { colwidth: [90] }),
            cell("tableCell", [text("b")], { colwidth: [120] }),
          ],
        },
      ],
    };
    const a = make([original]);
    const b = make([{ type: "paragraph" }]);
    selectCells(a, "Feature", "b");
    copyPaste(a, b);
    expect(tableOf(b)).toEqual(tableOf(a));
  });

  it("a block of 2 by 2 cells pastes as a 2 by 2 table", () => {
    const grid: JSONContent = {
      type: "table",
      content: [0, 1, 2, 3].map((r) => ({
        type: "tableRow",
        content: [0, 1, 2, 3].map((c) => cell("tableCell", [text(`${r},${c}`)])),
      })),
    };
    const a = make([grid]);
    const b = make([{ type: "paragraph" }]);
    selectCells(a, "1,1", "2,2");
    copyPaste(a, b);
    const rows = tableOf(b)!.content as JSONContent[];
    expect(rows.map((r) => (r.content as JSONContent[]).map((c) => b.schema.nodeFromJSON(c).textContent))).toEqual([
      ["1,1", "1,2"],
      ["2,1", "2,2"],
    ]);
  });

  it("a table pasted into a table fills from the cursor's cell and grows to fit", () => {
    const grid = (n: number, prefix: string): JSONContent => ({
      type: "table",
      content: Array.from({ length: n }, (_, r) => ({
        type: "tableRow",
        content: Array.from({ length: n }, (_, c) => cell("tableCell", [text(`${prefix}${r}${c}`)])),
      })),
    });
    const a = make([grid(2, "x")]);
    const b = make([grid(3, "y")]);
    selectCells(a, "x00", "x11");
    // Cursor in the last row's first cell of b.
    let at = -1;
    b.state.doc.descendants((node, p) => {
      if (at < 0 && node.isText && node.text === "y20") at = p;
    });
    b.commands.setTextSelection(at);
    copyPaste(a, b);
    const rows = tableOf(b)!.content as JSONContent[];
    expect(rows.map((r) => (r.content as JSONContent[]).map((c) => b.schema.nodeFromJSON(c).textContent))).toEqual([
      ["y00", "y01", "y02"],
      ["y10", "y11", "y12"],
      ["x00", "x01", "y22"],
      ["x10", "x11", ""],
    ]);
  });
});
