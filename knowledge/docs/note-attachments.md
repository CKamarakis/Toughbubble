## How it works, roughly
Files go straight from the browser into a private storage area, at most 5 MB each. Photos larger than 2560 px are scaled down in the browser first, so only one reasonably sized copy is stored. You only ever see files through links that expire after 1 hour.

## Why

- **Upload progress and failure**: you see "Uploading…" rather than a percentage because the upload method reports no progress. Resumable uploads could add one later. [[attachments-private-storage]]
- **Scaling down large images**: only one reasonably sized copy is stored, which saves space. GIFs are kept as they are because scaling would drop their animation. As a side effect, scaled photos lose hidden data such as GPS location, while small unprocessed files keep it.
- **Copying attachments between notes**: a pasted image is copied as a file of the note it lands in, so it keeps working when the original note is deleted. The cost is a second copy in storage.
- **Private files**: every file read and write is checked against the signed-in user by the database, like the rest of your data, with no secret key in the app. The 1-hour links mean images download again on each visit. Longer links would cache better but are less private. [[attachments-private-storage]] [[supabase-rls-per-owner]]
- **When stored files are deleted**: removing an image from the text keeps the file, so Undo and Keep mine still work. Files no longer used by any note stay in storage until a later clean-up job (not built yet).
- **Viewing images full screen**: before, you could only open an image in a new browser tab, which on a phone meant leaving the app. One viewer serves the whole note, so it can step through all of its images.
- **Zooming in the viewer**: the viewer has its own pinch and drag instead of the browser's page zoom, because page zoom enlarges the whole page and leaves it zoomed after the viewer closes.
