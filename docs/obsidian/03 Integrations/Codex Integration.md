---
type: integration
project: Forge Studio
status: implemented-partially-verified
created: 2026-10-23
tags: [forge-studio, codex]
---
# Codex Integration

Forge Studio launches the installed `codex app-server --stdio`, initializes its JSON-RPC session, starts or resumes a thread, and streams agent message deltas and tool items. Command and file-change approval requests are stored and routed to the task UI. Unknown server requests are declined. Cancellation requests `turn/interrupt` and stops the child process.

The local Codex CLI is installed and `codex login status` reported ChatGPT sign-in. A real manual turn streamed `FORGE_UI_READY` through the Forge Studio browser UI, produced a Git snapshot, and remained awaiting review until accepted. No browser tokens are scraped. Tool approval, cancellation, assisted resume, model selection, reconnect, and richer error presentation need further live checks. [[04 Development/Testing and QA|QA]] tracks them.
