---
type: development-log
project: Forge Studio
status: active
created: 2026-10-23
tags: [forge-studio, development]
---
# Development Log

## 2026-10-23

- Created the Forge Studio source repository and initialized its desktop application workspace.
- Added React/Vite UI, Node runtime, SQLite tables, project and task APIs, Codex App Server and Claude Agent SDK adapters, note and Git inspection, Tauri shell source, and unit/integration tests.
- Verified the Vite UI in a browser and passed five runtime tests. Rust stable MSVC was installed for native build validation.
- Created linked project documentation in the existing Obsidian vault's `2026 PROJECTS` convention.
- A live manual Codex turn streamed in the browser UI. Human review now gates completion, and a Git snapshot is recorded at provider finish.
- In a disposable project, approved an assisted Codex plan and received `EXECUTED_OK`, rejected a second plan, stopped an active manual turn, and confirmed project/task history after UI reload. A reviewed Markdown edit was applied through the UI and verified on disk.
- Built and installed the NSIS package. Fixed packaged Node startup on paths containing spaces and verified that the native shell launches its loopback runtime.
- Created and verified `shinpaydoodles/forge-studio`, then pushed the initial `main` commit.
- Added an MIT license and refreshed the public-facing README. Planned Forge CLI connectivity is documented as a future integration.
- Added a local MCP stdio manager with server add/edit/remove, explicit connect/inspect/disconnect, discovered tool descriptions, and per-project switches. The official SDK connected to a local echo fixture; the browser UI verified connect, discovery, permission toggle, and disconnect. No MCP tools were invoked.
- Still to verify: native UI, clean-machine launch, Claude with an API key, Codex command/file tool approval, live external MCP servers, and reviewed MCP tool calls.
