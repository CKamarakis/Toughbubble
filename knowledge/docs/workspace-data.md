## How it works, roughly
Projects, folders, notes and Storms all live in one tree of items. A note's or Storm's body is stored separately, one record per item, with a version number. The database checks every rule below itself, so they hold whichever part of the app writes the data.

## Why

- **Data ownership**: The owner is filled in by the database from the signed-in user, so app code never sets it and can't set it to someone else. [[supabase-rls-per-owner]]
- **Data isolation**: Every request runs as the signed-in user, so the database applies the isolation rules on every request. Relying on the app to filter by owner was rejected because one forgotten filter would leak data. [[supabase-rls-per-owner]]
- **Parent belongs to the same owner**: The database itself rejects a parent owned by someone else. A built-in link rule was chosen over custom code because it is declared once and can't be bypassed. [[database-enforced-integrity]]
- **Content belongs to its item's owner**: The same database rule as for parents stops content being attached to someone else's item. In one rare case the database's error could reveal that someone else's item exists, but only to someone who already knows its random id, so the risk was accepted.
- **Permanent deletion removes dependent data**: The app collects an item's attached files before deleting it, then removes them from storage. If that removal fails, the delete still succeeds and the files stay until a later clean-up job (not built yet) removes them.
- **Account deletion removes all user data**: Items and content are deleted along with the account. Account deletion doesn't exist in the app yet, and whoever builds it must also remove the user's stored files.
- **Only containers have children**: Kept in the database, not just the app, so every write path follows the same rules, as with ownership. [[database-enforced-integrity]]
- **New and moved items go under active parents**: The check runs when the change is committed, not row by row. Restore brings a whole subtree back at once, and a row-by-row check would reject a valid restore. [[database-enforced-integrity]]
- **Versioned content saves**: Two tabs or devices can edit the same note. A save based on an older version is refused and the person chooses what to keep. Merging edits live was ruled out because it would need real-time collaboration tools. The version check and the write happen in one step, so two saves can't both win. [[versioned-autosave]]
