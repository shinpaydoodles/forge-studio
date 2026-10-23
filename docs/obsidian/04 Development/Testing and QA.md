---
type: qa-plan
project: Forge Studio
status: active
created: 2026-10-23
tags: [forge-studio, testing]
---
# Testing and QA

`pnpm --filter @forge/runtime test` passed five tests on 2026-10-23: SQLite reopening, task-state transitions, traversal/junction escape rejection, Markdown optimistic edits, and token redaction. `pnpm --filter @forge/runtime build` and `pnpm --filter @forge/desktop build` passed. Browser inspection confirmed first-run navigation and onboarding layout.

## Remaining acceptance checks

- [ ] Create and reopen a project in a packaged app.
- [ ] Stream a real Codex turn; test a requested approval and Stop.
- [ ] Stream a real Claude turn with an API key; test denial and cancellation.
- [ ] Apply a reviewed Markdown change in a disposable test vault through the UI.
- [ ] Verify NSIS installer launch and clean shutdown.
- [ ] Check no secrets or local databases enter the Git commit.

Do not run destructive tests against the real Obsidian vault or an existing Roblox place.
