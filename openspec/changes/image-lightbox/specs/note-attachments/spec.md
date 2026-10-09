# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
