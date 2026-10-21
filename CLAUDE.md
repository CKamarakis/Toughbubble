@AGENTS.md

<!-- kit:routing:start -->
## Workflow routing (kit 0.21.1)

Managed by the kit: edits inside this block are replaced when `/kit:start` re-syncs.
Use one owner per phase. Only switch to an alternative when the change is big or risky, and say so.

| Phase | Use | Alternative |
|---|---|---|
| capture | `/kit:capture` | - |
| prd | `/kit:prd` | - |
| brainstorm | `/opsx:explore` | - |
| artifacts | `/opsx:propose` | - |
| plan | `/opsx:continue` | - |
| ready | `/kit:ready` | - |
| build | `/opsx:apply` | - |
| verify | `/kit:verify` | `openspec validate --strict + the change's tests` (openspec, adopted) |
| review | `/code-review` | - |
| ui-polish | `/impeccable critique, /impeccable audit, /impeccable polish` | `/review-animations, /improve-animations (motion only)` (emil-skills, trial) |
| close | `/opsx:archive` | - |
| docs | `/kit:docs` | - |
| roadmap | `/kit:roadmap` | - |
| status | `/kit:status` | - |
| loose-ends | `/kit:loose-ends` | - |
| assess | `/kit:harness-review` | - |
| kit-issues | `github.com/CKamarakis/ac-workbench/issues` | - |

**Skip:**
- Don't use openspec validate as the whole verify step (openspec)
- Don't use `superpowers:brainstorming` (superpowers)
- Don't use `superpowers:writing-plans` (superpowers)
- Don't use `superpowers:executing-plans` (superpowers)
- Don't use `emil-design-eng` (emil-skills)

### Knowledge and PRDs

- Notes, PRDs and assets live in `knowledge/` (`notes/`, `prds/`, `assets/`). Never read `knowledge/archive/`. Capture with `/kit:capture`, write PRDs with `/kit:prd`.
- `/opsx:propose`: take one PRD from `knowledge/prds/` as the main input: the one the user names, else the most recently updated one with no `change` (say which, and name the others so the user can switch). If none fits what the user asked, ask. A PRD that isn't `Ready` gets a one-line note, never a stop. Add this line to the proposal: `PRD: knowledge/prds/<slug>.md @ <commit>`, where the commit is `git log -1 --format=%h -- <file>`, or `uncommitted` if the file has uncommitted changes.
- After the proposal exists, offer to set the PRD's `change` to the change name and its status to `Building`. Change nothing in the PRD without a yes.
- Explore: a flow starts at `/opsx:explore` (capture only saves ideas). Notes are input an explore reads, never a step of their own. At the end of an explore that decided something or raised a question, save or update its explore record (`knowledge/explore/<slug>.md`) with `/kit:explore-record` by default, without asking, and show what was written; the user can drop it. `/kit:next` and `/kit:prd` read these records.
- Loose ends: during a step (`/opsx:apply`, `/kit:verify`, `/opsx:archive`, or a long chat), collect what you put aside (a check that belongs elsewhere, friction you worked around, debt, a review finding the user kept, cleanup, an idea out of scope). At the end of the step, offer them once as one numbered list through `/kit:loose-ends` (`knowledge/loose-ends.md`); offer "seen again" for one that is already open. Point anything that belongs to a change's decisions, a PRD or the roadmap to that owner instead. Ask nothing when nothing was put aside.

### Library docs

- Before writing code against a library API you are not sure of for the version in this project (check `package.json`), look up current docs: `npx -y ctx7@latest library <name> "<question>"`, then `npx -y ctx7@latest docs <library-id> "<question>"`. No install or sign-in is needed.
- After a build, type or test error that comes from a library (for example "is not exported", "has no exported member"), look up the docs before trying another fix.
- If context7 reports a rate limit, tell the user and continue without it; a free sign-in raises the limit.

### Quality gates

- Spec scenarios: when the PRD has Given/When/Then stories, write the scenarios from them; add a `- **GIVEN**` line whenever a behavior depends on a starting state.
- After planning is complete and before `/opsx:apply`, offer `/kit:ready`: it lists gaps, differences, points to confirm and new tools, and asks the decisions in one batch. It warns and never blocks.
- At `/opsx:apply`, follow the `## Safeguards` section of the change's `design.md`. Worktree chosen: create it from the current branch (`git worktree add .claude/worktrees/<change> -b wt/<change>`), enter it with `EnterWorktree`, give the user its full path, run scripts and CLIs there with literal paths (the isolation refuses commands built from variables), and after `/kit:verify` offer a fast-forward merge back into the branch, on a yes. Subagents chosen: build with Superpowers `subagent-driven-development`, `tasks.md` as the plan. No Safeguards section: build in the current branch, with no worktree and no subagents.
- Before `/opsx:archive`, run `/kit:verify`. A kit hook blocks the archive until the change has a passing verify report. Failing tests and high-severity security findings block; everything else is advice for the user.
- Override a blocking item only when the user explicitly asks, with their reason (`/kit:verify` records it).
<!-- kit:routing:end -->
