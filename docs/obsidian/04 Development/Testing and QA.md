---
type: qa-plan
project: Forge Studio
status: active
created: 2026-10-23
tags: [forge-studio, testing]
---
# Testing and QA

`pnpm check` passed TypeScript checks and five runtime tests on 2026-10-23: SQLite reopening, task-state transitions, traversal/junction escape rejection, Markdown optimistic edits, and token redaction. `pnpm lint` and the desktop UI build passed. Browser inspection confirmed navigation, project notes, live Codex streaming, a Git snapshot, and acceptance after human review. The NSIS installer built and installed; the native shell started its bundled Node runtime on loopback.

## Remaining acceptance checks

- [ ] Create and reopen a project in a packaged app.
- [x] Stream a real Codex turn and review its result.
- [ ] Test a requested Codex tool approval and Stop.
- [ ] Stream a real Claude turn with an API key; test denial and cancellation.
- [ ] Apply a reviewed Markdown change in a disposable test vault through the UI.
- [x] Verify NSIS installer launches the native shell and bundled runtime.
- [ ] Verify native UI interaction and clean shutdown on a clean machine.
- [x] Check tracked paths, secret patterns, ignored databases, and generated bundles before the private push.

Do not run destructive tests against the real Obsidian vault or an existing Roblox place.
