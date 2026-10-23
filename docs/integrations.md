# Integration notes

- **Codex:** Uses the official installed `codex app-server --stdio` protocol. Existing Codex CLI sign-in is reused. Thread IDs, stream deltas, tool items, and approval requests are handled. Model selection and reconnect after a crash need further work.
- **Claude:** Uses `@anthropic-ai/claude-agent-sdk`. Requires `ANTHROPIC_API_KEY` for a third-party app; a Claude.ai Max subscription cannot be offered as this app's SDK authentication path under current Anthropic guidance. Session resume and streaming are wired but need a live key test.
- **Obsidian:** Connect a specific local Markdown directory. Forge Studio never reads an entire vault on import. Search is deterministic and limited to 200 matching notes.
- **Git:** Uses controlled CLI arguments for read-only branch, status, and diff. Branch/commit/worktree operations are not available yet.
- **MCP:** The official TypeScript client SDK connects to user-specified local stdio servers. Add/edit/remove, connect/inspect/disconnect, and project tool switches are implemented. No MCP tool invocation or agent routing is implemented. No environment variables or credentials are configured through the UI.
- **Roblox Studio:** Roblox's built-in MCP server is the recommended official interface. A live Studio connection has not been tested.
- **Blender:** No bridge selected or connected. Use the Blender Python API only after reviewing a vetted bridge and its license.
- **VS Code:** CLI detection is displayed. Opening files from the UI is not implemented yet.
- **Forge CLI (planned):** Define a versioned local interface, make connection opt-in, map project context, and hand off tasks with visible logs and the same approval boundaries. No Forge CLI connection is implemented today.
