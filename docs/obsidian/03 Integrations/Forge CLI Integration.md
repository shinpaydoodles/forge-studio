---
type: integration
project: Forge Studio
status: planned
created: 2026-10-23
tags: [forge-studio, integration, forge-cli]
---
# Forge CLI Integration

Forge Studio does not currently connect to Forge CLI. The planned integration should let a user move a development task between the desktop workspace and a command-line workflow while preserving project context, progress, and approval decisions.

## Proposed sequence

1. Define and version a local Forge CLI interface. Prefer a documented CLI command or local protocol over reading private CLI state files.
2. Add an opt-in connection with executable discovery, version and capability checks, and a clear disconnected state.
3. Map a Forge Studio project to its Forge CLI project identity using explicit user selection and canonical paths.
4. Hand off tasks with structured requests, streamed events, cancellation, and recoverable session identifiers.
5. Apply the same per-project access rules and human approval gates to actions initiated through either interface.
6. Test a real task end to end before marking the integration available.

See [[01 Product/Roadmap|Roadmap]] and [[05 Decisions/Decision Log|Decision Log]].
