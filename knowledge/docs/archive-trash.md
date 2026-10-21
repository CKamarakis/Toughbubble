## How it works, roughly
When you archive or trash an item, everything inside it is marked too, along with which item you acted on. Restore uses that mark to bring the same set back. The Archive and Trash views list only the items you acted on directly. Delete forever removes the item and everything under it in one step.

## Why

- **Move items to Trash**: trashing an item also takes archived items inside it. Restoring it brings them back as active, not archived. This was accepted because it keeps things simpler. [[subtree-status-markers]]
- **Restore**: restore brings back only what went away together. Items you archived or trashed on their own keep their own mark and stay where they are. [[subtree-status-markers]]
- **Undo archive and trash**: Undo restores the item after the save has finished, instead of waiting to archive until the message closes. With a wait, closing the tab too soon would silently lose your action, and two parts of the app could disagree about where the item is.
