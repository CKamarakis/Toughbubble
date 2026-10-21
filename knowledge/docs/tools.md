# Tools inventory

## App framework

### Next.js
- packages: next
- for: the web app framework (routing, server rendering, server actions, the auth proxy)
- used by: app-branding, app-theme, archive-trash, editor-settings, note-attachments, note-editor, note-tables, storm-board, storm-saving, user-auth, workspace-data, workspace-tree
- added by: phase-0-foundation
- dev: no

### React
- packages: react, react-dom
- for: the UI library that Next.js renders
- used by: app-branding, app-theme, archive-trash, editor-settings, note-attachments, note-editor, note-tables, storm-board, storm-saving, user-auth, workspace-tree
- added by: phase-0-foundation
- dev: no

## Backend and data

### Supabase
- packages: @supabase/supabase-js, @supabase/ssr
- for: sign-in and sessions (cookie-based on the server and in the proxy), plus file storage for attachments
- used by: user-auth, note-attachments
- added by: phase-0-foundation
- dev: no

### Drizzle ORM
- packages: drizzle-orm
- for: the typed database schema and queries
- used by: workspace-data, workspace-tree, archive-trash, note-editor, note-attachments, editor-settings, storm-saving
- added by: phase-0-foundation
- dev: no

### Drizzle Kit
- packages: drizzle-kit
- for: creating and running database migrations (`db:generate`, `db:migrate`)
- used by: workspace-data
- added by: phase-0-foundation
- dev: yes

### Postgres.js
- packages: postgres
- for: the Postgres driver that Drizzle connects through (the admin and RLS clients, and the drizzle config)
- used by: workspace-data
- added by: phase-0-foundation
- dev: no

### fractional-indexing
- packages: fractional-indexing
- for: sortable position keys, so items can be moved without renumbering the items around them
- used by: workspace-tree, storm-board
- added by: phase-0-foundation
- dev: no

## Rich-text editor

### Tiptap
- packages: @tiptap/react, @tiptap/starter-kit, @tiptap/pm, @tiptap/extensions, @tiptap/extension-document, @tiptap/extension-link, @tiptap/extension-list, @tiptap/extension-text-align, @tiptap/extension-text-style, @tiptap/extension-image, @tiptap/extension-table
- for: the note editor: the React bindings, the basic nodes, the ProseMirror internals, the placeholder, links, task lists, text alignment, font size, image nodes and tables
- used by: note-editor, note-attachments, note-tables
- added by: phase-2-notes-editor (react, starter-kit, pm, extensions, extension-list, extension-text-align, extension-text-style); phase-3-attachments (extension-image); editor-link-end-and-note-size (extension-document, extension-link); tables-in-notes (extension-table)
- dev: no

## UI components and styling

### shadcn/ui
- packages: shadcn
- for: the component generator (`components.json`) behind `src/components/ui/*`; `globals.css` also imports its `shadcn/tailwind.css`
- used by: app-theme, user-auth, workspace-tree, note-editor, note-attachments, storm-board
- added by: phase-0-foundation
- dev: no

### Base UI
- packages: @base-ui/react
- for: unstyled, accessible building blocks (button, dialog, dropdown menu, input, popover, tooltip) under the shadcn components
- used by: workspace-tree, note-attachments, user-auth
- added by: phase-0-foundation
- dev: no

### cn
- packages: cn
- for: merging Tailwind class names (shadcn's drop-in replacement for clsx + tailwind-merge); `src/lib/utils.ts` re-exports it
- used by: workspace-tree, storm-board, user-auth (imported in `src/components/ui/*` and in two storms components, so it is in use)
- added by: phase-0-foundation
- dev: no

### class-variance-authority
- packages: class-variance-authority
- for: the button style variants (size and look)
- used by: workspace-tree, user-auth (only in `src/components/ui/button.tsx`, which is used across the app)
- added by: phase-0-foundation
- dev: no

### Tailwind CSS
- packages: tailwindcss, @tailwindcss/postcss
- for: styling with utility classes and theme tokens, built through PostCSS
- used by: app-theme (styling for the whole app, through `src/app/globals.css`)
- added by: phase-0-foundation
- dev: yes

### tw-animate-css
- packages: tw-animate-css
- for: the animation classes the shadcn components use
- used by: app-theme
- added by: phase-0-foundation
- dev: no

### Lucide
- packages: lucide-react
- for: the icon set
- used by: app-theme, user-auth, workspace-tree, archive-trash, editor-settings, note-editor, note-attachments, note-tables, storm-board
- added by: phase-0-foundation
- dev: no

### next-themes
- packages: next-themes
- for: switching between light, dark and system themes without a flash when the page loads
- used by: app-theme
- added by: phase-0-foundation
- dev: no

### Sonner
- packages: sonner
- for: toast messages (save errors, results of restore and other actions)
- used by: workspace-tree, archive-trash, editor-settings, note-attachments, storm-saving
- added by: phase-1-sidebar-tree
- dev: no

### dnd-kit
- packages: @dnd-kit/core, @dnd-kit/utilities
- for: drag and drop in the sidebar tree
- used by: workspace-tree (@dnd-kit/core only, in `tree-dnd.tsx`; nothing in `src/` imports @dnd-kit/utilities, so it looks unused)
- added by: phase-1-sidebar-tree
- dev: no

## Build assets

### sharp
- packages: sharp
- for: generating the app icons and logo images from the source logo (`npm run brand:generate`)
- used by: app-branding
- added by: add-app-logo
- dev: yes

## Testing

### Vitest
- packages: vitest
- for: running the tests (the unit and integration projects)
- used by: (tooling)
- added by: phase-0-foundation
- dev: yes

### happy-dom
- packages: happy-dom
- for: a simulated browser DOM for component tests (set in each test file)
- used by: (tooling); tests for note-tables, note-attachments, storm-board, storm-saving
- added by: phase-3-attachments
- dev: yes

### fake-indexeddb
- packages: fake-indexeddb
- for: an in-memory IndexedDB for testing the saved undo history
- used by: (tooling); tests for storm-saving
- added by: storms-canvas
- dev: yes

### Playwright
- packages: playwright
- for: driving a real browser for the storms speed check (`npm run bench:storms` loads a board with 1,000 stickies and measures fps and frame time)
- used by: (tooling); the speed check for storm-board
- added by: storms-canvas
- dev: yes

## Language and lint

### TypeScript
- packages: typescript, @types/node, @types/react, @types/react-dom
- for: type checking, plus the type definitions for Node and React
- used by: (tooling)
- added by: phase-0-foundation
- dev: yes

### ESLint
- packages: eslint, eslint-config-next
- for: linting with the Next.js rules, plus a project rule that keeps app code from importing the admin and RLS database clients
- used by: (tooling)
- added by: phase-0-foundation
- dev: yes
