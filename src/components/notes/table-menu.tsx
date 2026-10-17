"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { ChevronDown, Table } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearCells, headerState, tableAt } from "@/lib/notes/table-commands";

/**
 * The toolbar's Table control (tables-in-notes D6): Insert table outside a
 * table, the row, column, cell and header commands inside one. Each command
 * returns focus to the note.
 */
export function TableMenu({ editor, triggerClass }: { editor: Editor; triggerClass: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-toolbar-item aria-label="Table" title="Table" className={triggerClass}>
        <Table className="size-4" />
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48" finalFocus={false}>
        <TableMenuItems editor={editor} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The menu's items. Mounted only while the menu is open, so what can run is
 * worked out then, not on every keystroke.
 */
function TableMenuItems({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const table = tableAt(e.state);
      const headers = headerState(table);
      const can = e.can();
      // Nothing runs in a read-only note.
      const live = !!table && e.isEditable;
      return {
        inTable: table !== null,
        headerRow: headers.row,
        headerColumn: headers.column,
        canInsert: !table && e.isEditable && can.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
        canRowBefore: live && can.addRowBefore(),
        canRowAfter: live && can.addRowAfter(),
        canColumnBefore: live && can.addColumnBefore(),
        canColumnAfter: live && can.addColumnAfter(),
        canDeleteRow: live && can.deleteRow(),
        canDeleteColumn: live && can.deleteColumn(),
        canHeaderRow: live && can.toggleHeaderRow(),
        canHeaderColumn: live && can.toggleHeaderColumn(),
        canDeleteTable: live && can.deleteTable(),
        canClear: live,
      };
    },
  });
  const run = () => editor.chain().focus();

  if (!s.inTable) {
    return (
      <DropdownMenuItem disabled={!s.canInsert} onClick={() => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        Insert table
      </DropdownMenuItem>
    );
  }
  return (
    <>
      <DropdownMenuItem disabled={!s.canRowBefore} onClick={() => run().addRowBefore().run()}>
        Add row above
      </DropdownMenuItem>
      <DropdownMenuItem disabled={!s.canRowAfter} onClick={() => run().addRowAfter().run()}>
        Add row below
      </DropdownMenuItem>
      <DropdownMenuItem disabled={!s.canColumnBefore} onClick={() => run().addColumnBefore().run()}>
        Add column left
      </DropdownMenuItem>
      <DropdownMenuItem disabled={!s.canColumnAfter} onClick={() => run().addColumnAfter().run()}>
        Add column right
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={!s.canDeleteRow} onClick={() => run().deleteRow().run()}>
        Delete row
      </DropdownMenuItem>
      <DropdownMenuItem disabled={!s.canDeleteColumn} onClick={() => run().deleteColumn().run()}>
        Delete column
      </DropdownMenuItem>
      <DropdownMenuItem disabled={!s.canClear} onClick={() => clearCells(editor)}>
        Clear cell
      </DropdownMenuItem>
      <DropdownMenuCheckboxItem
        checked={s.headerRow}
        disabled={!s.canHeaderRow}
        onClick={() => run().toggleHeaderRow().run()}
      >
        Header row
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={s.headerColumn}
        disabled={!s.canHeaderColumn}
        onClick={() => run().toggleHeaderColumn().run()}
      >
        Header column
      </DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={!s.canDeleteTable} onClick={() => run().deleteTable().run()}>
        Delete table
      </DropdownMenuItem>
    </>
  );
}
