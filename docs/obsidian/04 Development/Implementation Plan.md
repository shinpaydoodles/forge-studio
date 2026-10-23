---
type: implementation-plan
project: Forge Studio
status: active
created: 2026-10-23
tags: [forge-studio, development]
---
# Implementation Plan

1. [x] Initialize separate pnpm workspace, React UI, Node runtime, SQLite schema, and Tauri shell source.
2. [x] Implement project import/settings, manual/assisted task states, approvals, streaming, note browsing, reviewed edits, and Git status/diff.
3. [x] Add tests for persistence, task transitions, path escape, Markdown conflicts, and redaction.
4. [x] Verify Codex App Server with real read-only tasks, plan approval/rejection, and cancellation. Command/file tool approval needs a separate check.
5. [ ] Configure a separately billed Claude API key and verify SDK execution.
6. [ ] Build and launch the NSIS package on Windows, then test a clean installation.
7. [x] Create/push `forge-studio` to a verified private GitHub repository.
8. [ ] Add safe Git write operations and reviewed MCP tool invocation. Local connection management is implemented.
9. [ ] Add official Roblox Studio MCP and a vetted Blender workflow.

Each later phase requires real execution evidence. See [[04 Development/Testing and QA|Testing and QA]] and [[04 Development/Known Issues|Known Issues]].
