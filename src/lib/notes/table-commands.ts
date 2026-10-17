import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import { CellSelection, findTable } from "@tiptap/pm/tables";

/** The table around the cursor, or null. */
export function tableAt(state: EditorState): PMNode | null {
  return findTable(state.selection.$from)?.node ?? null;
}

/** Whether the first row, and the first column, are all header cells. */
export function headerState(state: EditorState): { row: boolean; column: boolean } {
  const table = tableAt(state);
  if (!table || table.childCount === 0) return { row: false, column: false };
  const isHeader = (cell: PMNode | null) => cell?.type.name === "tableHeader";
  let row = true;
  table.firstChild!.forEach((cell) => {
    if (!isHeader(cell)) row = false;
  });
  let column = true;
  table.forEach((r) => {
    if (!isHeader(r.firstChild)) column = false;
  });
  return { row, column };
}

/**
 * Empties the selected cells (or the cell with the cursor) and keeps them,
 * in one undo step.
 */
export function clearCells(editor: Editor): boolean {
  const { state } = editor;
  const empty = () => state.schema.nodes.paragraph.create();
  const cells: { pos: number; node: PMNode }[] = [];
  if (state.selection instanceof CellSelection) {
    state.selection.forEachCell((node, pos) => cells.push({ pos, node }));
  } else {
    const { $from } = state.selection;
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.type.spec.tableRole === "cell" || node.type.spec.tableRole === "header_cell") {
        cells.push({ pos: $from.before(depth), node });
        break;
      }
    }
  }
  if (cells.length === 0) return false;
  const tr = state.tr;
  // From the last cell back, so earlier positions stay valid.
  for (const { pos, node } of cells.sort((a, b) => b.pos - a.pos)) {
    tr.replaceWith(pos + 1, pos + node.nodeSize - 1, empty());
  }
  editor.view.dispatch(tr);
  editor.commands.focus();
  return true;
}
