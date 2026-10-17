---
title: Tables in notes
status: Draft
sources:
  - notes/2026-10-17-table-support-in-nodes-pasted-tables-lose-their-structure.md
---

<!-- Keep it to one or two pages. Every section should help someone decide or build. Write "Unknown" or move it to Open questions rather than guessing. -->

## Problem

Tables pasted into a note lose their structure: rows, columns and cell breaks collapse into one run-on paragraph, and only bold survives (seen with a 4-column FTL / LTL / groupage comparison copied from a Google search result). Comparison and reference content can't be kept in notes today.

Bet: if a pasted table stays a table and can be lightly edited, notes become a usable home for that kind of reference material.

## Users

The owner of the workspace, keeping research and reference material in notes. Assumption: no other users yet, since the app is unreleased.

## Goals and success measures

- **Goal:** a table copied from a common source arrives in a note as a table and can be tidied up afterwards.
- **Measure:** the FTL / LTL / groupage example, a Google Sheets range and an Excel range each paste with the right rows, columns and header row (yes/no per source).
- **Must not get worse:** ordinary pasting, typing speed in long notes, and saving.

## Scope

**In:**
- Pasting tables from web pages, Google Sheets and Excel.
- Inserting a new 3×3 table from the note toolbar.
- Adding and deleting rows and columns; clearing a cell's contents.
- Header row on or off; merged cells kept when pasted.
- Changing column widths by dragging.
- Cells are edited like the rest of the note: headings, lists, checklists, quotes, code, all text formatting and font sizes. Header cells are bold on a muted background by default.
- Wide tables scroll sideways inside the note.
- Copying tables, or a block of cells, between notes, keeping their structure and formatting.
- Header column kept on paste, with an on/off toggle. Delete table.

**Out (and why):**
- Sorting, filtering, formulas: keep tables simple.
- Images or files inside cells: not needed for now.
- Cell colours and borders; source styling (Excel fonts and colours) is dropped, as with any paste today.
- Merging or splitting cells: pasted merges are kept, but there is no command to make them.
- Removing a single cell: a table is a grid, so the options are clearing a cell or deleting its row or column.
- Word as a tested source: not a common source for this use.
- A slash menu: notes have none today; adding one is its own feature.
- Copying tables into other apps (Google Sheets): not promised.
- A Settings default for header-cell style: later.

## Requirements

**Paste**
- Given a table copied from a web page, when I paste it into a note, then it shows as a table with the same rows, columns and header row, and cell content keeps its formatting.
- Given a range copied from Google Sheets or Excel, when I paste it into a note, then it shows as a table with the same rows and columns.
- Given a copied table that contains images, when I paste it, then the table arrives without the images.
- Given a copied table with merged cells, when I paste it, then those cells stay merged.

**Create and edit**
- Given the cursor on a line in a note, when I choose "Table" in the toolbar, then a 3×3 table with a header row appears and the cursor is in its first cell.
- Given the cursor in a table, when I add or delete a row or column, then the table updates around the cursor.
- Given the cursor in a cell, when I clear the cell, then its contents are removed and the cell stays.
- Given a table with a header row, when I turn the header row off, then the first row becomes a normal row.
- Given a table, when I drag a column border, then the column width changes and is the same after a reload.

**Layout and saving**
- Given a table wider than the note, when I view it, then the table scrolls sideways and the page does not.
- Given I edited a table, when I reload the note, then the table is unchanged.
- Given I made a table edit, when I undo and then redo, then the edit is undone and redone.

**Copying between notes**
- Given a table in note A, when I copy it and paste it into note B, then it arrives with the same rows, columns, header row, merged cells, widths and formatting.

## UX notes and assets

- Source example: ![Google table](../assets/table-source-google-ltl-ftl-groupage.png)
- Today's result after paste: ![Broken paste](../assets/toughbubble-10-16-2026-02-10-pm.png)
- Assumption: table commands (add/delete row or column, clear cell, header row) appear in a small menu when the cursor is in a table.
- The editor is Tiptap 3; its free table extension covers the table behaviour above. The table menu is ours to build.

## Risks

| Risk | How we'd notice | What we'd do |
|---|---|---|
| Each source puts different HTML on the clipboard | A source pastes wrong in testing | Fix that source, or list it as untested |
| The table menu costs more than expected | The build drags | Ship keyboard and right-click commands first |

## Open questions

- None.
