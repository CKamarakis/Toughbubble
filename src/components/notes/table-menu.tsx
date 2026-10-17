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
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const inTable = tableAt(e.state) !== null;
      const headers = headerState(e.state);
      return {
        inTable,
        headerRow: headers.row,
        headerColumn: headers.column,
        canAddRow: inTable && e.can().addRowAfter(),
        canAddColumn: inTable && e.can().addColumnAfter(),
        canDeleteRow: inTable && e.can().deleteRow(),
        canDeleteColumn: inTable && e.can().deleteColumn(),
        canInsert: !inTable && e.can().insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
      };
    },
  });
  const run = () => editor.chain().focus();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-toolbar-item aria-label="Table" title="Table" className={triggerClass}>
        <Table className="size-4" />
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48" finalFocus={false}>
        {!s.inTable ? (
          <DropdownMenuItem
            disabled={!s.canInsert}
            onClick={() => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            Insert table
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem disabled={!s.canAddRow} onClick={() => run().addRowBefore().run()}>
              Add row above
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!s.canAddRow} onClick={() => run().addRowAfter().run()}>
              Add row below
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!s.canAddColumn} onClick={() => run().addColumnBefore().run()}>
              Add column left
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!s.canAddColumn} onClick={() => run().addColumnAfter().run()}>
              Add column right
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!s.canDeleteRow} onClick={() => run().deleteRow().run()}>
              Delete row
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!s.canDeleteColumn} onClick={() => run().deleteColumn().run()}>
              Delete column
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => clearCells(editor)}>Clear cell</DropdownMenuItem>
            <DropdownMenuCheckboxItem checked={s.headerRow} onClick={() => run().toggleHeaderRow().run()}>
              Header row
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={s.headerColumn} onClick={() => run().toggleHeaderColumn().run()}>
              Header column
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => run().deleteTable().run()}>Delete table</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
