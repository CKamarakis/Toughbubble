# Proposal

## Why

Notes hold text only. Screenshots, photos, PDFs, and other files have to live somewhere else, which breaks the "one place for my work" idea. Attachments are the last missing piece of the note editor listed in the project requirements, and Storms (Phase 4) will reuse the same file storage.

## What Changes

- **Attach files to a note**, inside the note body (Notion-style):
  - an **Attach** button in the toolbar, drag-and-drop onto the note, and pasting an image or file from the clipboard;
  - **images** (PNG, JPEG, GIF, WebP) appear inline in the text;
  - **other files** (including SVG, HEIC, PDF, anything else) appear as a file card with name, type, and size, and download when opened;
  - uploads show progress in place ("Uploading…"), and a failed upload offers Retry or Remove.
- **Adjust images in the note**: drag handles to resize (aspect ratio kept), alignment left / center / right, alt text, open the full image, download, and remove.
- **No oversized images stored**: large photos are scaled down in the browser before upload (longest side at most 2560 px, re-compressed) so only a reasonably sized copy is saved. Animated GIFs and small images are kept as they are.
- **Limits**: any file type, at most 5 MB per file (after scaling down images).
- **Privacy**: files are private to their owner and only reachable through short-lived signed links; another user can never read, list, or delete them.
- **Removing files**: removing an image or card from the text keeps the file (so Undo and Keep mine still work); the files are deleted when their note is permanently deleted. Files no longer used by any note are left for the later purge job (Phase 6).
- **Pasting**: pasting or dropping an image **file** now uploads it. Images inside pasted web page HTML are still not inserted (they point to other sites).
- **Links open on click** (added after Phase 2 went live): clicking a link opens it in a new tab. Hovering a link, or moving the cursor into it with the keyboard, shows a small card with its address and Open, Edit, and Remove, so links stay editable. Before, clicking only placed the cursor and links opened only from the toolbar's Link control, which users didn't find.
- Storms keep their placeholder; they reuse this storage in Phase 4.

## Capabilities

### New Capabilities

- `note-attachments`: adding files and images to a note body, how they are shown, image adjustments, scaling down large images before upload, size limits, privacy of stored files, and when stored files are deleted.

### Modified Capabilities

- `note-editor`: the "Pasting" requirement changes: a pasted or dropped image file is uploaded and inserted instead of being dropped. The "Links" requirement changes: a click opens the link, and a link card offers Open, Edit, and Remove.
- `workspace-data`: the "Permanent deletion removes dependent data" requirement also covers the item's attached files.

## Impact

- **Code**: new Tiptap nodes for images and file cards (in the shared extension list, so server validation knows them), upload and signed-link Server Actions and operations, a toolbar Attach button, drop and paste handlers, an image scaling helper, and a change to Delete forever so it removes stored files too.
- **Database**: a new `attachments` table (owner-only RLS, cascades with its note); a private Supabase Storage bucket `attachments` with owner-only policies, created by a migration in dev and prod.
- **Dependencies**: `@tiptap/extension-image` (MIT, includes resize handles). Image scaling uses the browser's canvas, no extra library.
- **Not in this phase**: cropping, rotating, or filters on images; image captions; attachments on Storms (Phase 4); a per-account storage quota; cleaning up unused files (Phase 6 purge job); full-text search inside files.
