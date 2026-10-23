---
type: qa-plan
project: Forge Studio
status: active
created: 2026-10-23
tags: [forge-studio, testing]
---
# Testing and QA

`pnpm check` passed TypeScript checks and five runtime tests on 2026-10-23: SQLite reopening, task-state transitions, traversal/junction escape rejection, Markdown optimistic edits, and token redaction. `pnpm lint` and the desktop UI build passed. Browser inspection confirmed navigation, project and task persistence after reload, manual and assisted Codex streaming, plan approval/rejection, Stop, a Git snapshot, and acceptance after human review. A disposable Markdown note was read, proposed, reviewed, applied, and checked on disk. The NSIS installer built and installed; the native shell started its bundled Node runtime on loopback.

## Remaining acceptance checks

- [ ] Create and reopen a project in a packaged app.
- [x] Stream real manual and assisted Codex turns and review their results.
- [x] Test assisted plan approval, rejection, and Stop.
- [ ] Test a requested Codex command/file tool approval.
- [ ] Stream a real Claude turn with an API key; test denial and cancellation.
- [x] Apply a reviewed Markdown change in a disposable test folder through the UI.
- [x] Verify NSIS installer launches the native shell and bundled runtime.
- [ ] Verify native UI interaction and clean shutdown on a clean machine.
- [x] Check tracked paths, secret patterns, ignored databases, and generated bundles before the initial push.

Do not run destructive tests against the real Obsidian vault or an existing Roblox place.
