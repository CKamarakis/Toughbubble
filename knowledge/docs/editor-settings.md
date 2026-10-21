## How it works, roughly
Settings save on their own about half a second after your last change. Sizes go from 8 to 96 px. The app keeps up to 20 saved colors and drops the oldest when you add more.

## Why

- **Element font size**: a change restyles every note at once, including old ones, without changing what is stored in them. A word with its own size keeps it. [[editor-styles-css-variables]]
- **Element color**: each theme has its own color, because a color that reads well in dark mode, such as yellow, is hard to read in light mode. Colors set before this change apply to both themes. They are converted as they are read, so nothing had to change in the database, and a tab still running the old version can keep saving during an update. [[editor-styles-css-variables]]
- **Color picker**: when you set a color for one theme, the warning checks only that theme's background, so picking yellow for Dark doesn't warn about Light. The picker was built to be reused later on boards.
- **Saved colors**: saved colors are one list shared by every color picker. Removing one only edits the list. Anything already using that color keeps it.
- **Settings saved to the account**: settings are saved to your account, not the browser, so they are the same on every device. Changing a size by typing shows one message per element, not a stack of them.
