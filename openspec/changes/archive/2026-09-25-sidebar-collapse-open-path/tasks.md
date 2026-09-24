# Tasks

## 1. Fix

- [x] 1.1 Add `revealAncestors` in `src/lib/tree/` per D1; verify unit tests: adds missing ancestors, returns null when all are already expanded or there are none
- [x] 1.2 Change `isExpanded` to use only the saved state and add the one-time reveal effect with `tb:revealed` per D1/D2 in `workspace-context.tsx`; verify types and lint pass
- [x] 1.3 Name click per D3 in `sidebar-tree.tsx` (plain click opens and expands; on the open container toggles without navigating; modified and middle clicks unchanged); verify types and lint pass

## 2. Verification and release

- [x] 2.1 Browser check on a production build: collapse the project and folder containing the open note (both collapse, note stays open); reload (still collapsed); open another note inside from its project page (path expands); open a note by URL in a fresh browser (path expands); search still shows matches inside collapsed containers; clicking a collapsed folder's name opens and expands it, clicking it again collapses it with the page still open, Enter on the focused name does the same, and Ctrl-click opens a new tab without changing the sidebar; Phase 1 behaviors still hold (new item inside a folder expands it, move into a folder expands it); verify all checks pass
- [x] 2.2 Update the README's item-tree notes if they mention always-expanded ancestors, and run lint, unit, and integration tests; verify they pass
- [x] 2.3 Push a branch and check the preview; merge to `main` and verify on production that the project containing an open note collapses
