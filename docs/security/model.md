# Security model

## Implemented controls

- Runtime listens only on `127.0.0.1` and requires a random bearer token on every API request.
- Browser origins are restricted to the Tauri window and local development UI.
- Imported directories and note paths are canonicalized; traversal and Windows junction escapes are rejected for direct file access.
- Documentation edits compare the expected prior content and write through a temporary file before rename.
- Provider secrets are read from provider authentication or environment, not stored in SQLite. Common token patterns are redacted from event text.
- Agent tool approvals are shown in the UI and stored; unknown Codex server requests are declined.
- Interruption never silently reruns work after restart.

## Limits

The Codex and Claude processes have their own filesystem and tool policies. Forge Studio's direct file guard does not independently sandbox every operation a provider process may choose to run. The current Codex adapter uses `workspaceWrite`; Claude uses the SDK's default permission mode and a host approval callback. Windows sandbox and cross-project escape tests for provider processes are still required before using Forge Studio on sensitive projects. The development browser token is available in Vite's process environment; use the native build for normal local use.
