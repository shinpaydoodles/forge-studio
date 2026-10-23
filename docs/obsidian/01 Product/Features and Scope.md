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
| Tasks | Manual and assisted flows, streamed events, approvals, stop, human outcome review | Assisted resume and tool approval need live checks; no bounded multi-agent delegation yet |
| Codex | App Server adapter; live manual UI turn verified | Model selection, approval, cancellation, and reconnect need live checks |
| Claude | Agent SDK adapter | Requires separately billed API key; live verification pending |
| Knowledge | Local Markdown list/search/read and reviewed edit | No semantic index or automatic sync |
| Git | Status and unstaged diff | No branch, stage, commit, push UI |
| MCP/Roblox/Blender | Status shown as unconfigured | Connections and operations are not implemented |

The interface must show disconnected integrations honestly and preserve project boundaries. [[02 Architecture/Security Model|Security Model]] records current controls and gaps.
