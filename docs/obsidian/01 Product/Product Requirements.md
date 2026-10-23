---
type: requirements
project: Forge Studio
status: active
created: 2026-10-23
tags: [forge-studio, product]
---
# Product Requirements

Forge Studio should let one person select a local project, send a development task to Codex or Claude, see execution and approvals, inspect Git changes, and consult project-specific Markdown documentation without switching applications repeatedly.

## MVP acceptance

- [x] Import an existing directory without changing its contents.
- [x] Persist projects, tasks, events, approvals, and settings in SQLite.
- [x] Provide manual and plan-first task modes with cancellation.
- [x] Browse and search project Markdown notes and review edits before application.
- [x] Show Git branch, status, and diff.
- [ ] Verify real Codex and Claude turns, including approval requests and cancellation.
- [ ] Launch and package a working Tauri desktop installer.
- [x] Create and verify a private GitHub repository, with `main` pushed.

Future scope includes structured multi-agent workflows, official Roblox Studio MCP, Blender assets, and richer VS Code coordination. See [[01 Product/Features and Scope|Features and Scope]] and [[01 Product/Roadmap|Roadmap]].
