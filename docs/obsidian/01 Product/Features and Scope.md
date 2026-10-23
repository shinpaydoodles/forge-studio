---
type: feature-scope
project: Forge Studio
status: active
created: 2026-10-23
tags: [forge-studio, product]
---
# Features and Scope

| Capability | Current implementation | Scope boundary |
|---|---|---|
| Projects | Import by absolute path, edit name/docs/provider | No automatic dependency installs |
| Tasks | Manual and assisted flows, streamed events, plan approval/rejection, Stop, human outcome review | Command/file tool approval needs a live check; no bounded multi-agent delegation yet |
| Codex | App Server adapter; live manual and assisted UI turns verified | Model selection, command/file approval, and reconnect need live checks |
| Claude | Agent SDK adapter | Requires separately billed API key; live verification pending |
| Knowledge | Local Markdown list/search/read and reviewed edit; disposable UI edit passed | No semantic index or automatic sync |
| Git | Status and unstaged diff | No branch, stage, commit, push UI |
| MCP/Roblox/Blender | Status shown as unconfigured | Connections and operations are not implemented |

The interface must show disconnected integrations honestly and preserve project boundaries. [[02 Architecture/Security Model|Security Model]] records current controls and gaps.
