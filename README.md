# Toughbubble

> Status: early. The project scope is still being worked out in specs before any code is written.

This repository uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven
development: requirements are written as plain Markdown and reviewed *before* implementation
begins, so the specs — not the code — are the source of truth.

## Layout

| Path | Purpose |
| --- | --- |
| `openspec/specs/` | Current requirements, written as concrete scenarios |
| `openspec/changes/` | In-flight change proposals (proposal, design, tasks) |
| `openspec/changes/archive/` | Completed changes, organized by date |
| `openspec/config.yaml` | Project context and per-artifact rules given to AI assistants |
| `.claude/` | OpenSpec slash commands and skills for Claude Code |

## Workflow

Run these from Claude Code inside this repo:

| Command | What it does |
| --- | --- |
| `/opsx:explore` | Think through options before committing to an approach |
| `/opsx:propose <idea>` | Draft a change proposal with specs and design |
| `/opsx:apply` | Implement the tasks from an approved proposal |
| `/opsx:archive` | Move a completed change into the archive |
| `/opsx:update` | Revise an existing in-flight change |
| `/opsx:sync` | Reconcile specs with what was actually built |

The intended loop is **explore → propose → review → apply → archive**, with a human reading the
generated specs before implementation starts.

## Setup

Requires [Node.js](https://nodejs.org/) and the OpenSpec CLI:

```bash
npm install -g @fission-ai/openspec@latest
```
