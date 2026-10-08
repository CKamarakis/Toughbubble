---
target: app shell + sidebar
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\Chris\\Documents\\Projects\\Toughbubble\\src\\components\\workspace\\workspace-shell.tsx"
target_fingerprint: "sha256:1d3850db39046c3152eb2c5341a27e267f177a7a2442138c1bd81171db750cc7"
target_path: "C:\\Users\\Chris\\Documents\\Projects\\Toughbubble\\src\\components\\workspace\\workspace-shell.tsx"
timestamp: 2026-10-08T14-47-14Z
slug: src-components-workspace-workspace-shell-tsx
---
# Re-critique: app shell + sidebar (after shell-hardening)
Method: dual-agent (A: design review, B: detector + browser), live app, test user, desktop 1440 + Pixel 7, light + dark.

## Design Health Score: 26/40 (Acceptable)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Toast doesn't name the item |
| 2 | Match System / Real World | 3 | Storm, Convert unexplained |
| 3 | User Control and Freedom | 3 | Undo works and reopens the page; panel closes properly |
| 4 | Consistency and Standards | 2 | New menu orders differ (new-item-menu.tsx:15 vs item-menu.tsx:33); two New button shapes |
| 5 | Error Prevention | 3 | Mobile + and close 28px, 4px apart |
| 6 | Recognition Rather Than Recall | 3 | Actions visible on touch; hover-only on desktop |
| 7 | Flexibility and Efficiency | 2 | No shortcuts, no tree arrow keys |
| 8 | Aesthetic and Minimalist Design | 3 | Calm; Home empty |
| 9 | Error Recovery | 3 | Thin evidence |
| 10 | Help and Documentation | 1 | Nothing explains Project vs Folder or Storm |

Previous run's P1s (touch actions, undo, drawer) and P2s (current marker, light controls, 11-option menu) resolved. Same total, different reviewer, stricter on 4 and 10.

## Design Specificity Verdict
Brand on a generic shadcn layout; accent discipline holds. CLI: 1 advisory (button.tsx:25 text-[0.8rem]). Overlay: text-overflow (test email, FP), layout-transition (sonner, likely FP), overused-font (FP), flat-type-hierarchy (project page main, out of scope). All text AA. Dark-mode magenta mark 2.19:1 vs current row (3 other cues exist). Found and fixed during this run: panel lacked aria-modal and page behind was exposed to screen readers.

## Priority Issues
1. [P1] Tree roles without arrow-key navigation; 3 tab stops per row; no skip link. Command: harden
2. [P2] Home is a dead end. Command: shape (playful-home)
3. [P2] Create flows inconsistent (two orders, two New shapes). Command: polish
4. [P2] Mobile top controls 28px, + and close 4px apart. Command: adapt
5. [P2] Archive toast generic, far from action, off-system Undo style. Command: clarify

## Persona Red Flags
- Maria: Project/Folder/Storm unexplained; Home doesn't resume; hover-only actions on desktop.
- Sam: no tree arrow keys, no skip link; long-pressed row not highlighted while menu open.
- Casey: 28px top targets; no create on item pages without panel.
- Alex: no shortcuts, no multi-select, 3-step keyboard reorder.

## Minor Observations
- Dark muted text close to body text.
- Move to Trash red though recoverable.
- Search doesn't highlight matches.
- Noisy treeitem accessible names.

## Questions to Consider
- Cover the logo: what still says ToughBubble?
- Should Home be a place rather than a hallway?
- One "space" concept instead of Project + Folder + Convert?
- Could archiving itself be the small reward instead of a far toast?
