---
type: decision-log
project: Forge Studio
status: active
created: 2026-10-23
tags: [forge-studio, decisions]
---
# Decision Log

| Date | Decision | Reason |
|---|---|---|
| 2026-10-23 | Require explicit project permission boundaries | Local tools and agents must not receive implicit access to imported projects |
| 2026-10-23 | Use Tauri + React + Node runtime | Native shell with TypeScript provider orchestration |
| 2026-10-23 | Use local SQLite and Markdown filesystem | Offline project state without cloud account |
| 2026-10-23 | Start with manual and assisted modes | Approval and task recovery need proof before multi-agent coordination |
| 2026-10-23 | Use Codex App Server and Claude Agent SDK | Official supported agent interfaces |
| 2026-10-23 | Require Anthropic API key for Claude | Current SDK guidance excludes third-party claude.ai login without approval |
| 2026-10-23 | Keep Git operations read-only initially | Establish safe review before write/publish operations |
| 2026-10-23 | Plan an optional Forge CLI connection | Share project context and task handoffs only through a versioned local interface with visible approvals |
| 2026-10-23 | License Forge Studio source under MIT | Allow reuse while preserving copyright and license notices; third-party components retain their own terms |
