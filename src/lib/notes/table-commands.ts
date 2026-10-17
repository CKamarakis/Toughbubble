import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import {
  cellAround,
  CellSelection,
  columnIsHeader,
  deleteCellSelection,
  findTable,
  rowIsHeader,
  TableMap,
} from "@tiptap/pm/tables";

/** The table around the cursor, or null. */
export function tableAt(state: EditorState): PMNode | null {
  return findTable(state.selection.$from)?.node ?? null;
}

/**
 * Whether the first row, and the first column, are all header cells, read
 * from the table's grid as the header toggles read it (so spans agree).
 */
export function headerState(table: PMNode | null): { row: boolean; column: boolean } {
  if (!table || table.childCount === 0) return { row: false, column: false };
  const map = TableMap.get(table);
  return { row: rowIsHeader(map, table, 0), column: columnIsHeader(map, table, 0) };
}

/**
 * Empties the selected cells (or the cell with the cursor) and keeps them,
 * in one undo step. Does nothing in a read-only editor.
 */
export function clearCells(editor: Editor): boolean {
  if (!editor.isEditable) return false;
  const { state, view } = editor;
  if (state.selection instanceof CellSelection) {
    const done = deleteCellSelection(state, view.dispatch);
    if (done) editor.commands.focus();
    return done;
  }
  const $cell = cellAround(state.selection.$from);
  const cell = $cell?.nodeAfter;
  const empty = cell?.type.createAndFill();
  if (!$cell || !cell || !empty) return false;
  view.dispatch(state.tr.replaceWith($cell.pos + 1, $cell.pos + cell.nodeSize - 1, empty.content));
  editor.commands.focus();
  return true;
}
