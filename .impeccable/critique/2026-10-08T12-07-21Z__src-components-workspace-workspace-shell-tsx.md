---
target: app shell + sidebar
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\Chris\\Documents\\Projects\\Toughbubble\\src\\components\\workspace\\workspace-shell.tsx"
target_fingerprint: "sha256:4fba717f9d6aadb2f6a76d02618bf8dbd1da0c7673abc2b025a9c2f4690b231f"
target_path: "C:\\Users\\Chris\\Documents\\Projects\\Toughbubble\\src\\components\\workspace\\workspace-shell.tsx"
timestamp: 2026-10-08T12-07-21Z
slug: src-components-workspace-workspace-shell-tsx
---
# Critique: app shell + sidebar
Method: dual-agent (A: design review, B: detector + browser), live app, test user, desktop 1440 + mobile 390, light + dark.

## Design Health Score: 26/40 (Acceptable)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Current row and hovered row share the same fill (sidebar-tree.tsx:67-68); only weight differs |
| 2 | Match System / Real World | 3 | "Storm", "Convert to folder", project-inside-project unexplained |
| 3 | User Control and Freedom | 2 | No Undo on archive/trash (workspace-context.tsx:285-289); mobile drawer: no Escape, no close |
| 4 | Consistency and Standards | 3 | Two New menus in different order; role=tree without arrow keys |
| 5 | Error Prevention | 3 | Trash one click under Archive, no undo |
| 6 | Recognition Rather Than Recall | 2 | Row actions opacity-0 until hover (sidebar-tree.tsx:141); invisible on touch |
| 7 | Flexibility and Efficiency | 2 | No shortcuts, no tree keyboard nav, no quick-create |
| 8 | Aesthetic and Minimalist Design | 3 | 11-option row menu; near-empty Home |
| 9 | Error Recovery | 3 | Error toasts exist; copy untested |
| 10 | Help and Documentation | 2 | No hints for Storm, project vs folder, archive vs trash |

## Design Specificity Verdict
Mostly category-interchangeable shadcn/Notion clone; authored touches: magenta light wordmark, yellow + on black disc, coloured project icons, warm graphite dark mode. "Tactile and playful" and warm voice (DESIGN.md/PRODUCT.md) absent.
Detector: CLI 1 advisory (button.tsx:25 text-[0.8rem] off-scale). Browser overlay 2-4/page: overused-font (FP, deliberate), flat-type-hierarchy (FP, h1 wraps 24px button), layout-transition (FP, nothing animates), text-overflow (real: truncated footer email). All measured text passes AA both themes; no yellow-on-light.

## Priority Issues
1. [P1] Mobile: row actions hidden on touch, 28px rows. Fix: always show ⋯ on hover:none / <md, 40-44px rows, long-press menu. Command: adapt
2. [P1] No Undo for archive/trash; mobile drawer lacks Escape, close button, focus move, dialog semantics (workspace-shell.tsx:26-40). Fix: Undo action in toast; drawer as Sheet with focus trap. Command: harden
3. [P2] Current vs hover rows identical; light-mode --accent/--muted equal sidebar #F5F4F2 so toggle track, avatar, title hover vanish. Fix: distinct current marker (magenta bar; yellow icon in dark), warm-200/300 tracks. Command: polish
4. [P2] Row menu has 11 options (item-menu.tsx:66-119). Fix: New-inside submenu, Move up/down to submenu/shortcuts. Command: distill
5. [P2] Feel and voice missing: empty Home, functional copy, no tactile states. Fix: Home as desk (recent, continue), press/pick-up states, warmer empty states. Command: shape (home) then delight

## Persona Red Flags
- Maria (non-tech, renovation): four concepts before writing; Storm unexplained/placeholder; page ⋯ ~600px from title; Home doesn't show her work.
- Casey (mobile): invisible ⋯, 28px rows, drawer closes only via backdrop, top bar has no location.
- Sam (a11y): tree role without arrow keys, 2-3 tab stops per row, no skip link, focus not moved into drawer.
- Alex (power): no Cmd+K, no quick-new, reorder only via menu.

## Minor Observations
- All New buttons grey out during unrelated pending actions.
- "Empty" rows inside tree for empty containers.
- Date formats differ (Trash vs contents table).
- Footer email truncated; theme toggle + sign out could live in an account menu.
- Sidebar + and page + New create in different places silently.
- Sidebar aside has no label.

## Questions to Consider
- Should Home be a desk rather than a signpost?
- Do everyday users need four kinds of item on day one?
- What one signature interaction makes it tactile?
