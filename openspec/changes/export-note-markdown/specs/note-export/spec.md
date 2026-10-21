# Spec Delta

## Purpose

Lets a user take a single note out of the app as Markdown, with its images and attached files beside it, so it can be read by other tools such as Claude Code.

## ADDED Requirements

### Requirement: Export a note
A user SHALL be able to export a note from its actions menu. The export SHALL use the note's last saved content and SHALL NOT change, save or version the note.

#### Scenario: Export from the menu
- **GIVEN** a note in the workspace
- **WHEN** the user chooses "Export as Markdown" from the note's actions menu
- **THEN** a download of the note starts

#### Scenario: Note unchanged
- **GIVEN** a note at version 5
- **WHEN** the user exports it
- **THEN** the note is still at version 5 with the same content

### Requirement: Markdown file for a note without attachments
A note that holds no images and no attached files SHALL download as a single Markdown file named after the note's title.

#### Scenario: Plain note
- **GIVEN** a note titled "Trip plan" with text and a table but no images or files
- **WHEN** the user exports it
- **THEN** a file `Trip plan.md` downloads containing the note as Markdown

### Requirement: Zip for a note with attachments
A note that holds at least one image or attached file SHALL download as a zip named after the note's title. The zip SHALL hold the Markdown file and an `assets/` folder with every attachment, and each image and file link in the Markdown SHALL point to its file in `assets/` by a relative path.

#### Scenario: Note with an image and a PDF
- **GIVEN** a note titled "Trip plan" with one image `map.png` and one attached file `tickets.pdf`
- **WHEN** the user exports it
- **THEN** `Trip plan.zip` downloads holding `Trip plan.md`, `assets/map.png` and `assets/tickets.pdf`
- **AND** the Markdown shows the image as `![…](assets/map.png)` and links the file as `[tickets.pdf](assets/tickets.pdf)`

#### Scenario: Note with only a file
- **GIVEN** a note with one attached spreadsheet and no images
- **WHEN** the user exports it
- **THEN** a zip downloads, holding the Markdown file and the spreadsheet in `assets/`

### Requirement: Attachment file names
Attachment file names in the export SHALL be unique within `assets/`. When two attachments share a name, later ones SHALL get a numeric suffix before the extension, and their links SHALL use the suffixed name.

#### Scenario: Two images with the same name
- **GIVEN** a note with two images both named `photo.png`
- **WHEN** the user exports it
- **THEN** the zip holds `assets/photo.png` and `assets/photo-2.png`, and each image's link points to its own file

### Requirement: Export file names
The download's file name SHALL come from the note's title, with characters that file names can't hold removed. A note with an empty title SHALL be exported as "Untitled".

#### Scenario: Title with a slash
- **GIVEN** a note titled "Q3/Q4 plan"
- **WHEN** the user exports it
- **THEN** the downloaded file name contains no slash and ends in `.md` or `.zip`

#### Scenario: Empty title
- **GIVEN** a note with an empty title and no attachments
- **WHEN** the user exports it
- **THEN** a file `Untitled.md` downloads

### Requirement: Missing attachments
If an attachment can't be downloaded, the export SHALL still finish. The Markdown SHALL name the missing file where it would have appeared, and the user SHALL be told that some files are missing.

#### Scenario: One file fails
- **GIVEN** a note with two images, one of which can't be downloaded
- **WHEN** the user exports it
- **THEN** the zip downloads with the image that worked
- **AND** the Markdown has a line naming the missing image in its place
- **AND** a message says one file couldn't be included

### Requirement: Markdown content
The export SHALL write headings, paragraphs, bold, italic, strikethrough, inline code, links, bullet, numbered and task lists, quotes, code blocks and horizontal rules as standard Markdown. Font sizes, colours and text alignment SHALL be left out.

#### Scenario: Formatted text
- **GIVEN** a note with a level-2 heading, a bold word, a link and a numbered list
- **WHEN** the user exports it
- **THEN** the Markdown has `## ` before the heading, `**` around the bold word, `[text](url)` for the link and `1. ` list items

#### Scenario: Styling dropped
- **GIVEN** a note with a centred, red, 24 px paragraph
- **WHEN** the user exports it
- **THEN** the Markdown holds the paragraph's text with no size, colour or alignment markup

### Requirement: Tables in the export
A simple table SHALL be written as a Markdown table. A table that Markdown can't express without losing content (merged cells, or cells holding more than one block) SHALL be written as an HTML table instead.

#### Scenario: Simple table
- **GIVEN** a note with a 3 by 3 table with a header row and one line of text per cell
- **WHEN** the user exports it
- **THEN** the Markdown has a pipe table with a header separator row

#### Scenario: Merged cells
- **GIVEN** a note with a table where one cell spans two columns
- **WHEN** the user exports it
- **THEN** the Markdown holds an HTML `<table>` in which that cell has `colspan="2"`

### Requirement: Export progress
While an export is being prepared, the user SHALL see that it is in progress, and SHALL be told if the export fails as a whole.

#### Scenario: Preparing
- **GIVEN** a note with several large images
- **WHEN** the user exports it
- **THEN** "Preparing…" shows until the download starts

#### Scenario: Note can't be loaded
- **GIVEN** the note can't be loaded (for example the connection drops)
- **WHEN** the user exports it
- **THEN** no file downloads and a message says the export failed
