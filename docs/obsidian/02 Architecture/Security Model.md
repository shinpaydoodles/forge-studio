---
type: security-model
project: Forge Studio
status: partial
created: 2026-10-23
tags: [forge-studio, security]
---
# Security Model

The runtime binds to `127.0.0.1`, requires a random bearer token, and checks browser origins. Direct project and note access uses canonical paths to reject traversal and Windows junction escapes. Markdown proposals compare the original content before an atomic rename. Agent tool approvals appear in Tasks; unknown Codex requests are declined. Secrets are excluded from Git and common token patterns are redacted from event text.

**Open risk:** Provider processes are not yet independently confined by Forge Studio's direct file guard. Codex uses its `workspaceWrite` sandbox; Claude uses SDK permissions and a host callback. A separate security review must verify cross-project and sensitive-file protection for real provider turns before using sensitive repositories.

See [[04 Development/Testing and QA|Testing and QA]] and [[05 Decisions/Decision Log|Decision Log]].
