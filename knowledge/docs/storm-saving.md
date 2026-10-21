## How it works, roughly
A Storm is stored as one document; about 1 second after the last change only the changed stickies are sent, usually under 2 KB. Each item takes about 385 bytes, so the 2 MB limit is roughly 5,000 items. Undo history lives in the browser, not on the server.

## Why

- **Autosave**: sending only what changed keeps every save far below the server's 1 MB request limit, whatever the board's size. Each keystroke is committed so unfinished typing is not lost on a crash. [[each-storm-is-one-json-document-saved-as-change-sets]]
- **Changed elsewhere**: Keep mine overwrites the other tab's edits to the same sticky; accepted for a single-user app (same rule as notes). Both choices clear undo because this tab never saw the other tab's items.
- **Server checks**: only the 13 preset colours are accepted because custom colours are deferred and widening the check later is cheaper than cleaning up stored junk. Change sets are capped at 800 KB to stay under the 1 MB request limit, as notes do; bigger pending changes (after a long offline spell) go as several saves.
- **Undo survives a reload**: history is restored only if the board hasn't changed since, so it never undoes against a board it doesn't match. It is wiped on sign-out (shared computers) and keyed by user, so another user on the same browser never sees it. [[storm-undo-lives-in-the-browser]]
