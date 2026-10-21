---
title: The whole active tree is loaded once per page and built in the browser
status: current
---

## In short
- Each time you move to another page, one query loads every active item, and the sidebar builds the tree in memory.

## Why (evidence)
- Loading folders only when they open was rejected: more trips to the server and harder search, for no gain at personal scale (phase-1-sidebar-tree D1).

## Gives you
- Search, sorting and expanding folders in the contents list need no extra request (phase-1-sidebar-tree D7).

## Limits you
- There is no virtual list. The design targets hundreds of items, and should be looked at again past a few thousand.
- The whole tree is downloaded on every page change. A second tab only sees changes on its next page change or reload.

## Revisit if
- A workspace reaches a few thousand items, or page changes feel slow.

## Affects
- workspace-tree: Sidebar tree, Title search, Contents view and sorting.

## History
- 2026-09-22 phase-1-sidebar-tree: D1 and the non-goals.
