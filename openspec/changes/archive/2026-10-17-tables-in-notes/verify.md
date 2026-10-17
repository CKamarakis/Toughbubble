# Verify: tables-in-notes

result: pass
date: 2026-10-17
commit: 59a2733
type: web-ui

## Tests

| Script | Required | Result |
|---|---|---|
| test | yes | pass |
| test:integration | no | pass |

## Reviews

| Review | How | Note |
|---|---|---|
| security | substitute | Built-in /security-review compares the whole design-foundation branch with main (many unrelated changes); reviewed this change's diff (0c0d2a0..HEAD) by hand instead: cell align/colspan/rowspan/colwidth are rendered into HTML, are normalised on paste and validated on save; links in cells pass the existing link check; no new endpoints, auth or storage paths. No findings. |
| code | ran |  |

## Docs sync

docs last updated: 2026-10-17 (a4f52fe); code commits since: 6; no apply receipt  (date: 2026-10-17)

| Proposed | Written | Declined | Left out |
|---|---|---|---|
| 3 | 3 | 0 | 3 |

unplanned dependencies: none

## HARD (blocks archive)

None.

## ADVISORY (your call)

None.

## Overrides

None.

## Resolved

| Id | Item | Note | Date |
|---|---|---|---|
| C1 | code review (medium) - Dragging a column can store a fractional width (colspan split, zoom) or one over 5000 px; save validation then refuses every save (validate.ts:54, extensions.ts:146 cleans only on paste) | fixed in 6b25140 | 2026-10-17 |
| C2 | code review (low) - headerState reads each row's firstChild; with a rowspan in column 0 it disagrees with prosemirror-tables and Header column toggles the wrong way (table-commands.ts:21) | fixed in 6b25140 | 2026-10-17 |
| C3 | code review (low) - Clear cell and Delete table skip can()/isEditable checks; clearCells dispatches directly (table-menu.tsx:79) | fixed in 6b25140 | 2026-10-17 |
| C4 | code review (low) - Menu state runs four can() dry runs and two findTable calls on every transaction, even with the menu closed (table-menu.tsx:32) | fixed in 6b25140 | 2026-10-17 |
| C5 | code review (low) - clearCells re-implements deleteCellSelection and hard-codes paragraph instead of cellType.createAndFill (table-commands.ts:31) | fixed in 6b25140 | 2026-10-17 |
| C6 | code review (low) - Add row above / Add column left use the After commands' can() checks (table-menu.tsx:57) | fixed in 6b25140 | 2026-10-17 |
| C7 | code review (low) - NoteTableCell and NoteTableHeader are duplicate extend blocks (extensions.ts:99) | fixed in 6b25140 | 2026-10-17 |

<!-- kit-verify-data {"change":"tables-in-notes","date":"2026-10-17","commit":"59a2733","type":"web-ui","tests":[{"script":"test","required":true,"result":"pass"},{"script":"test:integration","required":false,"result":"pass"}],"items":[],"overrides":[],"reviews":{"security":{"how":"substitute","note":"Built-in /security-review compares the whole design-foundation branch with main (many unrelated changes); reviewed this change's diff (0c0d2a0..HEAD) by hand instead: cell align/colspan/rowspan/colwidth are rendered into HTML, are normalised on paste and validated on save; links in cells pass the existing link check; no new endpoints, auth or storage paths. No findings.","date":"2026-10-17"},"code":{"how":"ran","note":"","date":"2026-10-17"}},"docsSync":{"date":"2026-10-17","docsUpdated":{"commit":"a4f52fe","date":"2026-10-17"},"codeCommitsSince":6,"receipt":false,"proposed":3,"written":3,"declined":0,"leftOut":3,"unplanned":[]},"resolved":[{"item":"C1","what":"code review (medium)","detail":"Dragging a column can store a fractional width (colspan split, zoom) or one over 5000 px; save validation then refuses every save (validate.ts:54, extensions.ts:146 cleans only on paste)","note":"fixed in 6b25140","date":"2026-10-17"},{"item":"C2","what":"code review (low)","detail":"headerState reads each row's firstChild; with a rowspan in column 0 it disagrees with prosemirror-tables and Header column toggles the wrong way (table-commands.ts:21)","note":"fixed in 6b25140","date":"2026-10-17"},{"item":"C3","what":"code review (low)","detail":"Clear cell and Delete table skip can()/isEditable checks; clearCells dispatches directly (table-menu.tsx:79)","note":"fixed in 6b25140","date":"2026-10-17"},{"item":"C4","what":"code review (low)","detail":"Menu state runs four can() dry runs and two findTable calls on every transaction, even with the menu closed (table-menu.tsx:32)","note":"fixed in 6b25140","date":"2026-10-17"},{"item":"C5","what":"code review (low)","detail":"clearCells re-implements deleteCellSelection and hard-codes paragraph instead of cellType.createAndFill (table-commands.ts:31)","note":"fixed in 6b25140","date":"2026-10-17"},{"item":"C6","what":"code review (low)","detail":"Add row above / Add column left use the After commands' can() checks (table-menu.tsx:57)","note":"fixed in 6b25140","date":"2026-10-17"},{"item":"C7","what":"code review (low)","detail":"NoteTableCell and NoteTableHeader are duplicate extend blocks (extensions.ts:99)","note":"fixed in 6b25140","date":"2026-10-17"}],"result":"pass"} -->
