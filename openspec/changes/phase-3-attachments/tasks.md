# Tasks

## 1. Storage and data

- [x] 1.1 Add the `attachments` table to the Drizzle schema per D2 (same-owner FK with cascade, owner-only RLS, `item_id` index), generate the migration, and apply it to dev; verify the table and policies exist in dev
- [x] 1.2 Add a custom migration creating the private `attachments` bucket (5 MB limit) and the SELECT/INSERT/DELETE policies on `storage.objects` per D1, and apply it to dev; verify the bucket and policies exist, or, if the migration role is refused, record the SQL-editor fallback in the README and apply it that way
- [x] 1.3 Integration tests for Storage RLS: a user can upload, read, and delete under their own folder; cannot read, list, overwrite, or delete another user's file; an upload over 5 MB is refused; verify they pass

## 2. Server operations and actions

- [x] 2.1 Implement `startAttachment` and `finishAttachment` operations and Server Actions per D3 (active-note check, size check, name clean-up, pending → ready only when the object exists); verify integration tests, including refusal for projects, folders, archived and trashed notes, and another user's note
- [x] 2.2 Implement signed links per D5 (`getAttachmentLinks`, 1-hour expiry, download links with the original name) and load them with the note body on the note page; verify integration tests: links issued only for the note's own `ready` attachments, none for another user's
- [x] 2.3 Implement `copyAttachments` per D7 (ownership check, Storage copy into the target note's folder, new `ready` rows); verify an integration test that the copy survives permanently deleting the source note
- [x] 2.4 Extend `deleteForever` per D8 (collect descendant attachment paths, delete, then remove files after commit, log failures); verify an integration test that deleting a trashed folder removes its notes' rows and stored files, and that a failed remove still reports success

## 3. Note content model

- [x] 3.1 Install `@tiptap/extension-image` and add the `image` and `fileAttachment` nodes to the shared extension list per D4 (`attachmentId`, `alt`, `width`, `align`, `copyOf`; no stored `src`); verify a unit test round-trips a document with both nodes and that pasted web HTML with `<img src>` produces no image node
- [x] 3.2 Extend body validation per D4 (uuid ids, width 48–2000, align values) and the save's check that every `attachmentId` belongs to the note; verify unit tests and an integration test that a body naming another note's attachment is rejected and stores nothing

## 4. Image scaling

- [x] 4.1 Implement `src/lib/attachments/prepare-image.ts` per D6 (2560 px cap, 1.5 MB recompress rule, WebP with JPEG/PNG fallback, keep the smaller, GIF untouched, orientation kept) plus the 5 MB check and the image-type rules (PNG/JPEG/GIF/WebP inline, everything else a card); verify unit tests for the size and type decisions and, in the browser check, a 4032 × 3024 photo stored at 2560 × 1920 and a transparent PNG still transparent

## 5. Editor UI

- [x] 5.1 Image and file-card NodeViews: link cache with refresh at 50 minutes or on load error, uploading / failed (Retry, Remove) / couldn't-copy states, file card with name, type, size; verify in the browser
- [x] 5.2 Attach button, drop, and paste handling per D7 (files at cursor or drop point, in order; web-page images still dropped), copy between notes, and uploads counted as unsaved work for `beforeunload`; verify in the browser including typing during an upload and a failed upload
- [x] 5.3 Image resize handles and the bubble menus per D9 (align, alt text, open full size, download, remove; file card download, remove) with keyboard access; verify in the browser that size, alignment, and alt text persist after reload and that Undo brings back a removed image

## 5b. Links

- [x] 5.4 Open links on a plain click in a new tab (not after a drag selection) and add the link card per D10 (address, Open, Edit, Remove; on hover and when the cursor is in a link; keyboard reachable); verify in the browser on a production build: click opens a new tab, drag-select doesn't, Edit changes the address, Remove unlinks, and the card appears from the keyboard

## 6. Verification and release

- [x] 6.1 Extend the browser check script: attach by button, drop, and paste; image inline vs SVG card; oversize refused; photo scaled; resize, align, alt text; download name; upload failure and Retry; close tab mid-upload; copy an image to another note then delete the source forever; trash and restore; delete forever removes files; verify all checks pass on a production build
- [x] 6.2 Update README (attachments, storage bucket and policies, limits, file deletion and the account-deletion note) and add attachment colors or states to the contrast test if new tokens are introduced; verify lint, unit, and integration tests pass
- [ ] 6.3 Push a branch and verify the preview; apply the attachments migrations to prod; merge to `main` and verify attaching an image and a file on production
