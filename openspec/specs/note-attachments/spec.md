# note-attachments Specification

## Purpose
Lets a user add images and other files to the body of a note, adjust how images are shown, and keep those files private, without storing needlessly large images.

## Requirements

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
A user SHALL be able to resize an image in the note by dragging its handles, keeping its aspect ratio, between 48 px wide and the width of the text column. On touch screens the handles SHALL be easy to grab (at least 44px wide targets) and dragging one SHALL resize the image without scrolling the page. Selecting an image or file card on a touch screen SHALL NOT open the on-screen keyboard. A user SHALL be able to align an image left, center, or right, set its alt text, view it full screen, download it, and remove it from the note. Size, alignment, and alt text SHALL be saved with the note.

#### Scenario: Resize an image
- **WHEN** a user drags an image's corner handle to make it 300 px wide and reloads the note
- **THEN** the image is 300 px wide with its aspect ratio kept

#### Scenario: Resize with a finger
- **WHEN** a user on a phone selects an image and drags its right handle 140 px to the left
- **THEN** the image gets narrower and the page does not scroll

#### Scenario: No keyboard when selecting an image
- **WHEN** a user on a phone taps an image in a note
- **THEN** the image is selected and the on-screen keyboard does not open

#### Scenario: Center an image
- **WHEN** a user selects an image and chooses Center
- **THEN** the image is centered in the text column

#### Scenario: Alt text
- **WHEN** a user sets an image's alt text to "Sales chart"
- **THEN** screen readers announce the image as "Sales chart"

#### Scenario: Full size from the image menu
- **WHEN** a user selects an image and chooses "Open full size" in its menu
- **THEN** the image opens full screen in the app, not in a new browser tab

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

### Requirement: Viewing images full screen
A user SHALL be able to view an uploaded image of a note full screen, over the note, on a backdrop that is light in the light theme and dark in the dark theme. The image SHALL be shown whole, fitted to the screen, with its alt text as a caption when it has one, a Download button, and a close button. The viewer SHALL be announced as a dialog, keep keyboard focus inside it while open, and return focus to where it was when closed. It SHALL close with the close button, with Escape, and by clicking or tapping the backdrop outside the image. Images still uploading or failed SHALL NOT open in the viewer.

A user SHALL be able to open the viewer:
- with a button in the image's corner, shown while the pointer is over the image or the image has focus, and always shown on touch screens, at least 44px on touch screens;
- by double-clicking or double-tapping the image; a single click or tap SHALL still select the image for editing;
- from the image menu's "Open full size".

#### Scenario: Open with the corner button
- **WHEN** a user hovers over an image in a note and clicks its expand button
- **THEN** the image is shown full screen with a close button and Download

#### Scenario: Single tap still selects
- **WHEN** a user on a phone taps an image once
- **THEN** the image is selected with its menu and the viewer does not open

#### Scenario: Double-tap opens
- **WHEN** a user on a phone taps an image twice quickly
- **THEN** the viewer opens on that image

#### Scenario: Close and return
- **WHEN** a user opens the viewer with the corner button and presses Escape
- **THEN** the viewer closes and focus is back on the corner button

#### Scenario: Backdrop closes
- **WHEN** a user clicks the dark area outside the image
- **THEN** the viewer closes

#### Scenario: Caption
- **WHEN** a user opens an image whose alt text is "Sales chart"
- **THEN** "Sales chart" is shown under the image

### Requirement: Moving between a note's images
When a note has more than one uploaded image, the viewer SHALL show which image is open out of how many (for example "2 / 5") and SHALL let the user go to the previous and next image in the order they appear in the note: with previous and next buttons, with the left and right arrow keys, and with a horizontal swipe while the image is not zoomed in. The arrow keys SHALL work wherever focus is in the viewer. The previous and next buttons SHALL sit just outside the fitted image, not at the screen edges, unless the image fills the width. Going back from the first image or forward from the last SHALL do nothing. With one image, no counter or previous and next buttons SHALL be shown.

#### Scenario: Next with the arrow key
- **WHEN** a user opens the second of five images and presses the right arrow key
- **THEN** the third image is shown and the counter reads "3 / 5"

#### Scenario: Arrow key after clicking the image
- **WHEN** a user clicks the image in the viewer twice and then presses the left arrow key
- **THEN** the previous image is shown

#### Scenario: Swipe on a phone
- **WHEN** a user swipes left on the image in the viewer
- **THEN** the next image is shown

#### Scenario: End of the list
- **WHEN** the last image is open and the user presses the right arrow key
- **THEN** the last image stays open and the next button is unavailable

#### Scenario: Single image
- **WHEN** a user opens the only image of a note
- **THEN** no counter and no previous or next buttons are shown

### Requirement: Zooming in the viewer
A click or tap on the image in the viewer SHALL switch between fitted to the screen and the image's actual size, centred on where it was clicked; an image whose actual size already fits the screen SHALL NOT zoom on click. On touch screens a user SHALL be able to pinch to zoom between fitted and four times fitted. While zoomed in, dragging SHALL move the image, without leaving its edges inside the screen. Going to another image SHALL show it fitted.

#### Scenario: Click for actual size
- **WHEN** a user opens a 2560 px wide screenshot on a 1280 px wide window and clicks it
- **THEN** it is shown at 2560 px wide, and a second click fits it to the screen again

#### Scenario: Small image does not zoom
- **WHEN** a user opens a 400 × 300 image on a large screen and clicks it
- **THEN** it stays the same size and the viewer stays open

#### Scenario: Pinch and drag on a phone
- **WHEN** a user pinches out on the image and then drags it
- **THEN** the image grows and moves with the finger, and a swipe does not change the image while zoomed in
