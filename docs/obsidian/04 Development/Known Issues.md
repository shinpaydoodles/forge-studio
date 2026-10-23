---
type: known-issues
project: Forge Studio
status: active
created: 2026-10-23
tags: [forge-studio, issues]
---
# Known Issues

| Issue | Impact | Resolution path |
|---|---|---|
| Codex tool approval, cancellation, and assisted resume unverified | Some interactive paths may fail | Run targeted live checks |
| Claude API key unavailable | Claude runtime cannot be tested | Configure Console API key; separate billing |
| Provider filesystem confinement not independently proven | Sensitive projects should wait | Sandbox/cross-project tests and policy review |
| Assisted task resumes same provider session after planning | Provider-specific behavior needs check | Live session continuation test |
| Markdown UI previews full note before/after | Large edits are hard to review | Add focused line diff |
| Git is read-only | No commit/push from app | Add reviewed Git write actions |
| MCP/Roblox/Blender not connected | Cross-app workflow unavailable | Implement MCP manager, then verified integrations |
| Native UI and clean-machine startup unverified | Distribution readiness unproven | Inspect installed UI and test a clean machine |

See [[01 Product/Roadmap|Roadmap]] for sequencing.
