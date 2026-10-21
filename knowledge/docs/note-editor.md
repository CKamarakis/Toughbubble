## How it works, roughly
A note's body is stored as one structured document (Tiptap JSON) and saved about a second after you stop typing. Every save is checked on the server against the same list of allowed blocks and styles the editor uses. A note body can be at most about 800 KB.

## Why

- **Note body editor**: the body is saved in the editor's own format and checked against the editor's own rules, so it reopens exactly as written and can't hold anything the editor can't show. [[tiptap-editor]]
- **Font size**: sizing the whole note sets a size for the note, because people expect the Google Docs behaviour, where new lines take the new size too. The size is saved inside the note, so it is versioned and undone like everything else and other notes aren't affected. Headings keep their Settings sizes.
- **Links**: a plain click opens a link because people didn't find the Open button in the toolbar. You chose a plain click over Ctrl/Cmd+click. Text typed after a link stays plain, since the editor's automatic link detection used to stretch the link over it. Only web and email addresses are allowed, so a crafted request can't save an unsafe link.
- **Pasting**: images inside pasted web page content are left out because they point to other sites. Only real image files are uploaded.
- **Autosave**: the aim is that typing never waits on the network and no edit is lost without warning. One trade-off was accepted: a crash or reload in the second before a save can lose that second of typing. [[versioned-autosave]]
- **Edits from another tab or device**: edits from two places are caught and you choose which version to keep. Nothing is merged, because live merging would need real-time collaboration, which isn't built. The quiet refresh when you return to a tab keeps these conflicts rare. [[versioned-autosave]]
