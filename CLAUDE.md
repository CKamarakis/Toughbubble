@AGENTS.md

<!-- kit:routing:start -->
## Workflow routing (kit 0.5.3)

Managed by the kit. Edit `toolkit.yaml` in the kit repo, not this block.
Use one owner per phase. Only switch to an alternative when the change is big or risky, and say so.

| Phase | Use | Owner | Alternative |
|---|---|---|---|
| capture | `/kit:capture` | kit | - |
| prd | `/kit:prd` | kit | - |
| brainstorm | `/opsx:explore` | openspec | `/opsx:new <name> --schema superspec` (superspec, trial) |
| artifacts | `/opsx:propose` | openspec | `/opsx:continue (brainstorm -> proposal -> specs -> tasks)` (superspec, trial) |
| plan | `/opsx:continue` | openspec | `/opsx:continue (plan artifact)` (superspec, trial) |
| build | `/opsx:apply` | openspec | `/opsx:apply (worktree + subagent TDD)` (superspec, trial) |
| verify | `/kit:verify` | kit | `openspec validate --strict + the change's tests` (openspec, adopted); `/opsx:verify` (superspec, trial) |
| review | `/code-review` | claude-code-builtins | - |
| ui-polish | `/impeccable critique, /impeccable audit, /impeccable polish` | impeccable | `/review-animations, /improve-animations (motion only)` (emil-skills, trial) |
| close | `/opsx:archive` | openspec | `/opsx:archive` (superspec, trial) |
| kit-issues | `/kit:feedback` | kit | - |

**Skip:**
- Don't use openspec validate as the whole verify step (openspec)
- Don't use superspec as the project default schema (superspec)
- Don't use `superpowers:brainstorming` (superpowers)
- Don't use `superpowers:writing-plans` (superpowers)
- Don't use `superpowers:executing-plans` (superpowers)
- Don't use `emil-design-eng` (emil-skills)

### Knowledge and PRDs

- Notes, PRDs and assets live in `knowledge/` (`notes/`, `prds/`, `assets/`). Never read `knowledge/archive/`. Capture with `/kit:capture`, write PRDs with `/kit:prd`.
- `/opsx:propose`: if a PRD in `knowledge/prds/` has `status: Ready` and no `change`, use it as the main input. If there are several, ask which one, listing them most recently updated first (by `git log -1 --format=%cI -- <file>`, or the file's date if it has uncommitted changes). Add this line to the proposal: `PRD: knowledge/prds/<slug>.md @ <commit>`, where the commit is `git log -1 --format=%h -- <file>`, or `uncommitted` if the file has uncommitted changes.
- After the proposal exists, offer to set the PRD's `change` to the change name and its status to `Building`. Change nothing in the PRD without a yes.

### Library docs

- Before writing code against a library API you are not sure of for the version in this project (check `package.json`), look up current docs: `npx -y ctx7@latest library <name> "<question>"`, then `npx -y ctx7@latest docs <library-id> "<question>"`. No install or sign-in is needed.
- After a build, type or test error that comes from a library (for example "is not exported", "has no exported member"), look up the docs before trying another fix.
- If context7 reports a rate limit, tell the user and continue without it; a free sign-in raises the limit.

### Quality gates

- At `/opsx:propose`, run `/kit:judge` on the PRD or description and show its OpenSpec / SuperSpec recommendation with the reasons. The user decides; never switch flows on your own.
- Before `/opsx:archive`, run `/kit:verify`. A kit hook blocks the archive until the change has a passing verify report. Failing tests and high-severity security findings block; everything else is advice for the user.
- Override a blocking item only when the user explicitly asks, with their reason (`/kit:verify` records it).
<!-- kit:routing:end -->
