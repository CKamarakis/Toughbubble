// @vitest-environment happy-dom
import { Editor, type JSONContent } from "@tiptap/core";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { noteExtensions } from "@/lib/notes/extensions";
import { clearCells, headerState } from "@/lib/notes/table-commands";
import { validateNoteBody } from "@/lib/notes/validate";
import { TableMenu } from "./table-menu";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const p = (t = ""): JSONContent => (t ? { type: "paragraph", content: [{ type: "text", text: t }] } : { type: "paragraph" });
/** A rows × cols table with a header row; cell text is "r,c". */
const grid = (rows: number, cols: number): JSONContent => ({
  type: "table",
  content: Array.from({ length: rows }, (_, r) => ({
    type: "tableRow",
    content: Array.from({ length: cols }, (_, c) => ({
      type: r === 0 ? "tableHeader" : "tableCell",
      content: [p(`${r},${c}`)],
    })),
  })),
});

let editor: Editor;
function makeEditor(content: JSONContent[]) {
  editor = new Editor({ extensions: noteExtensions(), content: { type: "doc", content } });
  return editor;
}
afterEach(() => editor?.destroy());

const table = (): JSONContent | undefined => (editor.getJSON().content as JSONContent[]).find((n) => n.type === "table");
const texts = () => (table()?.content as JSONContent[]).map((r) => (r.content as JSONContent[]).map((c) => editor.schema.nodeFromJSON(c).textContent));
/** Puts the cursor at the end of the text "r,c". */
function cursorIn(text: string) {
  let at = -1;
  editor.state.doc.descendants((node, pos) => {
    if (at < 0 && node.isText && node.text === text) at = pos + node.nodeSize;
  });
  expect(at, `cell ${text}`).toBeGreaterThan(0);
  editor.commands.setTextSelection(at);
}
const key = (k: string, shift = false) =>
  editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: k, shiftKey: shift, bubbles: true, cancelable: true }));

