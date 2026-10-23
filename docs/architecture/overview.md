# System architecture

Forge Studio has three layers: a Tauri 2 Windows shell, a React/Vite UI, and a Node TypeScript runtime. The runtime owns SQLite state, task lifecycle, local file access, provider adapters, and the loopback API. The UI consumes typed JSON responses and task events. Tauri packages and launches Node for the installed application.

The runtime stores projects, tasks, task events, approvals, settings, and documentation proposals in SQLite. Task events are sent over server-sent events and retained for later inspection. Restart recovery changes unfinished tasks to `paused`; it never replays work automatically.

Provider adapters translate Codex App Server JSON-RPC and Claude Agent SDK message streams into shared text, tool, approval, session, and outcome events. Assisted mode runs a read-only planning pass before a user decision. A completed provider turn is the current completion evidence; test and diff verification are future work.

The first release uses local Git CLI for read-only status and diff, and direct Markdown filesystem operations for Obsidian folders. The MCP manager stores local stdio server configurations and per-project tool permissions in SQLite. Connect is an explicit UI action that starts a server, performs the official SDK handshake, and lists tool metadata. The manager does not call tools or pass them to agents yet. Server descriptions and schemas are treated as untrusted display data.
