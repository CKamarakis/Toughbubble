# Spec Delta

## Purpose

Lets a user add images and other files to the body of a note, adjust how images are shown, and keep those files private, without storing needlessly large images.

## ADDED Requirements

### Requirement: Adding files to a note
A user SHALL be able to add one or more files to the body of an open note by choosing them with an Attach button in the toolbar, by dropping them onto the note body, or by pasting them from the clipboard. Each file SHALL be inserted at the cursor (or at the drop position), in the order chosen.

#### Scenario: Attach with the toolbar
- **WHEN** a user clicks Attach and chooses a PDF
- **THEN** a file card for the PDF appears at the cursor

#### Scenario: Drop several files
- **WHEN** a user drops a PNG and a ZIP file onto the note body
- **THEN** the image and then a file card for the ZIP appear where they were dropped

#### Scenario: Paste a screenshot
- **WHEN** a user pastes a screenshot copied to the clipboard
- **THEN** the screenshot appears as an image at the cursor

### Requirement: How attachments are shown
PNG, JPEG, GIF, and WebP files SHALL be shown as images in the text. All other files, including SVG images, SHALL be shown as a file card with the file's name, type, and size. Opening a file card SHALL download the file under its original name.

#### Scenario: Image shown inline
- **WHEN** a user attaches a JPEG photo
- **THEN** the photo is shown inline in the note

#### Scenario: SVG shown as a card
- **WHEN** a user attaches an SVG file
- **THEN** it is shown as a file card, not as an image

#### Scenario: Download a file
- **WHEN** a user opens the file card for "report.pdf"
- **THEN** the browser downloads a file named "report.pdf"

### Requirement: Upload progress and failure
While a file uploads, its place in the note SHALL show that it is uploading, and the user SHALL be able to keep typing. A failed upload SHALL show a message with Retry and Remove. Closing the tab while an upload is in progress SHALL ask for confirmation first, as for unsaved text.

#### Scenario: Keep typing during an upload
- **WHEN** a user attaches a large file and keeps typing below it
- **THEN** the typing is saved as usual and the file shows "Uploading…" until it finishes

#### Scenario: Upload fails
- **WHEN** the connection drops during an upload
- **THEN** the file shows "Upload failed" with Retry and Remove

#### Scenario: Close the tab mid-upload
- **WHEN** a user closes the tab while a file is still uploading
- **THEN** the browser asks before closing

### Requirement: File size limit
A file SHALL be at most 5 MB, measured after any scaling down of images. A larger file SHALL NOT be uploaded, and the user SHALL see which file was too large and the limit.

#### Scenario: File too large
- **WHEN** a user attaches a 12 MB video
- **THEN** it is not uploaded and a message says the video is larger than 5 MB

#### Scenario: Large photo scaled below the limit
- **WHEN** a user attaches a 12 MB photo that is under 5 MB after scaling down
- **THEN** the scaled photo is uploaded and shown

### Requirement: Scaling down large images
Before upload, a PNG, JPEG, or WebP image whose longer side exceeds 2560 px SHALL be scaled down so its longer side is 2560 px, keeping its aspect ratio and orientation, and re-compressed. An image of 2560 px or less whose file is larger than 1.5 MB SHALL be re-compressed at its size. The smaller of the original and the processed file SHALL be stored, and only that one copy. GIF images SHALL be stored unchanged. Transparency SHALL be preserved.

#### Scenario: Phone photo scaled down
- **WHEN** a user attaches a 4032 × 3024 JPEG photo
- **THEN** the stored image is 2560 × 1920 and the original size is not stored

#### Scenario: Small image unchanged
- **WHEN** a user attaches a 800 × 600 PNG of 200 KB
- **THEN** the stored image is the original file

#### Scenario: Animated GIF kept
- **WHEN** a user attaches an animated GIF
- **THEN** the stored GIF is the original file and still animates

#### Scenario: Transparent PNG
- **WHEN** a user attaches a 3000 px wide PNG with a transparent background
- **THEN** the stored image is 2560 px wide and its background is still transparent

### Requirement: Adjusting images
A user SHALL be able to resize an image in the note by dragging its handles, keeping its aspect ratio, between 48 px wide and the width of the text column. A user SHALL be able to align an image left, center, or right, set its alt text, open it at full size in a new tab, download it, and remove it from the note. Size, alignment, and alt text SHALL be saved with the note.

#### Scenario: Resize an image
- **WHEN** a user drags an image's corner handle to make it 300 px wide and reloads the note
- **THEN** the image is 300 px wide with its aspect ratio kept

#### Scenario: Center an image
- **WHEN** a user selects an image and chooses Center
- **THEN** the image is centered in the text column

#### Scenario: Alt text
- **WHEN** a user sets an image's alt text to "Sales chart"
- **THEN** screen readers announce the image as "Sales chart"

### Requirement: Copying attachments between notes
When a user copies an image or file card from one note and pastes it into another note, the pasted attachment SHALL belong to the note it was pasted into, so it keeps working if the original note is permanently deleted.

#### Scenario: Original note deleted
- **WHEN** a user pastes an image copied from note A into note B, and then permanently deletes note A
- **THEN** the image still shows in note B

### Requirement: Private files
Attached files SHALL be readable only by their owner. A file SHALL be reachable only through a link that expires within 1 hour of being issued. No user SHALL be able to read, list, replace, or delete another user's files, and a note's body SHALL only refer to files attached to that note.

#### Scenario: Another user's file
- **WHEN** a signed-in user requests a link for a file attached to another user's note
- **THEN** the request is refused and no link is issued

#### Scenario: Expired link
- **WHEN** someone opens a file link more than 1 hour after it was issued
- **THEN** the file is not returned

#### Scenario: Body refers to a file from another note
- **WHEN** a save names a file that belongs to a different note
- **THEN** the save is rejected and nothing is stored

### Requirement: When stored files are deleted
Removing an image or file card from a note's text SHALL NOT delete the stored file, so Undo can bring it back. Archiving or trashing a note SHALL keep its files, and restoring the note SHALL show them again. Permanently deleting a note, or a folder or project containing it, SHALL delete its stored files.

#### Scenario: Undo a removed image
- **WHEN** a user deletes an image from the text and then presses Undo
- **THEN** the image shows again

#### Scenario: Restore from Trash
- **WHEN** a note with images is moved to Trash and then restored
- **THEN** its images show again

#### Scenario: Delete forever
- **WHEN** a trashed folder containing a note with two attached files is deleted forever
- **THEN** both stored files no longer exist
