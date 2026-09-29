# Tasks

## 1. Links

- [x] 1.1 Make the link mark non-inclusive per D1 in `src/lib/notes/extensions.ts`; verify a unit test that the link mark spec is not inclusive and existing note unit tests pass

## 2. Note body size

- [x] 2.1 Add the `bodySize` document attribute per D2 and its validation in `validate.ts`; verify unit tests: a body with a valid `bodySize` round-trips, an out-of-range or malformed one is rejected, a body without it reads as null
- [x] 2.2 Set and clear `bodySize` from the font-size control per D3 (whole-document selection only; one undo step) and show it per D4 (paragraph size variable on the editor root; control shows it); verify types and lint pass

## 3. Verification and release

- [x] 3.1 Browser check on a production build: type after a link (plain text), typed "example.com " becomes a link; Ctrl+A then 18, then type on an empty line and in a new paragraph (18 px), a new heading keeps its Settings size, another note unaffected, reload keeps it, Ctrl+A then Default removes it, undo restores it; existing editor checks (links, attachments) still pass; verify all checks pass
- [x] 3.2 Update the README notes section (links end at their text; a note's own body size) and run lint, unit, and integration tests; verify they pass
- [x] 3.3 Push a branch and check the preview; merge to `main` and verify on production that text typed after a link is plain and a note sized with Ctrl+A keeps new text at that size