describe("table commands", () => {
  it("inserts a 3 by 3 table with a header row and the cursor in its first cell", () => {
    makeEditor([p("intro")]);
    editor.commands.setTextSelection(6);
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    expect(table()!.content).toHaveLength(3);
    expect(table()!.content![0].content!.map((c) => c.type)).toEqual(["tableHeader", "tableHeader", "tableHeader"]);
    expect(headerState(editor.state)).toEqual({ row: true, column: false });
    const $from = editor.state.selection.$from;
    expect($from.node($from.depth - 1).type.name).toBe("tableHeader");
    expect($from.index($from.depth - 2)).toBe(0); // first cell of the row
    expect($from.index($from.depth - 3)).toBe(0); // first row
  });

  it("adds a row below, then deletes the row with the cursor", () => {
    makeEditor([grid(3, 2)]);
    cursorIn("1,0");
    editor.commands.addRowAfter();
    expect(texts()).toEqual([["0,0", "0,1"], ["1,0", "1,1"], ["", ""], ["2,0", "2,1"]]);
    editor.commands.deleteRow();
    expect(texts()).toEqual([["0,0", "0,1"], ["", ""], ["2,0", "2,1"]]);
  });

  it("deletes the middle column and keeps the others", () => {
    makeEditor([grid(2, 3)]);
    cursorIn("1,1");
    editor.commands.deleteColumn();
    expect(texts()).toEqual([["0,0", "0,2"], ["1,0", "1,2"]]);
  });

  it("clears a cell and keeps it", () => {
    makeEditor([grid(2, 2)]);
    cursorIn("1,1");
    expect(clearCells(editor)).toBe(true);
    expect(texts()).toEqual([["0,0", "0,1"], ["1,0", ""]]);
  });

  it("turns the header row off and the header column on", () => {
    makeEditor([grid(2, 2)]);
    cursorIn("1,1");
    editor.commands.toggleHeaderRow();
    expect(headerState(editor.state)).toEqual({ row: false, column: false });
    expect(table()!.content![0].content![0].type).toBe("tableCell");
    editor.commands.toggleHeaderColumn();
    expect(headerState(editor.state)).toEqual({ row: false, column: true });
    expect(validateNoteBody(editor.getJSON()).ok).toBe(true);
  });

  it("deletes the table", () => {
    makeEditor([p("before"), grid(2, 2), p("after")]);
    cursorIn("1,1");
    editor.commands.deleteTable();
    expect(table()).toBeUndefined();
  });

  it("Tab in the last cell adds a row, Shift+Tab moves back a cell", () => {
    makeEditor([grid(2, 2)]);
    cursorIn("1,1");
    key("Tab");
    expect(table()!.content).toHaveLength(3);
    expect(editor.state.selection.$from.parent.textContent).toBe("");
    key("Tab", true);
    expect(editor.state.selection.$from.parent.textContent).toBe("1,1");
  });

  it("the note's own Tab handling (link card, attachment menu) runs before the table's", () => {
    // note-editor.tsx handles Tab in `editorProps.handleKeyDown`; ProseMirror
    // asks those props before plugin keymaps such as the table's.
    let handled = 0;
    editor = new Editor({
      extensions: noteExtensions(),
      content: { type: "doc", content: [grid(2, 2)] },
      editorProps: { handleKeyDown: (_v, e) => (e.key === "Tab" ? (handled++, true) : false) },
    });
    cursorIn("1,1");
    key("Tab");
    expect(handled).toBe(1);
    expect(table()!.content).toHaveLength(2);
  });

  it("undo and redo a table command", () => {
    makeEditor([grid(3, 2)]);
    cursorIn("1,0");
    editor.commands.deleteRow();
    expect(table()!.content).toHaveLength(2);
    editor.commands.undo();
    expect(texts()).toEqual([["0,0", "0,1"], ["1,0", "1,1"], ["2,0", "2,1"]]);
    editor.commands.redo();
    expect(texts()).toEqual([["0,0", "0,1"], ["2,0", "2,1"]]);
  });

  it("the note's formatting works in cells and saves", () => {
    makeEditor([grid(2, 2)]);
    // Header cell: 20 px and italic over its text.
    cursorIn("0,0");
    const { $from } = editor.state.selection;
    editor.chain().setTextSelection({ from: $from.start(), to: $from.end() }).setFontSize("20px").toggleItalic().run();
    // Body cell: a heading, then a bulleted list.
    cursorIn("1,1");
    editor.commands.setHeading({ level: 3 });
    editor.commands.splitBlock();
    editor.commands.setParagraph();
    editor.commands.insertContent("item");
    editor.commands.toggleBulletList();
    const json = editor.getJSON();
    const [head] = table()!.content![0].content!;
    expect(JSON.stringify(head)).toContain('"fontSize":"20px"');
    expect(JSON.stringify(head)).toContain('"type":"italic"');
    const body = table()!.content![1].content![1];
    expect(body.content!.map((n) => n.type)).toEqual(["heading", "bulletList"]);
    expect(validateNoteBody(json).ok).toBe(true);
  });
});

describe("TableMenu", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const items = () => [...document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]')].map((el) => el.textContent?.trim());
  async function open() {
    const trigger = container.querySelector<HTMLElement>('[aria-label="Table"]')!;
    await act(async () => {
      trigger.focus();
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    });
  }

  it("outside a table offers Insert table, which inserts one and returns focus to the note", async () => {
    makeEditor([p("intro")]);
    document.body.append(editor.view.dom);
    editor.commands.setTextSelection(6);
    await act(async () => root.render(createElement(TableMenu, { editor, triggerClass: "" })));
    await open();
    expect(items()).toEqual(["Insert table"]);
    const insert = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent === "Insert table")!;
    await act(async () => insert.click());
    expect(table()).toBeDefined();
    expect(editor.isFocused || document.activeElement === editor.view.dom).toBe(true);
  });

  it("inside a table offers the editing commands", async () => {
    makeEditor([grid(2, 2)]);
    cursorIn("1,1");
    await act(async () => root.render(createElement(TableMenu, { editor, triggerClass: "" })));
    await open();
    expect(items()).toEqual([
      "Add row above",
      "Add row below",
      "Add column left",
      "Add column right",
      "Delete row",
      "Delete column",
      "Clear cell",
      "Header row",
      "Header column",
      "Delete table",
    ]);
  });
});
