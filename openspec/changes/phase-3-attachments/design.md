# Design

## Context

See proposal.md for motivation. From Phases 0–2:

- Note bodies are Tiptap JSON in `item_content`, saved by a Server Action with versioned autosave (`useNoteAutosave`). The server validates every body against the shared extension list in `src/lib/notes/extensions.ts` (`validate.ts`), so any new node must live in that list.
- Server Actions accept 1 MB request bodies, so files cannot go through them.
- App code reaches Postgres only through `withUserDb()` (RLS applies); a lint rule keeps the admin client out of `src/`. `SUPABASE_SECRET_KEY` is used only by integration tests.
- `deleteForever` deletes a trashed item; FK cascades remove descendants and content. Archived and trashed notes cannot be opened, so only active notes show attachments.
- No Content Security Policy is set (`next.config.ts` is empty), so `<img>` can load from the Supabase Storage domain.
- Supabase Storage is unused; no bucket exists in dev or prod.

## Goals / Non-Goals

**Goals:**
- Every storage read and write is checked against the signed-in user by the database (RLS), as for the rest of the data; no secret key in app code.
- A note body can only refer to files of that note, and never to an outside URL.
- Typing and autosave keep working while files upload.
- Only one reasonably sized copy of each image is stored.

**Non-Goals:**
- Upload progress in percent (supabase-js `upload` uses `fetch`, which reports no progress). "Uploading…" is shown instead; resumable uploads (TUS) can come later.
- Cleaning up files no longer referenced by any note, and pending uploads that never finished (Phase 6 purge job).
- Removing files on account deletion: the app has no account deletion yet. Whoever builds it must remove the user's `attachments/<owner_id>/` folder (see Risks).

## Decisions

### D1. Private bucket, user client, Storage RLS
- One private bucket `attachments` with `file_size_limit = 5 MB` (Supabase enforces it on upload, whatever the client claims). Object path: `<owner_id>/<item_id>/<attachment_id>`.
- Policies on `storage.objects` for `bucket_id = 'attachments'` and `(storage.foldername(name))[1] = auth.uid()::text`: SELECT, INSERT, DELETE for `authenticated`. No UPDATE policy, and uploads use `upsert: false`, so a stored file can't be replaced.
- All Storage calls use the user's own Supabase client: the browser client uploads; the server client (cookies) creates signed links and deletes files. RLS checks each call.
- Alternative: a server-only client with the secret key, authorising via our own tables. Rejected: it bypasses RLS, which the project avoids in app code (the lint rule exists for that reason).

### D2. `attachments` table
- `attachments (id uuid pk, owner_id, item_id, name text, mime_type text, size_bytes int, width int null, height int null, status 'pending'|'ready', created_at)`.
- Same-owner composite FK to `items` with `ON DELETE CASCADE`, owner-only RLS (the existing `ownerOnlyPolicies`), index on `(item_id)`.
- `name` is the display and download name: trimmed, control characters removed, at most 200 characters. The storage path never contains the name, so names need no escaping.

### D3. Upload flow
1. The browser prepares the file (D6) and rejects it if over 5 MB.
2. Server Action `startAttachment(noteId, { name, type, size, width, height })`: checks the note is an active note of the user and the size, inserts a `pending` row, returns `{ id, path }`.
3. The editor inserts the node with that id right away, showing a local preview (object URL) and "Uploading…".
4. The browser uploads to `path` with `upsert: false` and the file's content type.
5. Server Action `finishAttachment(id)`: confirms the object exists (Storage `info`/`list` with the user client), marks the row `ready`, returns a signed link.
- On failure the node shows "Upload failed" with Retry (repeats step 4, then 5) and Remove.
- Because the row exists from step 2, autosave can save the body at any time; the node's id is already valid (D4).
- While any upload is in flight, the note counts as having unsaved work for `beforeunload`.
- Alternative: signed upload URLs issued by the server. Not needed: RLS on the user's own client gives the same protection with one less round trip.

### D4. Two nodes in the shared extension list
- `image` extended from `@tiptap/extension-image`: attributes `attachmentId` (uuid), `alt`, `width` (48–2000 px, null = natural width), `align` (`left`|`center`|`right`). `src` is never stored: renderHTML/parseHTML use `data-attachment-id`, and the NodeView gets the URL from the link cache (D5). Web page `<img src="https://…">` has no `data-attachment-id`, so pasting HTML still inserts no images.
- `fileAttachment`: atom block node with `attachmentId`, `name`, `mimeType`, `size`; rendered as a card by a React NodeView.
- Both also allow `copyOf` (uuid, D7) while a copy is in flight.
- `validate.ts` adds: every `attachmentId` is a uuid, `width`/`align` in range, and, in the save transaction, every referenced id is an attachment row of this note (one `select … where item_id = $note and id = any($ids)` query). A body that refers to any other id is rejected.
- Resize handles are drawn by the React image view (side handles, aspect ratio kept, 48 px to the column width). The Image extension's built-in `resize` option only works with its own DOM node view, which can't show the upload, failure, and copy states.

### D5. Signed links
- Links are created with `createSignedUrls` (server, user client), valid for 1 hour.
- The note page loads the body and the signed links for all `ready` attachments of the note together, so images render on first paint.
- A small client cache holds links per attachment id; it asks the Server Action `getAttachmentLinks(noteId, ids)` again when a link is older than 50 minutes or an `<img>` fails to load.
- Downloads use a link created with `download: name`, so the browser saves the file under its original name. "Open full size" uses a normal link in a new tab.
- `<img>` is used, not `next/image`: signed URLs change on each issue and would defeat its optimiser cache.

### D6. Scaling images in the browser
- Applies to PNG, JPEG, WebP. Decode with `createImageBitmap(file, { imageOrientation: "from-image" })` so phone photos keep their orientation.
- If the longer side is over 2560 px, draw to a canvas at 2560 px (`imageSmoothingQuality = "high"`). Else, if the file is over 1.5 MB, draw at the same size.
- Encode as WebP at quality 0.85. If the browser can't encode WebP (the blob comes back as PNG), use JPEG 0.85 for JPEG input and PNG for PNG/WebP input, which keeps transparency.
- Keep whichever of the original and the result is smaller. Re-encoding also drops EXIF data (such as GPS location) from processed photos; unprocessed small files keep it.
- GIF is uploaded unchanged (canvas would drop animation). HEIC and SVG are not decoded; they are file cards.
- Alternatives: `browser-image-compression` (MIT, last release 2023, loads its web worker from jsDelivr by default) and `pica` (MIT, better resampling). Not needed: a single canvas step from phone size to 2560 px is under a 2× reduction, where the browser's scaling looks fine. `pica` is the fallback if results look soft.

### D7. Insert paths and copying between notes
- Toolbar **Attach** button opens a hidden `<input type="file" multiple>`.
- `editorProps.handleDrop` and `handlePaste`: when the event carries files, attach them at the drop position or cursor, in order, and stop default handling. Otherwise normal paste rules apply.
- Copying between notes: `transformPasted` finds image and file nodes whose `attachmentId` is not an attachment of this note, moves the id to `copyOf`, and clears `attachmentId`. A Server Action `copyAttachments(noteId, ids)` checks ownership, copies the objects with Storage `copy` into this note's folder, inserts `ready` rows, and returns the new ids, which then replace `copyOf` in the document. A node left with only `copyOf` (tab closed mid-copy) shows "Couldn't copy this file" with Remove. Validation accepts `copyOf` without the note check, because it grants no access: links are issued only for `attachmentId`s of the note.

### D8. Deleting stored files
- `deleteForever` first collects the storage paths of attachments on the item and all its descendants (recursive CTE over `parent_id`, in the same user transaction), then deletes the item as now (the cascade removes the rows).
- After the transaction commits, the action calls Storage `remove(paths)` with the user client, in batches.
- If that call fails, the rows are already gone and the files become orphans; the error is logged and the Phase 6 purge job removes them. The user sees the delete succeed either way.
- Files are deleted through the Storage API, not by SQL on `storage.objects`: deleting the metadata row alone would leave the file bytes behind.

### D9. Image controls
- A bubble menu (`@tiptap/react/menus`) on a selected image: Align left / center / right, Alt text (small popover input), Open full size, Download, Remove.
- The same menu on a file card: Download, Remove.
- Controls are reachable by keyboard like the Phase 2 toolbar (roving focus).

### D10. Links open on click, edited from a link card
- Added after Phase 2 shipped: Phase 2 set `openOnClick: false` so a click placed the cursor, and opening was only in the toolbar's Link popover. Users expected a click to open the link.
- A plain left click on a link, with no text selected afterwards, opens it with `window.open(href, "_blank", "noopener,noreferrer")` (editor `handleClick`). A drag that selects text inside a link doesn't open it.
- A link card (fixed-position, below the link) shows the address with Open, Edit, and Remove. It appears while the pointer is over a link or the card, and while the cursor is inside a link (keyboard), so editing stays reachable without clicking. Edit selects the link's range and opens the existing Link popover; Remove unsets the link on that range.
- The mark range comes from `getMarkRange` at the link's position (`view.posAtDOM`).
- Alternative: Ctrl/Cmd+click to open, plain click to edit (Google Docs). Rejected by the user in favour of plain click.

## Risks / Trade-offs

- [The migration role may not be allowed to insert into `storage.buckets` or create policies on `storage.objects`] → Task 1.2 checks this on dev first. If refused, run the same SQL in the Supabase SQL editor for dev and prod and record that step in the README.
- [Orphan files after a failed remove, unused files after removing them from text, pending rows never finished] → Storage use grows until the Phase 6 purge job. At one user on the free plan's 1 GB this is acceptable for now.
- [Account deletion leaves files behind] → No account deletion exists yet. It is noted here and in the README for whoever builds it.
- [No upload percentage] → "Uploading…" with a spinner; at 5 MB an upload takes seconds on a normal connection. TUS resumable upload can add progress later without changing the specs.
- [Signed link reissue on every page load means the browser re-downloads images] → Acceptable at this scale. Longer link lifetimes would trade privacy for caching.
- [Canvas WebP encoding not available in some browsers] → Fallback to JPEG/PNG (D6); both are still scaled.

## Migration Plan

1. Generate the `attachments` table migration with Drizzle; add a custom migration for the bucket and storage policies.
2. Apply to dev, run the integration tests, deploy a preview.
3. Apply to prod before merging to `main` (as in Phase 2).
4. Rollback: revert the app commit. The table and bucket can stay; nothing else reads them.

## Open Questions

- Total size the purge job should warn at (not needed until Phase 6).
